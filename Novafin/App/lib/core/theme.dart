import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens sampled from NOVARISE's actual brand — the navy (#1c335c)
/// and gold (#dfa247) pulled straight from the company logo and confirmed
/// against the main site's own `src/styles.css` (`--navy`/`--gold`/
/// `--destructive` custom properties), NOT the old Velzon demo template's
/// generic indigo (#5156be) this dashboard used to borrow. Everything else
/// (success/warning/muted/border/soft/textDark) was derived to sit
/// harmoniously alongside that navy+gold pair.
class NfColors {
  static const primary = Color(0xFF1C335C); // NOVARISE navy
  static const primaryDeep = Color(0xFF122544); // darker navy, for gradients/hover accents
  static const gold = Color(0xFFDFA247); // NOVARISE gold — used sparingly as the accent, matching the site's own `.eyebrow { color: var(--gold) }`
  static const success = Color(0xFF2F8F5B);
  static const danger = Color(0xFFDE3C37); // matches the main site's own --destructive token
  static const warning = Color(0xFFC98A2E);
  static const border = Color(0xFFDBE2E9);
  static const muted = Color(0xFF5B6B80);
  static const surface = Color(0xFFFFFFFF);
  static const soft = Color(0xFFF4F1EC);
  static const sidebarBg = Color(0xFFFFFFFF);
  static const textDark = Color(0xFF223047);
}

class NfTheme {
  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    final textTheme = GoogleFonts.poppinsTextTheme(base.textTheme).apply(
      bodyColor: NfColors.textDark,
      displayColor: NfColors.textDark,
    );
    return base.copyWith(
      scaffoldBackgroundColor: const Color(0xFFF6F3EE),
      textTheme: textTheme,
      colorScheme: base.colorScheme.copyWith(
        primary: NfColors.primary,
        secondary: NfColors.success,
        error: NfColors.danger,
        surface: NfColors.surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: NfColors.surface,
        foregroundColor: NfColors.textDark,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: NfColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: NfColors.border),
        ),
      ),
      // Material 3's default dialog mixes `surfaceTint` (= primary) into the
      // background at elevation, which is what was washing every dialog out
      // to a muddy lavender-gray instead of crisp white — killed here with
      // an explicit transparent tint, a real shadow, and bigger radius/type
      // scale so dialogs read as deliberately premium, not a stock default.
      dialogTheme: DialogThemeData(
        backgroundColor: NfColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 16,
        shadowColor: Colors.black.withValues(alpha: 0.28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 40, vertical: 28),
        titleTextStyle: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: NfColors.textDark, height: 1.2),
        contentTextStyle: const TextStyle(fontSize: 13.5, color: NfColors.textDark, height: 1.4),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NfColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: NfColors.primary.withValues(alpha: 0.35),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, letterSpacing: 0.1),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: NfColors.textDark,
          side: const BorderSide(color: NfColors.border),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: NfColors.textDark,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        side: const BorderSide(color: NfColors.border, width: 1.4),
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? NfColors.primary : Colors.transparent,
        ),
      ),
      // Soft sand-tinted fill (instead of plain white-on-white) so every
      // field reads as a distinct input well against a white card/dialog,
      // with no visible border until focused — that thin all-around gray
      // outline was the biggest single source of the "cheap form" look.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: NfColors.soft,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        labelStyle: const TextStyle(color: NfColors.muted, fontSize: 13.5),
        floatingLabelStyle: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
        hintStyle: const TextStyle(color: NfColors.muted, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NfColors.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NfColors.danger, width: 1.2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NfColors.danger, width: 1.6),
        ),
        errorStyle: const TextStyle(color: NfColors.danger, fontSize: 11.5),
      ),
      dividerColor: NfColors.border,
    );
  }
}
