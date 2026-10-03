import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';

final nfMoney = NumberFormat('#,##0.00');

class NfStatCard extends StatelessWidget {
  const NfStatCard({super.key, required this.label, required this.value, required this.caption, required this.accent});

  final String label;
  final String value;
  final String caption;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 15, 18, 18),
      decoration: BoxDecoration(
        color: NfColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: NfColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A hairline gold top-accent on every headline stat card — a
          // restrained, deliberate touch of the brand accent rather than
          // spreading gold across a large fill.
          Container(width: 26, height: 3, margin: const EdgeInsets.only(bottom: 12), decoration: BoxDecoration(color: NfColors.gold, borderRadius: BorderRadius.circular(2))),
          Text(label.toUpperCase(), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: accent)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(caption, style: const TextStyle(fontSize: 12, color: NfColors.muted)),
        ],
      ),
    );
  }
}

/// A page-level heading with a small gold underline accent beneath it —
/// the standard "page title" look used across every screen in the app, so
/// the brand's gold accent shows up consistently, not just in `NfPanel`'s
/// eyebrow labels.
class NfPageTitle extends StatelessWidget {
  const NfPageTitle(this.title, {super.key});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: NfColors.textDark)),
        const SizedBox(height: 6),
        Container(width: 34, height: 3, decoration: BoxDecoration(color: NfColors.gold, borderRadius: BorderRadius.circular(2))),
      ],
    );
  }
}

class NfPanel extends StatelessWidget {
  const NfPanel({
    super.key,
    required this.eyebrow,
    required this.title,
    this.trailing,
    required this.child,
    this.padded = true,
    this.scrollableContent = false,
  });

  final String eyebrow;
  final String title;
  final Widget? trailing;
  final Widget child;
  final bool padded;

  /// True when this panel sits inside an `Expanded` in a bounded-height
  /// column (the full-page list screens) — wraps `child` in an `Expanded` +
  /// vertical `SingleChildScrollView` so a tall table scrolls in place
  /// instead of overflowing. False (default) keeps the panel's natural,
  /// shrink-to-fit height for panels that live inside an already-scrollable
  /// page (Dashboard, Reports, Settings) where the whole page grows instead.
  final bool scrollableContent;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: NfColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: NfColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(eyebrow.toUpperCase(),
                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: NfColors.gold)),
                      const SizedBox(height: 2),
                      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
          const Divider(height: 1),
          if (scrollableContent)
            Expanded(
              child: SingleChildScrollView(
                padding: padded ? const EdgeInsets.all(18) : EdgeInsets.zero,
                child: child,
              ),
            )
          else
            Padding(
              padding: padded ? const EdgeInsets.all(18) : EdgeInsets.zero,
              child: child,
            ),
        ],
      ),
    );
  }
}

class NfEmptyState extends StatelessWidget {
  const NfEmptyState({super.key, required this.message, this.icon = Icons.inbox_outlined});
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Column(
        children: [
          Icon(icon, size: 34, color: NfColors.muted),
          const SizedBox(height: 10),
          Text(message, style: const TextStyle(color: NfColors.muted, fontSize: 13)),
        ],
      ),
    );
  }
}
