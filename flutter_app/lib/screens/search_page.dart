import 'dart:async';

import 'package:flutter/material.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_theme.dart';
import '../shop_widgets.dart';
import 'product_page.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});
  @override
  State<SearchPage> createState() => SearchPageState();
}

class SearchPageState extends State<SearchPage> {
  final query = TextEditingController();
  Timer? debounce;
  List<Map<String, dynamic>> products = [];
  List<Map<String, dynamic>> categories = [];
  List<Map<String, dynamic>> brands = [];
  String? category;
  String? brand;
  String sort = 'relevance';
  bool onlyStock = false;
  bool onlyDeals = false;
  int count = 0;
  bool loading = true;
  bool loadingMore = false;
  String? error;
  bool initialized = false;
  int requestId = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!initialized) {
      initialized = true;
      ShopScope.of(context).api.get('categories').then((data) {
        if (mounted) setState(() => categories = rows(data['flat']).where((c) => paise(c['level']) == 1).toList());
      }).catchError((_) {});
      WidgetsBinding.instance.addPostFrameCallback((_) => search());
    }
  }

  void selectCategory(String value) {
    category = value;
    search();
  }

  Future<void> search({bool more = false}) async {
    if (!mounted || (more && loadingMore)) return;
    final thisRequest = ++requestId;
    setState(() { if (more) { loadingMore = true; } else { loading = true; loadingMore = false; error = null; } });
    final params = <String, String>{'limit': '24', 'offset': more ? '${products.length}' : '0'};
    if (query.text.trim().isNotEmpty) params['q'] = query.text.trim();
    if (category != null) params['category'] = category!;
    if (brand != null) params['brand'] = brand!;
    if (sort != 'relevance') params['sort'] = sort;
    if (onlyStock) params['in_stock'] = 'true';
    if (onlyDeals) params['deals'] = 'true';
    try {
      final data = await ShopScope.of(context).api.get('products', params);
      if (!mounted || thisRequest != requestId) return;
      setState(() {
        if (more) { products.addAll(rows(data['products'])); } else { products = rows(data['products']); }
        count = paise(data['count']); brands = rows(data['brands']); loading = false; loadingMore = false;
      });
    } catch (e) {
      if (mounted && thisRequest == requestId) setState(() { error = '$e'; loading = false; loadingMore = false; });
    }
  }

  void changeQuery(String _) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 350), search);
  }

  @override
  void dispose() { debounce?.cancel(); query.dispose(); super.dispose(); }

  void openProduct(Map<String, dynamic> p) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductPage(id: '${p['id']}')));

  Future<void> showFilters() async {
    await showModalBottomSheet<void>(
      context: context, isScrollControlled: true, showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(builder: (sheetContext, update) => SafeArea(
        child: Padding(padding: const EdgeInsets.fromLTRB(20, 4, 20, 24), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Refine your search', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(initialValue: sort, decoration: const InputDecoration(labelText: 'Sort by'), items: const [
            DropdownMenuItem(value: 'relevance', child: Text('Most relevant')),
            DropdownMenuItem(value: 'newest', child: Text('Newest')),
            DropdownMenuItem(value: 'price_asc', child: Text('Price: low to high')),
            DropdownMenuItem(value: 'price_desc', child: Text('Price: high to low')),
            DropdownMenuItem(value: 'rating', child: Text('Best rated')),
          ], onChanged: (value) => update(() => sort = value ?? 'relevance')),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(initialValue: brand, decoration: const InputDecoration(labelText: 'Brand'), items: [
            const DropdownMenuItem<String?>(value: null, child: Text('All brands')),
            ...brands.map((b) => DropdownMenuItem<String?>(value: '${b['brand']}', child: Text('${b['brand']}'))),
          ], onChanged: (value) => update(() => brand = value)),
          SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: const Text('In stock only'), value: onlyStock, onChanged: (value) => update(() => onlyStock = value)),
          SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: const Text('Deals only'), value: onlyDeals, onChanged: (value) => update(() => onlyDeals = value)),
          const SizedBox(height: 14),
          FilledButton(onPressed: () { Navigator.pop(sheetContext); search(); }, child: const Text('Show results')),
          TextButton(onPressed: () { update(() { brand = null; sort = 'relevance'; onlyStock = false; onlyDeals = false; }); }, child: Text('Clear filters', style: TextStyle(color: accentInk(context)))),
        ])),
      )),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
    final cardWidth = (width - 40 - (columns - 1) * 12) / columns;
    return RefreshIndicator(onRefresh: () => search(), child: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 30), children: [
      TextField(controller: query, onChanged: changeQuery, onSubmitted: (_) => search(), textInputAction: TextInputAction.search,
        decoration: InputDecoration(hintText: 'Search products, brands or styles', prefixIcon: const Icon(Icons.search), suffixIcon: query.text.isEmpty ? null : IconButton(tooltip: 'Clear search', onPressed: () { query.clear(); search(); }, icon: const Icon(Icons.close))),
      ),
      const SizedBox(height: 14),
      SizedBox(height: 46, child: ListView(scrollDirection: Axis.horizontal, children: [
        ChoiceChip(label: const Text('All'), selected: category == null, onSelected: (_) { setState(() => category = null); search(); }),
        const SizedBox(width: 8),
        ...categories.map((c) => Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text('${c['name']}'), selected: category == c['slug'], onSelected: (_) { setState(() => category = '${c['slug']}'); search(); }))),
      ])),
      const SizedBox(height: 15),
      Row(children: [Expanded(child: Text('$count finds', style: theme.textTheme.titleMedium)), IconButton.outlined(tooltip: 'Filters and sorting', onPressed: showFilters, icon: const Icon(Icons.tune))]),
      const SizedBox(height: 14),
      if (loading) const Padding(padding: EdgeInsets.all(70), child: Center(child: CircularProgressIndicator()))
      else if (error != null) ErrorPane(message: error!, onRetry: search)
      else if (products.isEmpty) const Padding(padding: EdgeInsets.all(48), child: Center(child: Text('No matches yet. Try another word or department.')))
      else ...[
        Wrap(spacing: 12, runSpacing: 24, children: products.map((p) => SizedBox(width: cardWidth, child: ProductTile(product: p, onTap: () => openProduct(p)))).toList()),
        if (products.length < count) Padding(padding: const EdgeInsets.only(top: 24), child: Center(child: OutlinedButton(onPressed: loadingMore ? null : () => search(more: true), child: Text(loadingMore ? 'Loading…' : 'Load more')))),
      ],
    ]));
  }
}

class SavedPage extends StatefulWidget {
  const SavedPage({super.key});
  @override
  State<SavedPage> createState() => _SavedPageState();
}

class _SavedPageState extends State<SavedPage> {
  Future<List<Map<String, dynamic>>>? result;
  String? savedSignature;
  void load() {
    final state = ShopScope.of(context);
    result = Future.wait(state.savedProducts.map((id) async {
      try {
        final data = await state.api.get('products/$id');
        final product = Map<String, dynamic>.from(data['product'] as Map);
        final variants = rows(data['variants']);
        if (variants.isNotEmpty) product.addAll({'price_paise': variants.first['unit_price_paise'], 'mrp_paise': variants.first['mrp_paise']});
        return product;
      } catch (_) { return <String, dynamic>{}; }
    })).then((items) => items.where((item) => item.isNotEmpty).toList());
  }
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final ids = ShopScope.of(context).savedProducts.toList()..sort();
    final next = ids.join('|');
    if (next != savedSignature) { savedSignature = next; load(); }
  }
  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    if (state.savedProducts.isEmpty) return const Center(child: Padding(padding: EdgeInsets.all(30), child: Text('Save the good finds you want to revisit.')));
    return FutureBuilder<List<Map<String, dynamic>>>(future: result, builder: (context, snapshot) {
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final width = MediaQuery.sizeOf(context).width;
      final columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
      final cardWidth = (width - 40 - (columns - 1) * 12) / columns;
      return ListView(padding: const EdgeInsets.all(20), children: [
        SectionTitle('Saved for later'), const SizedBox(height: 18),
        Wrap(spacing: 12, runSpacing: 24, children: snapshot.data!.map((p) => SizedBox(width: cardWidth, child: ProductTile(product: p, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductPage(id: '${p['id']}')))))).toList()),
      ]);
    });
  }
}
