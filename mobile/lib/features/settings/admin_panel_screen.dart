import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, this.subtitle});
  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Icon(icon, size: 20, color: muted),
            ),
            const SizedBox(height: 12),
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: muted)),
            ],
          ],
        ),
      ),
    );
  }
}

/// A separate screen (not another Settings row) for the one admin mailbox
/// to control every other mailbox: switch into one without its password,
/// reset a password/name/photo directly, review pending member
/// change-requests, and see every mailbox's audit trail. Mirrors the web
/// client's AdminPanel.
class AdminPanelScreen extends StatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  State<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  int? _pendingCount;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin panel'),
          bottom: TabBar(tabs: [
            const Tab(text: 'Mailboxes'),
            Tab(
              child: Badge(
                label: Text('${_pendingCount ?? 0}'),
                isLabelVisible: (_pendingCount ?? 0) > 0,
                child: const Text('Requests'),
              ),
            ),
            const Tab(text: 'Audit log'),
          ]),
        ),
        body: TabBarView(children: [
          const _AccountsTab(),
          _RequestsTab(onPendingCountChange: (count) => setState(() => _pendingCount = count)),
          const _AuditTab(),
        ]),
      ),
    );
  }
}

class _AccountsTab extends StatefulWidget {
  const _AccountsTab();
  @override
  State<_AccountsTab> createState() => _AccountsTabState();
}

class _AccountsTabState extends State<_AccountsTab> {
  late Future<List<AdminAccountSummary>> _accounts;
  late Future<List<HostingerMailboxSummary>> _hostingerMailboxes;
  String? _provisioning;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _accounts = context.read<AppState>().api.adminAccounts();
    _hostingerMailboxes = context.read<AppState>().api.adminHostingerMailboxes();
  }

  Future<void> _provision(String address) async {
    setState(() => _provisioning = address);
    try {
      await context.read<AppState>().api.adminProvisionMailbox(address);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$address is now manageable from here')));
        setState(_reload);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not bring $address under management: $error')));
      }
    } finally {
      if (mounted) setState(() => _provisioning = null);
    }
  }

  Future<void> _switchTo(AdminAccountSummary account) async {
    final state = context.read<AppState>();
    try {
      await state.adminSwitchTo(account.id);
      if (mounted) {
        Navigator.of(context).popUntil((route) => route.isFirst);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Switched to ${account.address}')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Could not switch: $error')));
      }
    }
  }

  Future<void> _editAccount(AdminAccountSummary account) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _EditAccountSheet(account: account),
    );
    if (mounted) setState(_reload);
  }

  Future<void> _createMailbox() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _CreateMailboxSheet(),
    );
    if (created == true && mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) {
    final currentAddress = context.watch<AppState>().account?.address;
    return FutureBuilder<List<AdminAccountSummary>>(
      future: _accounts,
      builder: (context, accountsSnapshot) {
        if (accountsSnapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final allRows = accountsSnapshot.data ?? const [];
        final q = _query.trim().toLowerCase();
        final rows = q.isEmpty
            ? allRows
            : allRows
                .where((row) =>
                    row.address.toLowerCase().contains(q) ||
                    row.displayName.toLowerCase().contains(q))
                .toList();
        return FutureBuilder<List<HostingerMailboxSummary>>(
          future: _hostingerMailboxes,
          builder: (context, hostingerSnapshot) {
            final hostingerRows = hostingerSnapshot.data ?? const [];
            final usageByAddress = {
              for (final row in hostingerRows) row.address.toLowerCase(): row,
            };
            final unconnected = hostingerRows.where((row) => !row.connected).toList();
            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search, size: 20),
                          hintText: 'Search mailboxes…',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => setState(() => _query = value),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: _createMailbox,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('New'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                for (final account in rows) ...[
                  _AccountCard(
                    account: account,
                    usage: usageByAddress[account.address.toLowerCase()],
                    isCurrent: account.address == currentAddress,
                    onEdit: () => _editAccount(account),
                    onSwitch: () => _switchTo(account),
                  ),
                  const SizedBox(height: 8),
                ],
                if (unconnected.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Also on Hostinger, but never logged into Novamail yet - bring one under '
                    'management directly (this resets its real Hostinger password, since '
                    "there's no other way to get a known one):",
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  for (final row in unconnected)
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.mail_outline),
                      title: Text(row.address),
                      trailing: TextButton(
                        onPressed: _provisioning == row.address
                            ? null
                            : () => _provision(row.address),
                        child: Text(
                            _provisioning == row.address ? 'Working…' : 'Bring under management'),
                      ),
                    ),
                ],
              ],
            );
          },
        );
      },
    );
  }
}

class _CreateMailboxSheet extends StatefulWidget {
  const _CreateMailboxSheet();
  @override
  State<_CreateMailboxSheet> createState() => _CreateMailboxSheetState();
}

class _CreateMailboxSheetState extends State<_CreateMailboxSheet> {
  final _localPart = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  String _role = 'member';
  bool _saving = false;

  @override
  void dispose() {
    _localPart.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (_localPart.text.trim().isEmpty || _password.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Enter a mailbox name and a password of at least 8 characters')));
      return;
    }
    setState(() => _saving = true);
    try {
      final account = await context
          .read<AppState>()
          .api
          .adminCreateMailbox(_localPart.text.trim(), _password.text, _role);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('${account.address} created')));
        Navigator.pop(context, true);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not create that mailbox — it may already exist')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('New mailbox', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          TextField(
            controller: _localPart,
            decoration: const InputDecoration(
                labelText: 'Mailbox name', suffixText: '@novarisesa.com'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: _obscure,
            decoration: InputDecoration(
              labelText: 'Password',
              helperText: 'At least 8 characters',
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 14),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'member', label: Text('Member')),
              ButtonSegment(value: 'admin', label: Text('Admin')),
            ],
            selected: {_role},
            onSelectionChanged: (value) => setState(() => _role = value.first),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _saving ? null : _create,
            child: Text(_saving ? 'Creating…' : 'Create mailbox'),
          ),
        ],
      ),
    );
  }
}

String _formatKb(int kb) {
  if (kb >= 1024 * 1024) return '${(kb / (1024 * 1024)).toStringAsFixed(1)} GB';
  if (kb >= 1024) return '${(kb / 1024).toStringAsFixed(1)} MB';
  return '$kb KB';
}

String _lastActiveLabel(DateTime? at) {
  if (at == null) return 'Never logged in';
  final diff = DateTime.now().difference(at);
  if (diff.inMinutes < 1) return 'Active just now';
  if (diff.inMinutes < 60) return 'Active ${diff.inMinutes}m ago';
  if (diff.inHours < 24) return 'Active ${diff.inHours}h ago';
  if (diff.inDays < 30) return 'Active ${diff.inDays}d ago';
  return 'Active ${DateFormat('MMM d').format(at)}';
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({
    required this.account,
    required this.usage,
    required this.isCurrent,
    required this.onEdit,
    required this.onSwitch,
  });
  final AdminAccountSummary account;
  final HostingerMailboxSummary? usage;
  final bool isCurrent;
  final VoidCallback onEdit;
  final VoidCallback onSwitch;

  @override
  Widget build(BuildContext context) {
    final label = account.displayName.isEmpty ? account.address : account.displayName;
    final quota = usage?.storageQuota ?? 0;
    final used = usage?.storageUsed ?? 0;
    final pct = quota > 0 ? (used / quota).clamp(0.0, 1.0) : null;
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AvatarPalette.forSeed(account.address),
          foregroundColor: Colors.white,
          backgroundImage: account.avatarUrl != null ? NetworkImage(account.avatarUrl!) : null,
          child: account.avatarUrl == null
              ? Text(label.isEmpty ? '?' : label[0].toUpperCase())
              : null,
        ),
        title: Row(
          children: [
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            if (account.role == 'admin') ...[
              const SizedBox(width: 6),
              const Chip(
                label: Text('ADMIN', style: TextStyle(fontSize: 10)),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(account.address),
            const SizedBox(height: 4),
            Row(
              children: [
                if (pct != null) ...[
                  SizedBox(
                    width: 70,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: pct, minHeight: 4),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text('${_formatKb(used)} / ${_formatKb(quota)}',
                      style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(width: 10),
                ],
                Text(_lastActiveLabel(account.lastConnectedAt),
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ],
        ),
        isThreeLine: true,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.copy_outlined, size: 18),
              tooltip: 'Copy address',
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: account.address));
                if (context.mounted) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(const SnackBar(content: Text('Address copied')));
                }
              },
            ),
            IconButton(icon: const Icon(Icons.edit_outlined), onPressed: onEdit),
            if (!isCurrent) TextButton(onPressed: onSwitch, child: const Text('Switch')),
          ],
        ),
      ),
    );
  }
}

class _EditAccountSheet extends StatefulWidget {
  const _EditAccountSheet({required this.account});
  final AdminAccountSummary account;

  @override
  State<_EditAccountSheet> createState() => _EditAccountSheetState();
}

class _EditAccountSheetState extends State<_EditAccountSheet> {
  late final TextEditingController _name;
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscurePassword = true;
  String? _revealedHostingerPassword;
  late String _role;
  bool _savingRole = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.account.displayName);
    _role = widget.account.role;
  }

  @override
  void dispose() {
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _saveName() async {
    setState(() => _busy = true);
    try {
      await context.read<AppState>().api.adminSetProfile(widget.account.id, _name.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Name updated')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleRole() async {
    final next = _role == 'admin' ? 'member' : 'admin';
    setState(() => _savingRole = true);
    try {
      await context.read<AppState>().api.adminSetRole(widget.account.id, next);
      if (mounted) {
        setState(() => _role = next);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(next == 'admin'
                ? '${widget.account.address} is now an admin'
                : '${widget.account.address} is now a member')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _savingRole = false);
    }
  }

  Future<void> _pickPhoto() async {
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 88, maxWidth: 1200);
    if (file == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await context.read<AppState>().api.adminSetAvatar(widget.account.id, file.path);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo updated')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setPassword() async {
    if (_password.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password must be at least 8 characters')));
      return;
    }
    setState(() => _busy = true);
    try {
      await context.read<AppState>().api.adminSetPassword(widget.account.id, _password.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Novamail password changed — ${widget.account.address} is signed out everywhere')));
        _password.clear();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _revealHostingerPassword() async {
    setState(() => _busy = true);
    try {
      final password =
          await context.read<AppState>().api.adminViewHostingerPassword(widget.account.id);
      if (mounted) setState(() => _revealedHostingerPassword = password);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// The rarer, explicit action - changes the account's real Hostinger
  /// mailbox password. Walked through 3 separate confirmations rather
  /// than a single dialog, since this is easy to fat-finger from the
  /// (much more common) Novamail-only reset above.
  Future<void> _changeHostingerPasswordFlow() async {
    final address = widget.account.address;
    final newPasswordController = TextEditingController();
    var obscureDialogPassword = true;
    final newPassword = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Change the real Hostinger password?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'This changes the actual mailbox password used for sending/receiving mail — rarely '
                'needed. $address\'s Novamail login is unaffected.',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: newPasswordController,
                obscureText: obscureDialogPassword,
                decoration: InputDecoration(
                  labelText: 'New Hostinger password',
                  helperText: 'At least 8 characters',
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscureDialogPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      size: 20,
                    ),
                    onPressed: () => setDialogState(() => obscureDialogPassword = !obscureDialogPassword),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () => Navigator.pop(context, newPasswordController.text),
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
    newPasswordController.dispose();
    if (newPassword == null || newPassword.length < 8 || !mounted) return;

    final step2 = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Are you sure? (step 2 of 3)'),
        content: Text('The real mailbox password for $address will change immediately.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true), child: const Text("I'm sure")),
        ],
      ),
    );
    if (step2 != true || !mounted) return;

    final step3 = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Final confirmation (step 3 of 3)'),
        content: Text("Change $address's real Hostinger password now?"),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Change it now')),
        ],
      ),
    );
    if (step3 != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await context
          .read<AppState>()
          .api
          .adminSetHostingerPassword(widget.account.id, newPassword);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Real Hostinger password changed for $address')));
        setState(() => _revealedHostingerPassword = null);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _sectionTitle(BuildContext context, IconData icon, String text, {Color? color}) {
    final resolved = color ?? Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 14, color: resolved),
          const SizedBox(width: 6),
          Text(
            text.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: resolved,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AvatarPalette.forSeed(widget.account.address),
                foregroundColor: Colors.white,
                child: Text(widget.account.address[0].toUpperCase()),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  widget.account.address,
                  style: Theme.of(context).textTheme.titleMedium,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),

          _sectionTitle(context, Icons.person_outline, 'Profile'),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Display name')),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(onPressed: _busy ? null : _saveName, child: const Text('Save name')),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _busy ? null : _pickPhoto,
                icon: const Icon(Icons.image_outlined, size: 16),
                label: const Text('Change photo'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _savingRole ? null : _toggleRole,
            icon: const Icon(Icons.shield_outlined, size: 16),
            label: Text(_role == 'admin' ? 'Remove admin' : 'Make admin'),
          ),
          const Divider(height: 32),

          _sectionTitle(context, Icons.key_outlined, 'Novamail password'),
          TextField(
            controller: _password,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: 'New password',
              helperText: 'At least 8 characters',
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  size: 20,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(onPressed: _busy ? null : _setPassword, child: const Text('Set password')),
          const Divider(height: 32),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: scheme.errorContainer.withValues(alpha: 0.35),
              border: Border.all(color: scheme.error.withValues(alpha: 0.25)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle(context, Icons.warning_amber_outlined, 'Hostinger mailbox password', color: scheme.error),
                if (_revealedHostingerPassword != null)
                  Row(
                    children: [
                      Expanded(
                        child: SelectableText(_revealedHostingerPassword!,
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _revealedHostingerPassword = null),
                        child: const Text('Hide'),
                      ),
                    ],
                  )
                else
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _revealHostingerPassword,
                    icon: const Icon(Icons.visibility_outlined, size: 16),
                    label: const Text('Show current password'),
                  ),
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: _busy ? null : _changeHostingerPasswordFlow,
                  icon: Icon(Icons.warning_amber_outlined, size: 16, color: scheme.error),
                  label: Text('Change the real Hostinger password…', style: TextStyle(color: scheme.error)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _RequestsTab extends StatefulWidget {
  const _RequestsTab({required this.onPendingCountChange});
  final ValueChanged<int> onPendingCountChange;
  @override
  State<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<_RequestsTab> {
  late Future<List<AdminChangeRequest>> _requests;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _requests = context.read<AppState>().api.adminChangeRequests();
    _requests.then((rows) {
      if (mounted) widget.onPendingCountChange(rows.length);
    }).catchError((_) {});
  }

  Future<void> _approve(AdminChangeRequest request) async {
    try {
      await context.read<AppState>().api.adminApproveChangeRequest(request.id);
      if (mounted) setState(_reload);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _reject(AdminChangeRequest request) async {
    try {
      await context.read<AppState>().api.adminRejectChangeRequest(request.id);
      if (mounted) setState(_reload);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  String _label(AdminChangeRequest request) {
    switch (request.requestType) {
      case 'password':
        return 'wants a new password';
      case 'display_name':
        return 'wants to change their name'
            '${request.preview != null ? ' to "${request.preview}"' : ''}';
      case 'avatar':
        return 'wants a new photo';
      default:
        return request.requestType;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AdminChangeRequest>>(
      future: _requests,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final rows = snapshot.data ?? const [];
        if (rows.isEmpty) {
          return const _EmptyState(
            icon: Icons.assignment_turned_in_outlined,
            title: 'No pending requests',
            subtitle: 'Member requests for a new name, password, or photo show up here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final request = rows[index];
            return Card(
              child: ListTile(
                title: Text(request.accountAddress),
                subtitle: Text(_label(request)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.check, color: Colors.green),
                      onPressed: () => _approve(request),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.red),
                      onPressed: () => _reject(request),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _AuditTab extends StatefulWidget {
  const _AuditTab();
  @override
  State<_AuditTab> createState() => _AuditTabState();
}

class _AuditTabState extends State<_AuditTab> {
  late Future<List<AdminAuditLogEntry>> _entries;
  String _actorFilter = 'all';
  String _actionFilter = 'all';

  @override
  void initState() {
    super.initState();
    _entries = context.read<AppState>().api.adminAuditLog(limit: 500);
  }

  String _describe(AdminAuditLogEntry entry) {
    final actor = entry.actorAddress ?? 'Someone';
    switch (entry.action) {
      case 'switched_in':
        return '$actor switched into ${entry.targetAddress}';
      case 'password_reset':
        return '$actor reset the password for ${entry.targetAddress}';
      case 'profile_changed':
        return "$actor changed ${entry.targetAddress}'s ${entry.detail ?? 'profile'}";
      case 'profile_change_requested':
        return '${entry.targetAddress ?? actor} requested a ${entry.detail ?? 'profile'} change';
      case 'change_request_approved':
        return "$actor approved ${entry.targetAddress}'s ${entry.detail ?? 'request'}";
      case 'change_request_rejected':
        return "$actor rejected ${entry.targetAddress}'s ${entry.detail ?? 'request'}";
      default:
        return '$actor — ${entry.action}'
            '${entry.targetAddress != null ? ' (${entry.targetAddress})' : ''}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AdminAuditLogEntry>>(
      future: _entries,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final allRows = snapshot.data ?? const [];
        if (allRows.isEmpty) {
          return const _EmptyState(
            icon: Icons.history,
            title: 'No activity yet',
            subtitle: 'Every admin action gets logged here.',
          );
        }
        final actors = {for (final row in allRows) if (row.actorAddress != null) row.actorAddress!}
            .toList()
          ..sort();
        final actions = {for (final row in allRows) row.action}.toList()..sort();
        final rows = allRows.where((row) {
          if (_actorFilter != 'all' && row.actorAddress != _actorFilter) return false;
          if (_actionFilter != 'all' && row.action != _actionFilter) return false;
          return true;
        }).toList();
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _actorFilter,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Actor', isDense: true),
                      items: [
                        const DropdownMenuItem(value: 'all', child: Text('Everyone')),
                        for (final actor in actors)
                          DropdownMenuItem(value: actor, child: Text(actor, overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (value) => setState(() => _actorFilter = value ?? 'all'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _actionFilter,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Action', isDense: true),
                      items: [
                        const DropdownMenuItem(value: 'all', child: Text('Every action')),
                        for (final action in actions)
                          DropdownMenuItem(value: action, child: Text(action.replaceAll('_', ' '), overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (value) => setState(() => _actionFilter = value ?? 'all'),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: rows.isEmpty
                  ? const _EmptyState(
                      icon: Icons.filter_alt_off_outlined,
                      title: 'No matching activity',
                      subtitle: 'Try widening the actor or action filter.',
                    )
                  : ListView.separated(
                      itemCount: rows.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final entry = rows[index];
                        return ListTile(
                          title: Text(_describe(entry)),
                          subtitle: Text(DateFormat('MMM d, h:mm a').format(entry.createdAt.toLocal())),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
