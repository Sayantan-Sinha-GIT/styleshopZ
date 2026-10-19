import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:styleshopz_flutter/shop_api.dart';
import 'package:styleshopz_flutter/shop_theme.dart';
import 'package:styleshopz_flutter/shop_widgets.dart';

void main() {
  test('server money fields parse as paise even when JSON uses strings', () {
    expect(paise('212415'), 212415);
    expect(paise(110415), 110415);
    expect(paise(null), 0);
  });

  test('money preserves paise and uses Indian digit grouping', () {
    expect(money(212415), '₹2,124.15');
    expect(money('1050000'), '₹10,500');
  });

  test('API list extraction ignores malformed entries', () {
    expect(rows([{'id': 'one'}, null, 5, {'id': 'two'}]).length, 2);
  });

  test('both themes retain readable brand and ink roles', () {
    for (final brightness in [Brightness.dark, Brightness.light]) {
      final theme = shopTheme(brightness);
      expect(theme.colorScheme.primary, amber);
      expect(theme.colorScheme.onSurface, isNot(theme.scaffoldBackgroundColor));
      expect(theme.useMaterial3, true);
    }
  });
}
