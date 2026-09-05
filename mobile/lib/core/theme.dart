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

/// Shared corner-radius scale for the premium rounded-card look used
/// throughout the app.
class AppRadius {
  const AppRadius._();
  static const sm = 10.0;
  static const md = 14.0;
  static const lg = 20.0;
  static const pill = 999.0;
}

/// Palette tokens for both light and dark mode. Screens should read colors
/// from `Theme.of(context).colorScheme` / `AppColors.of(context)` rather than
/// hardcoding `Colors.*` values. Light and dark are deliberately tuned
/// separately rather than derived from one another, so each reads as an
/// intentional, finished look instead of an inverted afterthought.
class AppColors {
  const AppColors({
    required this.unreadTint,
    required this.subtleText,
    required this.star,
    required this.success,
    required this.divider,
    required this.elevatedSurface,
    required this.chipBackground,
    required this.chipBorder,
    required this.shadow,
  });

  final Color unreadTint;
  final Color subtleText;
  final Color star;
  final Color success;
  final Color divider;

  /// One step brighter than the card surface — dialogs, sheets, popovers,
  /// and the "selected" state for an otherwise flat row.
  final Color elevatedSurface;
  final Color chipBackground;
  final Color chipBorder;
  final Color shadow;

  static const light = AppColors(
    unreadTint: Color(0xFFF0F5FF),
    subtleText: Color(0xFF5B6B84),
    star: Color(0xFFEEA10E),
    success: Color(0xFF1E9E63),
    divider: Color(0xFFE7EAF2),
    elevatedSurface: Colors.white,
    chipBackground: Color(0xFFEEF2FC),
    chipBorder: Color(0xFFD8E0F5),
    shadow: Color(0x14162447),
  );

  static const dark = AppColors(
    unreadTint: Color(0xFF16213A),
    subtleText: Color(0xFFA6B0C3),
    star: Color(0xFFF0B429),
    success: Color(0xFF33C481),
    divider: Color(0xFF262F45),
    elevatedSurface: Color(0xFF1C2438),
    chipBackground: Color(0xFF212B44),
    chipBorder: Color(0xFF303C58),
    shadow: Color(0x40000000),
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

/// A subtle brand gradient reserved for a handful of "hero" touches (the
/// compose FAB, the account-switcher avatar ring) — used sparingly so it
/// reads as premium polish rather than noise.
class AppGradients {
  const AppGradients._();

  static const brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF3563E9), Color(0xFF5B8DF7)],
  );
}

class NovariseTheme {
  static const blue = Color(0xFF3563E9);
  static const navy = Color(0xFF0B1739);

  static ThemeData light() => _build(
        seedColor: blue,
        brightness: Brightness.light,
        scaffoldBackground: const Color(0xFFF7F8FC),
        surface: Colors.white,
        onSurface: navy,
        tokens: AppColors.light,
      );

  static ThemeData dark() => _build(
        seedColor: blue,
        brightness: Brightness.dark,
        scaffoldBackground: const Color(0xFF0A0E17),
        surface: const Color(0xFF141B2C),
        onSurface: const Color(0xFFE7ECF7),
        tokens: AppColors.dark,
      );

  static ThemeData _build({
    required Color seedColor,
    required Brightness brightness,
    required Color scaffoldBackground,
    required Color surface,
    required Color onSurface,
    required AppColors tokens,
  }) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: brightness,
      surface: surface,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffoldBackground,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: scaffoldBackground,
        foregroundColor: onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: onSurface,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: isDark ? 0 : 1.5,
        shadowColor: tokens.shadow,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: isDark ? BorderSide(color: tokens.divider) : BorderSide.none,
        ),
      ),
      dividerTheme: DividerThemeData(color: tokens.divider, space: 1),
      chipTheme: ChipThemeData(
        backgroundColor: tokens.chipBackground,
        deleteIconColor: tokens.subtleText,
        labelStyle: TextStyle(color: onSurface, fontSize: 13),
        side: BorderSide(color: tokens.chipBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: tokens.elevatedSurface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: tokens.elevatedSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: tokens.elevatedSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
      navigationDrawerTheme: NavigationDrawerThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: onSurface,
        contentTextStyle: TextStyle(color: surface),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? tokens.elevatedSurface : const Color(0xFFF7F8FC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: tokens.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: tokens.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: tokens.divider),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg)),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: tokens.subtleText,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
    );
  }
}
