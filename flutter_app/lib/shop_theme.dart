import 'package:flutter/material.dart';

const amber = Color(0xFFF0B429);
const charcoal = Color(0xFF0E0F11);
Color accentInk(BuildContext context) => Theme.of(context).brightness == Brightness.dark
    ? amber
    : const Color(0xFF926000);

ThemeData shopTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final bg = dark ? charcoal : const Color(0xFFECEDEF);
  final surface = dark ? const Color(0xFF17191D) : const Color(0xFFF5F5F3);
  final ink = dark ? const Color(0xFFF1EFE9) : const Color(0xFF101216);
  final muted = dark ? const Color(0xFFAEB2B8) : const Color(0xFF4A4F58);
  final scheme = ColorScheme.fromSeed(seedColor: amber, brightness: brightness).copyWith(
    primary: amber,
    onPrimary: const Color(0xFF17120A),
    surface: surface,
    onSurface: ink,
    outline: dark ? const Color(0xFF3D4046) : const Color(0xFFBFC2C7),
    surfaceContainerLow: bg,
    surfaceContainerHigh: dark ? const Color(0xFF202328) : const Color(0xFFDCDEE2),
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
  final text = base.textTheme.apply(fontFamily: 'HankenGrotesk', bodyColor: ink, displayColor: ink);
  return base.copyWith(
    scaffoldBackgroundColor: bg,
    textTheme: text.copyWith(
      displayLarge: TextStyle(fontFamily: 'BigShouldersDisplay', fontSize: 54, height: 0.98, fontWeight: FontWeight.w800, color: ink),
      displayMedium: TextStyle(fontFamily: 'BigShouldersDisplay', fontSize: 44, height: 1, fontWeight: FontWeight.w800, color: ink),
      headlineLarge: TextStyle(fontFamily: 'BigShouldersDisplay', fontSize: 34, height: 1, fontWeight: FontWeight.w800, color: ink),
      titleLarge: TextStyle(fontFamily: 'HankenGrotesk', fontSize: 22, fontWeight: FontWeight.w700, color: ink),
      titleMedium: TextStyle(fontFamily: 'HankenGrotesk', fontSize: 17, fontWeight: FontWeight.w700, color: ink),
      bodyLarge: TextStyle(fontFamily: 'HankenGrotesk', fontSize: 16, color: ink),
      bodyMedium: TextStyle(fontFamily: 'HankenGrotesk', fontSize: 14, color: ink),
      bodySmall: TextStyle(fontFamily: 'HankenGrotesk', fontSize: 12, color: muted),
    ),
    appBarTheme: AppBarTheme(backgroundColor: bg, foregroundColor: ink, surfaceTintColor: Colors.transparent),
    navigationBarTheme: NavigationBarThemeData(backgroundColor: surface, indicatorColor: amber.withValues(alpha: 0.18)),
    cardTheme: CardThemeData(color: surface, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size(48, 50), shape: const StadiumBorder())),
    outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size(48, 50), shape: const StadiumBorder(), foregroundColor: dark ? amber : const Color(0xFF926000))),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: dark ? amber : const Color(0xFF926000))),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: surface, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}
