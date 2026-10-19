import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_theme.dart';
import '../shop_widgets.dart';
import 'account_page.dart';
import 'address_page.dart';
import 'product_page.dart';

class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    final items = state.cartItems.where((item) => item['saved_for_later'] != true).toList();
    final theme = Theme.of(context);
    if (items.isEmpty) { return Center(child: Padding(padding: const EdgeInsets.all(30), child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.shopping_bag_outlined, size: 48), const SizedBox(height: 14),
      Text('Your bag is waiting for a good find.', textAlign: TextAlign.center, style: theme.textTheme.titleLarge),
      const SizedBox(height: 6), const Text('Explore the shop and add something you love.'),
    ]))); }
    return ListView(padding: const EdgeInsets.fromLTRB(20, 15, 20, 24), children: [
      const SectionTitle('Your bag'), const SizedBox(height: 14),
      ...items.map((item) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Card(child: Padding(padding: const EdgeInsets.all(12), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 92, height: 110, child: InkWell(onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductPage(id: '${item['product_id']}'))), child: ShopImage(path: item['image_url'] as String?))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${item['title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium),
          const SizedBox(height: 5), Text(money(item['unit_price_paise']), style: theme.textTheme.titleMedium?.copyWith(color: accentInk(context))),
          if (item['in_stock'] == false) Text('Unavailable', style: TextStyle(color: theme.colorScheme.error)),
          const SizedBox(height: 8),
          Row(children: [
            IconButton.outlined(tooltip: 'Decrease quantity', onPressed: () async { try { await state.setCartQuantity('${item['variant_id']}', paise(item['quantity']) - 1); } catch (e) { if (context.mounted) shopMessage(context, '$e'); } }, icon: const Icon(Icons.remove, size: 18)),
            SizedBox(width: 32, child: Text('${item['quantity']}', textAlign: TextAlign.center)),
            IconButton.outlined(tooltip: 'Increase quantity', onPressed: paise(item['quantity']) >= 10 ? null : () async { try { await state.setCartQuantity('${item['variant_id']}', paise(item['quantity']) + 1); } catch (e) { if (context.mounted) shopMessage(context, '$e'); } }, icon: const Icon(Icons.add, size: 18)),
          ]),
        ])),
      ]))))),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Subtotal', style: theme.textTheme.titleMedium), Text(money(state.cartSubtotal), style: theme.textTheme.titleLarge)]),
      const SizedBox(height: 5), Text('Delivery and any coupon are calculated at checkout.', style: theme.textTheme.bodySmall),
      const SizedBox(height: 18),
      FilledButton.icon(onPressed: items.any((item) => item['in_stock'] == false) ? null : () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => state.signedIn ? const CheckoutPage() : const LoginPage(nextCheckout: true)));
      }, icon: const Icon(Icons.arrow_forward), label: Text(state.signedIn ? 'Continue to checkout' : 'Sign in to checkout')),
    ]);
  }
}

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key});
  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  List<Map<String, dynamic>> addresses = [];
  Map<String, dynamic>? selectedAddress;
  bool loading = true;
  bool submitting = false;
  String? error;
  String payment = 'demo';
  String delivery = 'standard';
  final couponInput = TextEditingController();
  String? couponCode;
  int discountPaise = 0;
  int? validatedSubtotal;
  bool validatingCoupon = false;
  final key = const Uuid().v4();

  @override
  void dispose() { couponInput.dispose(); super.dispose(); }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (loading && addresses.isEmpty) WidgetsBinding.instance.addPostFrameCallback((_) => load());
  }

  Future<void> load() async {
    try {
      final data = await ShopScope.of(context).api.get('profile');
      if (!mounted) return;
      setState(() {
        addresses = rows(data['addresses']);
        selectedAddress ??= addresses.isEmpty ? null : addresses.first;
        loading = false;
      });
    } catch (e) { if (mounted) setState(() { error = '$e'; loading = false; }); }
  }

  Future<void> addAddress() async {
    final value = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => const AddressPage()));
    if (value != null) { selectedAddress = value; await load(); }
  }

  Future<void> applyCoupon() async {
    final code = couponInput.text.trim().toUpperCase();
    if (code.isEmpty || validatingCoupon) return;
    setState(() { validatingCoupon = true; error = null; });
    try {
      final state = ShopScope.of(context);
      final subtotal = state.cartSubtotal;
      final data = await state.api.post('coupons/validate', {'code': code, 'delivery': delivery});
      if (!mounted) return;
      setState(() {
        couponCode = code;
        discountPaise = paise(data['discountPaise']);
        validatedSubtotal = subtotal;
      });
      shopMessage(context, 'Coupon applied');
    } catch (e) { if (mounted) setState(() { couponCode = null; discountPaise = 0; error = '$e'; }); }
    if (mounted) setState(() => validatingCoupon = false);
  }

  Future<void> placeOrder() async {
    final state = ShopScope.of(context);
    if (selectedAddress == null || state.cartItems.isEmpty || submitting) return;
    setState(() { submitting = true; error = null; });
    try {
      final items = state.cartItems
          .where((item) => item['saved_for_later'] != true)
          .map((item) => {'variantId': item['variant_id'], 'quantity': item['quantity']})
          .toList();
      final reservation = await state.api.post('checkout/hold', {'items': items});
      final result = await state.api.post('checkout/create-order', {
        'items': items, 'address': selectedAddress!, 'paymentMethod': payment,
        'delivery': delivery, 'batchId': reservation['batchId'],
        'idempotencyKey': key,
        if (couponCode != null && validatedSubtotal == state.cartSubtotal) 'couponCode': couponCode,
      });
      await state.refreshCart();
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => OrderPlacedPage(orderId: '${result['orderId']}')));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ShopScope.of(context);
    final deliveryFee = delivery == 'express' ? 9900 : state.cartSubtotal >= 49900 ? 0 : 4000;
    final currentDiscount = validatedSubtotal == state.cartSubtotal ? discountPaise : 0;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 30), children: [
        Text('ONE LAST THING.', style: theme.textTheme.displayMedium),
        const SizedBox(height: 8), const Text('Choose a destination and a demonstration payment method.'),
        const SizedBox(height: 24),
        Text('Delivery address', style: theme.textTheme.titleLarge),
        const SizedBox(height: 9),
        if (addresses.isEmpty) const Text('Every order needs a complete address.')
        else ...addresses.map((address) => Card(child: ListTile(
          leading: Icon(selectedAddress?['id'] == address['id'] ? Icons.check_circle : Icons.radio_button_unchecked),
          title: Text('${address['name']} · ${address['line1']}'),
          subtitle: Text('${address['city']}, ${address['state']} ${address['pincode']}'),
          onTap: () => setState(() => selectedAddress = address),
        ))),
        OutlinedButton.icon(onPressed: addAddress, icon: const Icon(Icons.add_location_alt_outlined), label: const Text('Add an address')),
        const SizedBox(height: 22),
        Text('Delivery pace', style: theme.textTheme.titleLarge),
        SegmentedButton<String>(segments: const [ButtonSegment(value: 'standard', label: Text('Standard')), ButtonSegment(value: 'express', label: Text('Express'))], selected: {delivery}, onSelectionChanged: (set) => setState(() => delivery = set.first)),
        const SizedBox(height: 22),
        Text('How to pay', style: theme.textTheme.titleLarge),
        ListTile(leading: Icon(payment == 'demo' ? Icons.check_circle : Icons.radio_button_unchecked), title: const Text('Demo payment'), subtitle: const Text('No real money is charged.'), onTap: () => setState(() => payment = 'demo')),
        ListTile(leading: Icon(payment == 'cod' ? Icons.check_circle : Icons.radio_button_unchecked), title: const Text('Simulated cash on delivery'), subtitle: const Text('No real delivery or collection.'), onTap: () => setState(() => payment = 'cod')),
        const SizedBox(height: 20),
        Text('Have a coupon?', style: theme.textTheme.titleLarge),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: TextField(controller: couponInput, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(hintText: 'Enter code'), onSubmitted: (_) => applyCoupon())),
          const SizedBox(width: 8),
          FilledButton.tonal(onPressed: validatingCoupon ? null : applyCoupon, child: Text(validatingCoupon ? 'Checking…' : 'Apply')),
        ]),
        if (couponCode != null && currentDiscount > 0) Padding(padding: const EdgeInsets.only(top: 6), child: Text('$couponCode applied', style: TextStyle(color: accentInk(context)))),
        if (couponCode != null && validatedSubtotal != state.cartSubtotal) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Your bag changed. Apply the coupon again to confirm its discount.')),
        const Divider(height: 32),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Items'), Text(money(state.cartSubtotal))]),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Delivery'), Text(deliveryFee == 0 ? 'Free' : money(deliveryFee))]),
        if (currentDiscount > 0) Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Coupon'), Text('−${money(currentDiscount)}')]),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Total', style: theme.textTheme.titleLarge), Text(money(state.cartSubtotal + deliveryFee - currentDiscount), style: theme.textTheme.titleLarge)]),
        if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: theme.colorScheme.error))),
        const SizedBox(height: 18),
        FilledButton(onPressed: selectedAddress == null || submitting ? null : placeOrder, child: Text(submitting ? 'Placing order…' : 'Place demo order')),
      ]),
    );
  }
}

class OrderPlacedPage extends StatelessWidget {
  const OrderPlacedPage({super.key, required this.orderId});
  final String orderId;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Order placed')),
    body: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.check_circle_outline, size: 64, color: Color(0xFF67D8A7)),
      const SizedBox(height: 18), Text('YOUR ORDER IS IN.', style: Theme.of(context).textTheme.displayMedium, textAlign: TextAlign.center),
      const SizedBox(height: 10), const Text('This is a demonstration order. Track its simulated progress in Your orders.', textAlign: TextAlign.center),
      const SizedBox(height: 12), SelectableText('Order reference: $orderId', textAlign: TextAlign.center),
      const SizedBox(height: 24), FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Keep shopping')),
    ]))),
  );
}
