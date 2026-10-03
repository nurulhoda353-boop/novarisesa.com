import 'package:flutter/material.dart';

import '../core/theme.dart';

class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 24),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.construction_outlined, size: 40, color: NfColors.muted),
                const SizedBox(height: 12),
                Text('$title module is coming in the next build.', style: const TextStyle(color: NfColors.muted)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
