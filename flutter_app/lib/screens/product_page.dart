import 'package:flutter/material.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_theme.dart';
import '../shop_widgets.dart';

class ProductPage extends StatefulWidget {
  const ProductPage({super.key, required this.id});
  final String id;
  @override
  State<ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<ProductPage> {
  Map<String, dynamic>? product;
  List<Map<String, dynamic>> variants = [];
  List<Map<String, dynamic>> images = [];
  List<Map<String, dynamic>> reviews = [];
  int selected = 0;
  bool loading = true;
  bool adding = false;
  String? error;
  bool requested = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!requested) { requested = true; WidgetsBinding.instance.addPostFrameCallback((_) => load()); }
  }

  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await ShopScope.of(context).api.get('products/${widget.id}');
      if (!mounted) return;
      setState(() {
        product = Map<String, dynamic>.from(data['product'] as Map);
        variants = rows(data['variants']); images = rows(data['images']); reviews = rows(data['reviews']);
        loading = false;
      });
    } catch (e) { if (mounted) setState(() { error = '$e'; loading = false; }); }
  }

  Future<void> add() async {
    if (variants.isEmpty || adding) return;
    setState(() => adding = true);
    try {
      await ShopScope.of(context).addToCart('${variants[selected]['id']}');
      if (mounted) shopMessage(context, 'Added to your bag');
    } catch (e) { if (mounted) shopMessage(context, '$e'); }
    if (mounted) setState(() => adding = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ShopScope.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final selectedVariant = variants.isNotEmpty ? variants[selected] : <String, dynamic>{};
    final price = selectedVariant['unit_price_paise'] ?? selectedVariant['price_paise'];
    final mrp = selectedVariant['mrp_paise'];
    return Scaffold(
      appBar: AppBar(title: Text(product?['brand']?.toString() ?? 'Product'), actions: [
        IconButton(tooltip: 'Save item', onPressed: () => state.toggleSaved(widget.id), icon: Icon(state.savedProducts.contains(widget.id) ? Icons.favorite : Icons.favorite_border)),
      ]),
      body: loading ? const Center(child: CircularProgressIndicator()) : error != null ? ErrorPane(message: error!, onRetry: load) : product == null ? const ErrorPane(message: 'Product unavailable') :
      Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1000), child: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 28), children: [
        if (width >= 700)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: _gallery()), const SizedBox(width: 28), Expanded(child: _details(theme, selectedVariant, price, mrp)),
          ])
        else ...[_gallery(), const SizedBox(height: 22), _details(theme, selectedVariant, price, mrp)],
        const SizedBox(height: 32),
        Text('What shoppers say', style: theme.textTheme.titleLarge),
        const SizedBox(height: 12),
        if (reviews.isEmpty) Text('No customer reviews yet. This is a demonstration product.', style: theme.textTheme.bodyMedium)
        else ...reviews.take(4).map((review) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${review['user_name'] ?? 'Shopper'} · ${review['rating'] ?? ''} ★', style: theme.textTheme.titleMedium),
          Text('${review['body'] ?? review['text'] ?? ''}'),
        ])))),
      ]))),
      bottomNavigationBar: product == null || loading ? null : SafeArea(top: false, child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
        child: FilledButton.icon(onPressed: paise(selectedVariant['stock']) > 0 && !adding ? add : null, icon: const Icon(Icons.shopping_bag_outlined), label: Text(adding ? 'Adding…' : paise(selectedVariant['stock']) > 0 ? 'Add to bag · ${money(price)}' : 'Out of stock')),
      )),
    );
  }

  Widget _gallery() {
    final paths = images.isEmpty ? [product!['image_url']] : images.map((item) => item['url']).toList();
    return AspectRatio(aspectRatio: 1.05, child: PageView(children: paths.map((path) => ShopImage(path: path as String?, fit: BoxFit.cover, radius: 16)).toList()));
  }

  Widget _details(ThemeData theme, Map<String, dynamic> selectedVariant, dynamic price, dynamic mrp) => Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${product!['category_name'] ?? ''}'.toUpperCase(), style: theme.textTheme.labelMedium?.copyWith(color: accentInk(context), letterSpacing: 1)),
      const SizedBox(height: 7),
      Text('${product!['title']}', style: theme.textTheme.headlineLarge),
      const SizedBox(height: 10),
      Text('${product!['brand'] ?? ''} · ${product!['seller_name'] ?? 'Verified seller'}', style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
      const SizedBox(height: 18),
      Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 10, children: [
        Text(money(price), style: theme.textTheme.titleLarge?.copyWith(color: accentInk(context))),
        if (paise(mrp) > paise(price)) Text(money(mrp), style: theme.textTheme.bodyMedium?.copyWith(decoration: TextDecoration.lineThrough)),
      ]),
      const SizedBox(height: 10),
      Text(paise(selectedVariant['stock']) > 0 ? '${selectedVariant['stock']} available' : 'Out of stock', style: theme.textTheme.bodySmall),
      if (variants.length > 1) ...[
        const SizedBox(height: 20),
        Text('Choose a version', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: List.generate(variants.length, (i) => ChoiceChip(
          label: Text((variants[i]['options'] as Map?)?.values.join(' · ') ?? 'Option ${i + 1}'),
          selected: selected == i, onSelected: (_) => setState(() => selected = i),
        ))),
      ],
      const SizedBox(height: 24),
      Text('The details', style: theme.textTheme.titleLarge),
      const SizedBox(height: 8),
      Text('${product!['description'] ?? 'No description yet.'}', style: theme.textTheme.bodyLarge),
      const SizedBox(height: 16),
      Text('Sample catalogue and photography. No real delivery or manufacturer warranty.', style: theme.textTheme.bodySmall),
    ],
  );
}
