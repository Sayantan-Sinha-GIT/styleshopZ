import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'shop_api.dart';

class ShopState extends ChangeNotifier {
  ShopState(this.api);
  final ShopApi api;
  Map<String, dynamic>? user;
  Map<String, dynamic>? cart;
  bool darkMode = true;
  bool ready = false;
  bool guestMergeFailed = false;
  final List<Map<String, dynamic>> _guestItems = [];
  final Set<String> savedProducts = {};

  bool get signedIn => user != null;
  bool get isSeller => user?['role'] == 'seller';
  bool get isCustomer => user?['role'] == 'customer';
  List<Map<String, dynamic>> get cartItems => rows(cart?['items']);
  int get cartCount =>
      cartItems.fold(0, (sum, item) => sum + paise(item['quantity']));
  int get cartSubtotal => paise(cart?['subtotalPaise']);

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    darkMode = preferences.getBool('dark_mode') ?? true;
    final storedGuest = preferences.getString('guest_items');
    if (storedGuest != null) {
      try {
        _guestItems.addAll(rows(jsonDecode(storedGuest)));
      } catch (_) {
        /* Corrupt local data should not block launch. */
      }
    }
    savedProducts.addAll(preferences.getStringList('saved_products') ?? []);
    await api.restore();
    try {
      user = (await api.get('auth/me'))['user'] as Map<String, dynamic>?;
      if (user != null && !isCustomer && !isSeller) {
        await api.post('auth/logout', {});
        user = null;
      }
    } catch (_) {
      user = null;
    }
    await refreshCart();
    ready = true;
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    darkMode = !darkMode;
    notifyListeners();
    (await SharedPreferences.getInstance()).setBool('dark_mode', darkMode);
  }

  Future<void> toggleSaved(String id) async {
    if (!savedProducts.add(id)) savedProducts.remove(id);
    notifyListeners();
    (await SharedPreferences.getInstance()).setStringList(
      'saved_products',
      savedProducts.toList(),
    );
  }

  Future<void> refreshCart() async {
    try {
      cart = isSeller
          ? {'items': <Map<String, dynamic>>[], 'subtotalPaise': 0}
          : signedIn
          ? await api.get('cart')
          : _guestItems.isEmpty
          ? {'items': <Map<String, dynamic>>[], 'subtotalPaise': 0}
          : await api.post('cart/preview', {'items': _guestItems});
    } catch (_) {
      cart = {'items': <Map<String, dynamic>>[], 'subtotalPaise': 0};
    }
    notifyListeners();
  }

  Future<void> _saveGuest() async {
    (await SharedPreferences.getInstance()).setString(
      'guest_items',
      jsonEncode(_guestItems),
    );
    await refreshCart();
  }

  Future<void> addToCart(String variantId, {int quantity = 1}) async {
    if (isSeller) {
      throw StateError('Seller accounts cannot use a shopping bag.');
    }
    if (signedIn) {
      await api.post('cart', {'variantId': variantId, 'quantity': quantity});
      await refreshCart();
      return;
    }
    final existing = _guestItems.indexWhere(
      (item) => item['variantId'] == variantId,
    );
    if (existing >= 0) {
      _guestItems[existing]['quantity'] =
          (paise(_guestItems[existing]['quantity']) + quantity).clamp(1, 10);
    } else {
      _guestItems.add({'variantId': variantId, 'quantity': quantity});
    }
    await _saveGuest();
  }

  Future<void> setCartQuantity(String variantId, int quantity) async {
    if (isSeller) {
      throw StateError('Seller accounts cannot use a shopping bag.');
    }
    if (signedIn) {
      if (quantity <= 0) {
        await api.delete('cart', {'variant_id': variantId});
      } else {
        await api.patch('cart', {'variantId': variantId, 'quantity': quantity});
      }
      await refreshCart();
      return;
    }
    _guestItems.removeWhere(
      (item) => item['variantId'] == variantId && quantity <= 0,
    );
    for (final item in _guestItems) {
      if (item['variantId'] == variantId) {
        item['quantity'] = quantity.clamp(1, 10);
      }
    }
    await _saveGuest();
  }

  Future<void> login(String email, String password) async {
    user =
        (await api.post('auth/login', {
              'email': email,
              'password': password,
            }))['user']
            as Map<String, dynamic>?;
    await _ensureSupportedRole();
    if (isCustomer) await _mergeGuest();
    await refreshCart();
  }

  Future<void> register(
    String name,
    String email,
    String password, {
    String? shopName,
  }) async {
    user =
        (await api.post('auth/register', {
              'name': name,
              'email': email,
              'password': password,
              if (shopName != null) 'role': 'seller',
              'shopName': ?shopName,
            }))['user']
            as Map<String, dynamic>?;
    await _ensureSupportedRole();
    if (isCustomer) await _mergeGuest();
    await refreshCart();
  }

  Future<void> loginWithFirebaseToken(String token) async {
    user =
        (await api.post('auth/google', {'idToken': token}))['user']
            as Map<String, dynamic>?;
    await _ensureSupportedRole();
    if (isCustomer) await _mergeGuest();
    await refreshCart();
  }

  Future<void> _ensureSupportedRole() async {
    if (isCustomer || isSeller) return;
    user = null;
    try {
      await api.post('auth/logout', {});
    } catch (_) {
      /* The native UI stays signed out. */
    }
    throw StateError('Admin accounts use the separate admin website and app.');
  }

  Future<void> refreshUser() async {
    user = (await api.get('auth/me'))['user'] as Map<String, dynamic>?;
    notifyListeners();
  }

  Future<void> _mergeGuest() async {
    guestMergeFailed = false;
    if (_guestItems.isEmpty) return;
    try {
      await api.post('cart', {'items': _guestItems});
      _guestItems.clear();
      await _saveGuest();
    } catch (_) {
      guestMergeFailed = true;
    }
  }

  Future<void> logout() async {
    await api.post('auth/logout', {});
    user = null;
    await refreshCart();
  }

  @override
  void dispose() {
    api.dispose();
    super.dispose();
  }
}

class ShopScope extends InheritedNotifier<ShopState> {
  const ShopScope({super.key, required ShopState state, required super.child})
    : super(notifier: state);
  static ShopState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ShopScope>();
    assert(scope != null, 'ShopScope is required.');
    return scope!.notifier!;
  }
}
