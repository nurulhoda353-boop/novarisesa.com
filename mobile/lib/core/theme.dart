import 'package:flutter/material.dart';

/// Shared spacing scale so screens stop hardcoding magic numbers.
class AppSpacing {
  const AppSpacing._();
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 28.0;
}

/// Palette tokens for both light and dark mode. Screens should read colors
/// from `Theme.of(context).colorScheme` / `AppColors.of(context)` rather than
/// hardcoding `Colors.*` values.
class AppColors {
  const AppColors({
    required this.unreadTint,
    required this.subtleText,
    required this.star,
    required this.success,
    required this.divider,
  });

  final Color unreadTint;
  final Color subtleText;
  final Color star;
  final Color success;
  final Color divider;

  static const light = AppColors(
    unreadTint: Color(0xFFF2F6FF),
    subtleText: Color(0xFF5B6B84),
    star: Color(0xFFEEA10E),
    success: Color(0xFF1E9E63),
    divider: Color(0xFFE2E6EF),
  );

  static const dark = AppColors(
    unreadTint: Color(0xFF152036),
    subtleText: Color(0xFFA6B0C3),
    star: Color(0xFFF0B429),
    success: Color(0xFF33C481),
    divider: Color(0xFF2A3346),
  );

  static AppColors of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;
}

/// Deterministic, contact-distinguishing avatar colors (à la Gmail) derived
/// from the sender's email address rather than one flat theme color.
class AvatarPalette {
  const AvatarPalette._();

  static const _swatches = [
    Color(0xFF3563E9),
    Color(0xFF1E9E63),
    Color(0xFFDB6E2A),
    Color(0xFF9455D3),
    Color(0xFFDA3E71),
    Color(0xFF0F9DB8),
    Color(0xFFB8860B),
    Color(0xFF546E7A),
  ];

  static Color forSeed(String seed) {
    if (seed.isEmpty) return _swatches.first;
    final hash = seed.codeUnits.fold<int>(0, (acc, unit) => acc + unit);
    return _swatches[hash % _swatches.length];
  }
}

class NovariseTheme {
  static const blue = Color(0xFF3563E9);
  static const navy = Color(0xFF0B1739);

  static ThemeData light() => _build(
        seedColor: blue,
        brightness: Brightness.light,
        scaffoldBackground: const Color(0xFFF8F9FC),
        surface: Colors.white,
        onSurface: navy,
        border: AppColors.light.divider,
      );

  static ThemeData dark() => _build(
        seedColor: blue,
        brightness: Brightness.dark,
        scaffoldBackground: const Color(0xFF0B0F19),
        surface: const Color(0xFF141B2C),
        onSurface: const Color(0xFFE7ECF7),
        border: AppColors.dark.divider,
      );

  static ThemeData _build({
    required Color seedColor,
    required Brightness brightness,
    required Color scaffoldBackground,
    required Color surface,
    required Color onSurface,
    required Color border,
  }) {
    final scheme = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: brightness,
      surface: surface,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffoldBackground,
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: onSurface,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
      ),
      dividerTheme: DividerThemeData(color: border),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: border),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}
