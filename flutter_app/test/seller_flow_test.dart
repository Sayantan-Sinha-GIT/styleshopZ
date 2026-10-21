import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:styleshopz_flutter/main.dart';
import 'package:styleshopz_flutter/shop_api.dart';
import 'package:styleshopz_flutter/shop_state.dart';

class FakeShopApi extends ShopApi {
  FakeShopApi(this.account);
  Map<String, dynamic>? account;
  final calls = <String>[];
  Map<String, dynamic>? registration;
  final orderItems = <Map<String, dynamic>>[];

  @override
  Future<void> restore() async {}

  @override
  Future<Map<String, dynamic>> get(
    String path, [
    Map<String, String>? query,
  ]) async {
    calls.add('GET $path');
    if (path == 'auth/me') return {'user': account};
    if (path == 'seller') {
      return {
        'seller': {
          'shop_name': 'Test Studio',
          'status': 'approved',
          'kyc_data': {},
        },
        'products': <Map<String, dynamic>>[],
        'items': orderItems,
        'returns': <Map<String, dynamic>>[],
        'stats': {'item_count': 0, 'pending_paise': 0, 'delivered_paise': 0},
      };
    }
    if (path == 'categories') return {'flat': <Map<String, dynamic>>[]};
    if (path == 'cart') {
      return {'items': <Map<String, dynamic>>[], 'subtotalPaise': 0};
    }
    throw StateError('Unexpected GET $path');
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    calls.add('POST $path');
    if (path == 'auth/logout') {
      account = null;
      return {'ok': true};
    }
    if (path == 'auth/login') return {'user': account};
    if (path == 'auth/register') {
      registration = body;
      account = {
        'name': body['name'],
        'role': body['role'] ?? 'customer',
        'email': body['email'],
      };
      return {'user': account};
    }
    if (path == 'seller/orders') {
      final item = orderItems.firstWhere((item) => item['id'] == body['orderItemId']);
      item['status'] = body['newStatus'];
      if (body['newStatus'] == 'shipped') {
        item['tracking_id'] = 'SZDEMO1234567890AB';
      }
      return {'ok': true};
    }
    throw StateError('Unexpected POST $path');
  }
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test(
    'restored seller session stays signed in without fetching a customer bag',
    () async {
      final api = FakeShopApi({
        'name': 'Seller',
        'email': 'seller@example.test',
        'role': 'seller',
      });
      final state = ShopState(api);
      await state.initialize();
      expect(state.isSeller, true);
      expect(state.cartItems, isEmpty);
      expect(api.calls, ['GET auth/me']);
      state.dispose();
    },
  );

  test('seller registration sends the role and shop name', () async {
    final api = FakeShopApi(null);
    final state = ShopState(api);
    await state.initialize();
    await state.register(
      'A Seller',
      'seller@example.test',
      'password123',
      shopName: 'Test Studio',
    );
    expect(api.registration?['role'], 'seller');
    expect(api.registration?['shopName'], 'Test Studio');
    expect(state.isSeller, true);
    expect(() => state.addToCart('variant-id'), throwsStateError);
    state.dispose();
  });

  test('admin login is rejected from the shopper and seller APK', () async {
    final api = FakeShopApi({'name': 'Admin', 'role': 'admin'});
    final state = ShopState(api);
    await state.initialize();
    expect(state.signedIn, false);
    api.account = {'name': 'Admin', 'role': 'admin'};
    await expectLater(
      state.login('owner@example.test', 'password123'),
      throwsStateError,
    );
    expect(api.calls.where((call) => call == 'POST auth/logout').length, 2);
    expect(state.signedIn, false);
    state.dispose();
  });

  testWidgets('seller sees the native workspace and all four destinations', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final api = FakeShopApi({
      'name': 'Seller',
      'email': 'seller@example.test',
      'role': 'seller',
    });
    final state = ShopState(api);
    await state.initialize();
    await tester.pumpWidget(
      ShopScope(
        state: state,
        child: ShopApp(state: state),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('YOUR SHOP.'), findsOneWidget);
    for (final label in ['Overview', 'Products', 'Orders', 'Shop']) {
      expect(
        find.byWidgetPredicate(
          (widget) => widget is NavigationDestination && widget.label == label,
        ),
        findsOneWidget,
      );
    }
    expect(find.text('Test Studio'), findsWidgets);
    await tester.pumpWidget(const SizedBox());
    state.dispose();
  });

  testWidgets('seller ships an order with automatic demo courier tracking', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final api = FakeShopApi({
      'name': 'Seller',
      'email': 'seller@example.test',
      'role': 'seller',
    });
    api.orderItems.add({
      'id': 'item-1',
      'order_id': 'order-12345',
      'status': 'placed',
      'variant_snapshot': {'title': 'Headphones'},
      'address_snapshot': {
        'name': 'Customer',
        'city': 'Kolkata',
        'pincode': '700001',
      },
      'quantity': 1,
      'unit_price_paise': 99900,
    });
    final state = ShopState(api);
    await state.initialize();
    await tester.pumpWidget(
      ShopScope(
        state: state,
        child: ShopApp(state: state),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mark Packed'));
    await tester.pumpAndSettle();
    expect(find.text('Mark Shipped'), findsOneWidget);
    await tester.tap(find.text('Mark Shipped'));
    await tester.pumpAndSettle();
    expect(api.orderItems.first['status'], 'shipped');
    expect(api.orderItems.first['tracking_id'], 'SZDEMO1234567890AB');
    expect(find.text('Status: Shipped · Demo courier SZDEMO1234567890AB'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    state.dispose();
  });
}
