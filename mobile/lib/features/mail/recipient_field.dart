import 'package:flutter/material.dart';

/// Gmail-style "To/Cc/Bcc" input: committed addresses render as removable
/// chips, with a free-text field alongside for typing the next one. A
/// comma, semicolon, space, or Enter commits whatever's been typed so far.
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

  List<String> get emails => List.unmodifiable(_emails);

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      if (!_focusNode.hasFocus) _commitPending();
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
        .split(RegExp(r'[,;\s]+'))
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

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
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
                  onChanged: (value) {
                    if (value.isNotEmpty &&
                        RegExp(r'[,;\s]$').hasMatch(value)) {
                      _addFromRaw(value);
                    }
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
