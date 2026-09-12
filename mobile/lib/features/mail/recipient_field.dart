import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class _Person {
  const _Person({required this.email, required this.name, required this.isTeammate});
  final String email;
  final String name;
  final bool isTeammate;
}

// Shared across every RecipientChipField on the page (To/Cc/Bcc each mount
// their own) so opening a compose screen fetches these lists once, not
// three times each - mirrors the web client's ChipInput peopleCache.
List<_Person>? _peopleCache;
Future<List<_Person>>? _peoplePromise;

Future<List<_Person>> _loadPeople(ApiClient api) {
  final cached = _peopleCache;
  if (cached != null) return Future.value(cached);
  return _peoplePromise ??= _fetchPeople(api);
}

Future<List<_Person>> _fetchPeople(ApiClient api) async {
  List<DirectoryEntry> directory = const [];
  List<MailContact> contacts = const [];
  try {
    directory = await api.directory();
  } catch (_) {
    // The dropdown just stays empty (or contacts-only) if this fails.
  }
  try {
    contacts = await api.contacts();
  } catch (_) {
    // Same here - falls back to whatever loaded.
  }
  // Every teammate mailbox first (an internal work address is almost
  // always who you meant), then personal contacts not already covered by
  // the directory, de-duplicated by email.
  final seen = <String>{};
  final merged = <_Person>[];
  for (final entry in directory) {
    seen.add(entry.address.toLowerCase());
    merged.add(_Person(email: entry.address, name: entry.displayName, isTeammate: true));
  }
  for (final contact in contacts) {
    if (seen.contains(contact.email.toLowerCase())) continue;
    seen.add(contact.email.toLowerCase());
    merged.add(_Person(email: contact.email, name: contact.displayName, isTeammate: false));
  }
  return _peopleCache = merged;
}

final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _splitRe = RegExp(r'[,;\s]+');

/// Gmail-style "To/Cc/Bcc" input: committed addresses render as removable
/// chips, with a free-text field alongside for typing the next one, and a
/// dropdown of teammates/contacts underneath - mirrors the web client's
/// ChipInput, so picking a colleague doesn't require typing their address.
/// A comma, semicolon, space, or Enter commits whatever's been typed so far.
class RecipientChipField extends StatefulWidget {
  const RecipientChipField({
    super.key,
    required this.label,
    required this.icon,
    this.initial = const [],
    this.onChanged,
    this.autofocus = false,
  });

  final String label;
  final IconData icon;
  final List<String> initial;
  final ValueChanged<List<String>>? onChanged;
  final bool autofocus;

  @override
  State<RecipientChipField> createState() => RecipientChipFieldState();
}

class RecipientChipFieldState extends State<RecipientChipField> {
  late final List<String> _emails = List.of(widget.initial);
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  List<_Person> _people = const [];
  bool _showSuggestions = false;

  List<String> get emails => List.unmodifiable(_emails);

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        setState(() => _showSuggestions = true);
      } else {
        _commitPending();
        setState(() => _showSuggestions = false);
      }
    });
    _controller.addListener(() => setState(() {}));
    _loadPeople(context.read<AppState>().api).then((people) {
      if (mounted) setState(() => _people = people);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _commitPending() {
    if (_controller.text.trim().isEmpty) return;
    _addFromRaw(_controller.text);
  }

  void _addFromRaw(String raw) {
    final pieces = raw
        .split(_splitRe)
        .map((piece) => piece.trim())
        .where((piece) => piece.isNotEmpty);
    var changed = false;
    for (final piece in pieces) {
      if (piece.contains('@') && !_emails.contains(piece)) {
        _emails.add(piece);
        changed = true;
      }
    }
    _controller.clear();
    setState(() {});
    if (changed) widget.onChanged?.call(_emails);
  }

  void _remove(String email) {
    setState(() => _emails.remove(email));
    widget.onChanged?.call(_emails);
  }

  void _pickPerson(String email) {
    setState(() {
      if (!_emails.contains(email)) _emails.add(email);
      _controller.clear();
    });
    widget.onChanged?.call(_emails);
  }

  void _onInputChanged(String value) {
    if (value.isNotEmpty && RegExp(r'[,;\s]$').hasMatch(value)) {
      _addFromRaw(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final trimmedInput = _controller.text.trim();
    final query = trimmedInput.toLowerCase();
    final available = _people.where((person) => !_emails.contains(person.email)).toList();
    // Nothing typed yet -> browse the whole directory (capped), same as
    // this field's placeholder promised: pick a teammate without typing at
    // all. One character narrows it down from there.
    final suggestions = query.isEmpty
        ? available.take(8).toList()
        : available
            .where((person) =>
                person.email.toLowerCase().contains(query) ||
                person.name.toLowerCase().contains(query))
            .take(8)
            .toList();
    // A fully-typed, valid address that isn't already one of the matches
    // above still gets its own row - otherwise the dropdown just goes
    // empty and looks like nothing registered, even though Enter/a comma
    // would accept it.
    final showAddNew = _emailRe.hasMatch(trimmedInput) &&
        !_emails.contains(trimmedInput) &&
        !suggestions.any((person) => person.email.toLowerCase() == query);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => _focusNode.requestFocus(),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: widget.label,
              prefixIcon: Icon(widget.icon),
            ),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                for (final email in _emails)
                  InputChip(
                    label: Text(email),
                    onDeleted: () => _remove(email),
                  ),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 90),
                  child: IntrinsicWidth(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      autofocus: widget.autofocus,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        isCollapsed: true,
                        hintText: _emails.isEmpty ? 'Add recipients' : null,
                      ),
                      onSubmitted: _addFromRaw,
                      onChanged: _onInputChanged,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_showSuggestions && (suggestions.isNotEmpty || showAddNew))
          Container(
            margin: const EdgeInsets.only(top: 2),
            constraints: const BoxConstraints(maxHeight: 260),
            decoration: BoxDecoration(
              color: colors.elevatedSurface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: colors.divider),
            ),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 4),
              children: [
                for (final person in suggestions)
                  ListTile(
                    dense: true,
                    title: Text(person.name.isNotEmpty ? person.name : person.email),
                    subtitle: person.name.isNotEmpty ? Text(person.email) : null,
                    trailing: person.isTeammate
                        ? Chip(
                            label: const Text('Team', style: TextStyle(fontSize: 10)),
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          )
                        : null,
                    onTap: () => _pickPerson(person.email),
                  ),
                if (showAddNew)
                  ListTile(
                    dense: true,
                    title: Text(trimmedInput),
                    trailing: Chip(
                      label: const Text('Add', style: TextStyle(fontSize: 10)),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onTap: () => _pickPerson(trimmedInput),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
