import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/auth_state.dart';
import '../core/theme.dart';

/// A single clickable destination. `path` is null for a parent-only entry
/// (one that just expands to reveal `children`, per the user's request to
/// group the sidebar into families with their submenus inside them).
class NavItem {
  const NavItem(this.label, this.icon, {this.path, this.children = const []});

  final String label;
  final IconData icon;
  final String? path;
  final List<NavItem> children;

  bool get hasChildren => children.isNotEmpty;
}

const nfNavTree = [
  NavItem('Dashboard', Icons.space_dashboard_outlined, path: '/dashboard'),
  NavItem('Items & Inventory', Icons.inventory_2_outlined, path: '/items'),
  NavItem('Sales', Icons.point_of_sale_outlined, children: [
    NavItem('Customers', Icons.groups_outlined, path: '/customers'),
    NavItem('Quotes', Icons.request_quote_outlined, path: '/quotes'),
    NavItem('Orders', Icons.assignment_outlined, path: '/orders'),
    NavItem('Deliveries', Icons.local_shipping_outlined, path: '/deliveries'),
    NavItem('Invoices', Icons.receipt_long_outlined, path: '/invoices'),
    NavItem('Sales Returns', Icons.undo_outlined, path: '/sales-returns'),
    NavItem('Credit Notes', Icons.note_alt_outlined, path: '/credit-notes'),
  ]),
  NavItem('Purchases', Icons.shopping_cart_outlined, children: [
    NavItem('Vendors', Icons.storefront_outlined, path: '/vendors'),
    NavItem('RFQ', Icons.mark_email_read_outlined, path: '/rfqs'),
    NavItem('Purchase Orders', Icons.assignment_turned_in_outlined, path: '/purchase-orders'),
    NavItem('Purchase Bills', Icons.shopping_bag_outlined, path: '/purchase-bills'),
    NavItem('Purchase Returns', Icons.keyboard_return_outlined, path: '/purchase-returns'),
  ]),
  NavItem('Banking & Cash', Icons.account_balance_outlined, children: [
    NavItem('Banks', Icons.account_balance_outlined, path: '/banks'),
    NavItem('Branches', Icons.location_city_outlined, path: '/branches'),
    NavItem('Cash Receipts', Icons.arrow_downward, path: '/cash-receipts'),
    NavItem('Cash Payments', Icons.arrow_upward, path: '/cash-payments'),
    NavItem('Cheques', Icons.payments_outlined, path: '/cheques'),
    NavItem('Capital / Drawings', Icons.savings_outlined, path: '/capital'),
    NavItem('Contra', Icons.swap_horiz, path: '/contra'),
    NavItem('Bank Reconciliation', Icons.fact_check_outlined, path: '/bank-reconciliation'),
  ]),
  NavItem('Accounts', Icons.list_alt_outlined, children: [
    NavItem('Chart of Accounts', Icons.list_alt_outlined, path: '/accounts'),
    NavItem('Journal Vouchers', Icons.menu_book_outlined, path: '/journal-vouchers'),
    NavItem('Income Vouchers', Icons.trending_up, path: '/income-vouchers'),
    NavItem('Expense Vouchers', Icons.trending_down, path: '/expense-vouchers'),
    NavItem('Fixed Assets', Icons.precision_manufacturing_outlined, path: '/assets'),
  ]),
  NavItem('Human Resources', Icons.badge_outlined, children: [
    NavItem('Departments', Icons.apartment_outlined, path: '/departments'),
    NavItem('Designations', Icons.badge_outlined, path: '/designations'),
    NavItem('Employees', Icons.people_outline, path: '/employees'),
    NavItem('Salary Slips', Icons.payment_outlined, path: '/salary-slips'),
  ]),
  NavItem('Reports', Icons.bar_chart_outlined, path: '/reports'),
  NavItem('Settings', Icons.settings_outlined, children: [
    NavItem('User Roles', Icons.admin_panel_settings_outlined, path: '/user-roles'),
    NavItem('Company Settings', Icons.settings_outlined, path: '/admin'),
    NavItem('Fiscal Years', Icons.event_note_outlined, path: '/fiscal-years'),
    NavItem('Opening Balance', Icons.playlist_add_check_outlined, path: '/opening-balance'),
    NavItem('Audit Log', Icons.history_outlined, path: '/audit-log'),
  ]),
];

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.child, required this.currentPath});

  final Widget child;
  final String currentPath;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final Set<String> _expanded = {};

  @override
  void initState() {
    super.initState();
    _expandParentOf(widget.currentPath);
  }

  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentPath != widget.currentPath) {
      _expandParentOf(widget.currentPath);
    }
  }

  void _expandParentOf(String path) {
    for (final item in nfNavTree) {
      if (item.hasChildren && item.children.any((c) => c.path == path)) {
        _expanded.add(item.label);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      backgroundColor: const Color(0xFFF6F3EE),
      body: Row(
        children: [
          Container(
            width: 260,
            color: NfColors.sidebarBg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(color: NfColors.primary, borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 10),
                      const Text('NovaFin', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    children: [
                      for (final item in nfNavTree)
                        if (item.hasChildren)
                          _ParentNavTile(
                            item: item,
                            expanded: _expanded.contains(item.label),
                            activePath: widget.currentPath,
                            onToggle: () => setState(() {
                              if (!_expanded.remove(item.label)) _expanded.add(item.label);
                            }),
                          )
                        else
                          _NavTile(item: item, selected: widget.currentPath == item.path, indent: false),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: NfColors.soft, borderRadius: BorderRadius.circular(10)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('NovaFin v1.0', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 2),
                        const Text('NOVARISE Management System', style: TextStyle(fontSize: 11, color: NfColors.muted)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const VerticalDivider(width: 1, color: NfColors.border),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  height: 64,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: const BoxDecoration(
                    color: NfColors.surface,
                    border: Border(bottom: BorderSide(color: NfColors.border)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 320),
                          child: TextField(
                            decoration: InputDecoration(
                              hintText: 'Search menu...',
                              prefixIcon: const Icon(Icons.search, size: 20),
                              isDense: true,
                              filled: true,
                              fillColor: NfColors.soft,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
                            ),
                          ),
                        ),
                      ),
                      const Spacer(),
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: NfColors.primary,
                        child: Text(
                          (auth.user?.fullName ?? '?').substring(0, 1).toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(auth.user?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(width: 12),
                      IconButton(
                        tooltip: 'Sign out',
                        icon: const Icon(Icons.logout, size: 20),
                        onPressed: () => context.read<AuthState>().logout(),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: widget.child,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ParentNavTile extends StatelessWidget {
  const _ParentNavTile({required this.item, required this.expanded, required this.activePath, required this.onToggle});

  final NavItem item;
  final bool expanded;
  final String activePath;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final childActive = item.children.any((c) => c.path == activePath);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
          child: Material(
            color: childActive && !expanded ? NfColors.primary.withValues(alpha: 0.06) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            child: InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: onToggle,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 3,
                      height: 18,
                      decoration: BoxDecoration(
                        color: (childActive && !expanded) ? NfColors.gold : Colors.transparent,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 9),
                    Icon(item.icon, size: 19, color: childActive ? NfColors.primary : NfColors.muted),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: childActive ? FontWeight.w600 : FontWeight.w500,
                          color: childActive ? NfColors.primary : NfColors.textDark,
                        ),
                      ),
                    ),
                    AnimatedRotation(
                      turns: expanded ? 0.25 : 0,
                      duration: const Duration(milliseconds: 150),
                      child: const Icon(Icons.chevron_right, size: 18, color: NfColors.muted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox(width: double.infinity),
          secondChild: Column(children: [for (final child in item.children) _NavTile(item: child, selected: activePath == child.path, indent: true)]),
          crossFadeState: expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 150),
          sizeCurve: Curves.easeInOut,
        ),
      ],
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({required this.item, required this.selected, required this.indent});

  final NavItem item;
  final bool selected;
  final bool indent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(indent ? 26 : 10, 2, 10, 2),
      child: Material(
        color: selected ? NfColors.primary.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          borderRadius: BorderRadius.circular(6),
          onTap: () => context.go(item.path!),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 18,
                  decoration: BoxDecoration(
                    color: selected ? NfColors.gold : Colors.transparent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 9),
                Icon(item.icon, size: indent ? 16 : 19, color: selected ? NfColors.primary : NfColors.muted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontSize: indent ? 13 : 13.5,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color: selected ? NfColors.primary : NfColors.textDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
