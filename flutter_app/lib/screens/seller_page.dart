import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_theme.dart';
import '../shop_widgets.dart';

String _label(dynamic value) => '$value'
    .replaceAll('_', ' ')
    .split(' ')
    .map(
      (word) =>
          word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}',
    )
    .join(' ');

class SellerShell extends StatefulWidget {
  const SellerShell({super.key});
  @override
  State<SellerShell> createState() => _SellerShellState();
}

class _SellerShellState extends State<SellerShell> {
  int tab = 0;
  bool started = false;
  bool loading = true;
  String? error;
  Map<String, dynamic>? data;
  List<Map<String, dynamic>> categories = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!started) {
      started = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => load());
    }
  }

  Future<void> load() async {
    if (!mounted) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final api = ShopScope.of(context).api;
      final result = await Future.wait([
        api.get('seller'),
        api.get('categories'),
      ]);
      if (mounted) {
        setState(() {
          data = result[0];
          categories = rows(result[1]['flat'])
              .where((row) => paise(row['level']) == 3)
              .toList();
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
          loading = false;
        });
      }
    }
  }

  Future<void> editProduct([Map<String, dynamic>? product]) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            SellerProductEditor(product: product, categories: categories),
      ),
    );
    if (changed == true) await load();
  }

  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    final narrow = MediaQuery.sizeOf(context).width < 600;
    final seller = data?['seller'] as Map<String, dynamic>?;
    final destinations = [
      const NavigationDestination(
        icon: Icon(Icons.space_dashboard_outlined),
        selectedIcon: Icon(Icons.space_dashboard),
        label: 'Overview',
      ),
      const NavigationDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Products',
      ),
      const NavigationDestination(
        icon: Icon(Icons.local_shipping_outlined),
        selectedIcon: Icon(Icons.local_shipping),
        label: 'Orders',
      ),
      const NavigationDestination(
        icon: Icon(Icons.storefront_outlined),
        selectedIcon: Icon(Icons.storefront),
        label: 'Shop',
      ),
    ];
    Widget content;
    if (loading && data == null) {
      content = const Center(child: CircularProgressIndicator());
    } else if (error != null && data == null) {
      content = ErrorPane(message: error!, onRetry: load);
    } else {
      final pages = [
        SellerOverview(
          data: data!,
          onProducts: () => setState(() => tab = 1),
          onShop: () => setState(() => tab = 3),
        ),
        SellerProducts(data: data!, onEdit: editProduct, onRefresh: load),
        SellerOrders(data: data!, onRefresh: load),
        SellerProfile(data: data!, onRefresh: load),
      ];
      content = Row(
        children: [
          if (!narrow)
            NavigationRail(
              selectedIndex: tab,
              onDestinationSelected: (i) => setState(() => tab = i),
              destinations: destinations
                  .map(
                    (item) => NavigationRailDestination(
                      icon: item.icon,
                      selectedIcon: item.selectedIcon,
                      label: Text(item.label),
                    ),
                  )
                  .toList(),
            ),
          Expanded(
            child: RefreshIndicator(onRefresh: load, child: pages[tab]),
          ),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'styleshopZ',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(color: accentInk(context)),
            ),
            Text(
              seller?['shop_name']?.toString() ?? 'Seller studio',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh shop',
            onPressed: loading ? null : load,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Change theme',
            onPressed: state.toggleTheme,
            icon: Icon(
              state.darkMode
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: content,
      bottomNavigationBar: narrow && data != null
          ? NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: (i) => setState(() => tab = i),
              destinations: destinations,
            )
          : null,
    );
  }
}

class SellerOverview extends StatelessWidget {
  const SellerOverview({
    super.key,
    required this.data,
    required this.onProducts,
    required this.onShop,
  });
  final Map<String, dynamic> data;
  final VoidCallback onProducts;
  final VoidCallback onShop;

  @override
  Widget build(BuildContext context) {
    final seller = data['seller'] as Map<String, dynamic>;
    final stats = data['stats'] as Map<String, dynamic>;
    final returns = rows(data['returns']);
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        Text('YOUR SHOP.', style: theme.textTheme.displayMedium),
        const SizedBox(height: 8),
        Text(
          '${seller['shop_name']} · ${_label(seller['status'])}',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        Text(
          seller['status'] == 'approved'
              ? 'Keep your catalogue current and move each demo order through delivery.'
              : 'Your shop is awaiting admin approval. Complete its details now; listings can go live after approval.',
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: seller['status'] == 'approved' ? onProducts : onShop,
          icon: Icon(
            seller['status'] == 'approved'
                ? Icons.inventory_2_outlined
                : Icons.storefront_outlined,
          ),
          label: Text(
            seller['status'] == 'approved'
                ? 'Manage products'
                : 'Complete shop details',
          ),
        ),
        const SizedBox(height: 30),
        Text('At a glance', style: theme.textTheme.headlineLarge),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _Metric('${rows(data['products']).length}', 'Products'),
            _Metric('${stats['item_count'] ?? 0}', 'Order items'),
            _Metric(money(stats['pending_paise']), 'In progress'),
            _Metric(money(stats['delivered_paise']), 'Delivered sales'),
          ],
        ),
        const SizedBox(height: 34),
        Text('Returns', style: theme.textTheme.headlineLarge),
        const SizedBox(height: 6),
        const Text(
          'Refund decisions are made by admins. These are your products only.',
        ),
        const SizedBox(height: 12),
        if (returns.isEmpty)
          const _EmptyLine('No returns to review.')
        else
          ...returns.map(
            (item) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                '${(item['variant_snapshot'] as Map?)?['title'] ?? 'Product'}',
              ),
              subtitle: Text('${item['reason']} · ${_label(item['status'])}'),
              trailing: Text(money(item['amount_paise'])),
            ),
          ),
        const Divider(height: 38),
        Text('Simulated seller ledger', style: theme.textTheme.headlineLarge),
        const SizedBox(height: 8),
        Text(
          'Delivered sales: ${money(stats['delivered_paise'])}. No bank transfer or payout is made.',
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.value, this.label);
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: (MediaQuery.sizeOf(context).width - 50) / 2,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 3),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    ),
  );
}

class _EmptyLine extends StatelessWidget {
  const _EmptyLine(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 22),
    child: Text(message, style: Theme.of(context).textTheme.bodyMedium),
  );
}

class SellerProducts extends StatefulWidget {
  const SellerProducts({
    super.key,
    required this.data,
    required this.onEdit,
    required this.onRefresh,
  });
  final Map<String, dynamic> data;
  final void Function([Map<String, dynamic>?]) onEdit;
  final Future<void> Function() onRefresh;
  @override
  State<SellerProducts> createState() => _SellerProductsState();
}

class _SellerProductsState extends State<SellerProducts> {
  String query = '';
  bool busy = false;

  Future<void> archive(Map<String, dynamic> product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Archive product?'),
        content: Text(
          '${product['title']} will disappear from the shop. Existing orders stay intact.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep it'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Archive'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => busy = true);
    try {
      await ShopScope.of(context).api
          .delete('seller/products', {'id': '${product['id']}'});
      await widget.onRefresh();
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final approved = (widget.data['seller'] as Map)['status'] == 'approved';
    final products = rows(widget.data['products'])
        .where(
          (p) => '${p['title']}'.toLowerCase().contains(query.toLowerCase()),
        )
        .toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        Text(
          'YOUR PRODUCTS.',
          style: Theme.of(context).textTheme.displayMedium,
        ),
        const SizedBox(height: 8),
        const Text(
          'Create listings, edit prices and stock, or hide a product.',
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: approved && !busy ? () => widget.onEdit() : null,
          icon: const Icon(Icons.add),
          label: const Text('Add a product'),
        ),
        if (!approved)
          const Padding(
            padding: EdgeInsets.only(top: 10),
            child: Text(
              'An admin must approve your shop before you can list products.',
            ),
          ),
        const SizedBox(height: 20),
        TextField(
          onChanged: (v) => setState(() => query = v),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            labelText: 'Search your products',
          ),
        ),
        const SizedBox(height: 14),
        if (products.isEmpty)
          _EmptyLine(
            query.isEmpty
                ? 'Your first product belongs here.'
                : 'No product matches that search.',
          ),
        for (final product in products)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 74,
                    height: 84,
                    child: ShopImage(path: product['image_url'] as String?),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${product['title']}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          '${product['brand']} · ${product['category_name']}',
                        ),
                        Text(
                          '${_label(product['status'])} · ${rows(product['variants']).fold<int>(0, (sum, v) => sum + paise(v['stock']))} in stock',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        Row(
                          children: [
                            TextButton(
                              onPressed: busy
                                  ? null
                                  : () => widget.onEdit(product),
                              child: const Text('Edit'),
                            ),
                            TextButton(
                              onPressed: busy ? null : () => archive(product),
                              child: const Text('Archive'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class SellerOrders extends StatefulWidget {
  const SellerOrders({super.key, required this.data, required this.onRefresh});
  final Map<String, dynamic> data;
  final Future<void> Function() onRefresh;
  @override
  State<SellerOrders> createState() => _SellerOrdersState();
}

class _SellerOrdersState extends State<SellerOrders> {
  String? busyId;
  static const next = {
    'placed': 'packed',
    'packed': 'shipped',
    'shipped': 'out_for_delivery',
    'out_for_delivery': 'delivered',
  };

  Future<void> advance(Map<String, dynamic> item) async {
    final id = '${item['id']}';
    final status = next['${item['status']}'];
    if (status == null || busyId != null) return;
    if (!mounted) return;
    setState(() => busyId = id);
    try {
      await ShopScope.of(context).api.post('seller/orders', {
        'orderItemId': id,
        'newStatus': status,
      });
      await widget.onRefresh();
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    }
    if (mounted) setState(() => busyId = null);
  }

  @override
  Widget build(BuildContext context) {
    final items = rows(widget.data['items']);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        Text('DEMO ORDERS.', style: Theme.of(context).textTheme.displayMedium),
        const SizedBox(height: 8),
        const Text(
          'Demo courier creates a test tracking number when you mark an item shipped. No parcel moves.',
        ),
        const SizedBox(height: 18),
        if (items.isEmpty) const _EmptyLine('No order items yet.'),
        for (final item in items)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${(item['variant_snapshot'] as Map?)?['title'] ?? 'Product'}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Order ${'${item['order_id']}'.substring(0, 8)} · Qty ${item['quantity']} · ${money(paise(item['unit_price_paise']) * paise(item['quantity']))}',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Destination: ${(item['address_snapshot'] as Map?)?['name'] ?? '—'}, ${(item['address_snapshot'] as Map?)?['city'] ?? '—'} ${(item['address_snapshot'] as Map?)?['pincode'] ?? ''}',
                  ),
                  Text(
                    'Status: ${_label(item['status'])}${item['tracking_id'] == null ? '' : ' · Demo courier ${item['tracking_id']}'}',
                  ),
                  if (next.containsKey('${item['status']}'))
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: OutlinedButton(
                        onPressed: busyId == null ? () => advance(item) : null,
                        child: Text(
                          busyId == '${item['id']}'
                              ? 'Updating…'
                              : 'Mark ${_label(next['${item['status']}'])}',
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class SellerProfile extends StatefulWidget {
  const SellerProfile({super.key, required this.data, required this.onRefresh});
  final Map<String, dynamic> data;
  final Future<void> Function() onRefresh;
  @override
  State<SellerProfile> createState() => _SellerProfileState();
}

class _SellerProfileState extends State<SellerProfile> {
  final form = GlobalKey<FormState>();
  late final TextEditingController name;
  late final TextEditingController pan;
  late final TextEditingController gstin;
  late String type;
  XFile? document;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    final seller = widget.data['seller'] as Map<String, dynamic>;
    final kyc = seller['kyc_data'] as Map? ?? {};
    name = TextEditingController(text: '${seller['shop_name'] ?? ''}');
    pan = TextEditingController(text: '${kyc['pan'] ?? ''}');
    gstin = TextEditingController(text: '${kyc['gstin'] ?? ''}');
    type = '${kyc['businessType'] ?? 'Individual'}';
    if (!['Individual', 'Partnership', 'Company'].contains(type)) {
      type = 'Individual';
    }
  }

  @override
  void dispose() {
    name.dispose();
    pan.dispose();
    gstin.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (!(form.currentState?.validate() ?? false) || busy) return;
    setState(() => busy = true);
    try {
      final api = ShopScope.of(context).api;
      final existing = (widget.data['seller'] as Map)['kyc_data'] as Map? ?? {};
      final path = document == null
          ? existing['document']
          : await api.uploadImage(document!);
      await api.post('seller/profile', {
        'shopName': name.text.trim(),
        'businessType': type,
        'pan': pan.text.trim(),
        'gstin': gstin.text.trim(),
        'document': ?path,
      });
      await widget.onRefresh();
      if (mounted) shopMessage(context, 'Shop details saved.');
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    return Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
        children: [
          Text(
            'SHOP DETAILS.',
            style: Theme.of(context).textTheme.displayMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Use dummy identity details for this demonstration. Do not upload real financial documents.',
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Shop name'),
            validator: (v) =>
                (v ?? '').trim().length < 2 ? 'Enter a shop name' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: type,
            decoration: const InputDecoration(labelText: 'Business type'),
            items: [
              'Individual',
              'Partnership',
              'Company',
            ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
            onChanged: (v) => setState(() => type = v ?? type),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: pan,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'PAN (optional)'),
            validator: (v) =>
                v == null ||
                    v.isEmpty ||
                    RegExp(r'^[A-Za-z]{5}[0-9]{4}[A-Za-z]$').hasMatch(v.trim())
                ? null
                : 'Enter a valid PAN',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: gstin,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'GSTIN (optional)'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: busy
                ? null
                : () async {
                    final picked = await ImagePicker().pickImage(
                      source: ImageSource.gallery,
                    );
                    if (picked != null && mounted) {
                      setState(() => document = picked);
                    }
                  },
            icon: const Icon(Icons.upload_file),
            label: Text(
              document == null ? 'Add optional KYC image' : document!.name,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Saving…' : 'Save shop details'),
          ),
          const Divider(height: 42),
          Text(
            '${state.user?['name'] ?? ''}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text('${state.user?['email'] ?? ''}'),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: busy
                ? null
                : () async {
                    try {
                      await state.logout();
                    } catch (e) {
                      if (context.mounted) shopMessage(context, '$e');
                    }
                  },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
          const SizedBox(height: 20),
          const Text(
            'styleshopZ is a demonstration shop. No real payments, shipping or payouts take place.',
          ),
        ],
      ),
    );
  }
}

class _VariantInputs {
  _VariantInputs([Map<String, dynamic>? value])
    : id = value?['id']?.toString(),
      sku = TextEditingController(text: '${value?['sku'] ?? ''}'),
      price = TextEditingController(
        text: '${paise(value?['price_paise']) / 100}',
      ),
      mrp = TextEditingController(text: '${paise(value?['mrp_paise']) / 100}'),
      stock = TextEditingController(text: '${value?['stock'] ?? 10}'),
      options = TextEditingController(
        text: (value?['options'] as Map? ?? {}).entries
            .map((entry) => '${entry.key}: ${entry.value}')
            .join(', '),
      );
  final String? id;
  final TextEditingController sku, price, mrp, stock, options;
  void dispose() {
    sku.dispose();
    price.dispose();
    mrp.dispose();
    stock.dispose();
    options.dispose();
  }
}

class SellerProductEditor extends StatefulWidget {
  const SellerProductEditor({
    super.key,
    this.product,
    required this.categories,
  });
  final Map<String, dynamic>? product;
  final List<Map<String, dynamic>> categories;
  @override
  State<SellerProductEditor> createState() => _SellerProductEditorState();
}

class _SellerProductEditorState extends State<SellerProductEditor> {
  final form = GlobalKey<FormState>();
  late final TextEditingController title, brand, description;
  late String? categoryId, status;
  late final List<_VariantInputs> variants;
  XFile? image;
  bool busy = false;
  String? error;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    title = TextEditingController(text: '${p?['title'] ?? ''}');
    brand = TextEditingController(text: '${p?['brand'] ?? ''}');
    description = TextEditingController(text: '${p?['description'] ?? ''}');
    categoryId = p?['category_id']?.toString();
    status = p?['status']?.toString() ?? 'draft';
    variants = rows(p?['variants']).map((v) => _VariantInputs(v)).toList();
    if (variants.isEmpty) variants.add(_VariantInputs());
  }

  @override
  void dispose() {
    title.dispose();
    brand.dispose();
    description.dispose();
    for (final v in variants) {
      v.dispose();
    }
    super.dispose();
  }

  int? rupees(TextEditingController c) {
    final value = double.tryParse(c.text);
    return value == null ? null : (value * 100).round();
  }

  Future<void> save() async {
    if (!(form.currentState?.validate() ?? false) || busy) return;
    if (categoryId == null) {
      setState(() => error = 'Choose a category.');
      return;
    }
    final mapped = <Map<String, dynamic>>[];
    for (final v in variants) {
      final price = rupees(v.price),
          mrp = rupees(v.mrp),
          stock = int.tryParse(v.stock.text);
      if (v.sku.text.trim().length < 3 ||
          price == null ||
          price < 100 ||
          mrp == null ||
          mrp < price ||
          stock == null ||
          stock < 0) {
        setState(
          () => error = 'Each variant needs a SKU, price of at least ₹1, MRP at least the price, and valid stock.',
        );
        return;
      }
      final options = <String, String>{};
      for (final part in v.options.text.split(',')) {
        final split = part.split(':');
        if (split.length > 1 &&
            split.first.trim().isNotEmpty &&
            split.skip(1).join(':').trim().isNotEmpty) {
          options[split.first.trim()] = split.skip(1).join(':').trim();
        }
      }
      mapped.add({
        if (v.id != null) 'id': v.id,
        'sku': v.sku.text.trim(),
        'price_paise': price,
        'mrp_paise': mrp,
        'stock': stock,
        'options': options,
      });
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final api = ShopScope.of(context).api;
      final imageUrl = image == null
          ? (widget.product == null ? null : widget.product!['image_url'])
          : await api.uploadImage(image!);
      await api.post('seller/products', {
        if (widget.product?['id'] != null) 'id': widget.product!['id'],
        'title': title.text.trim(),
        'brand': brand.text.trim(),
        'description': description.text.trim(),
        'categoryId': categoryId,
        'status': status,
        'variants': mapped,
        'imageUrl': ?imageUrl,
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.product == null ? 'New product' : 'Edit product'),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 36),
        children: [
          Text(
            widget.product == null ? 'INTRODUCE A FIND.' : 'KEEP IT CURRENT.',
            style: Theme.of(context).textTheme.displayMedium,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: title,
            maxLength: 150,
            decoration: const InputDecoration(labelText: 'Product title'),
            validator: (v) => (v ?? '').trim().length < 3
                ? 'Enter at least 3 characters'
                : null,
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: brand,
            maxLength: 60,
            decoration: const InputDecoration(labelText: 'Brand'),
            validator: (v) =>
                (v ?? '').trim().length < 2 ? 'Enter a brand' : null,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: widget.categories.any((c) => c['id'] == categoryId)
                ? categoryId
                : null,
            decoration: const InputDecoration(labelText: 'Category'),
            items: widget.categories
                .map(
                  (c) => DropdownMenuItem(
                    value: '${c['id']}',
                    child: Text(
                      '${c['name']}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) => setState(() => categoryId = v),
            validator: (v) => v == null ? 'Choose a category' : null,
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: status,
            decoration: const InputDecoration(labelText: 'Visibility'),
            items: ['draft', 'live', 'hidden']
                .map((v) => DropdownMenuItem(value: v, child: Text(_label(v))))
                .toList(),
            onChanged: (v) => setState(() => status = v),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: description,
            minLines: 4,
            maxLines: 8,
            maxLength: 5000,
            decoration: const InputDecoration(
              labelText: 'Description',
              alignLabelWithHint: true,
            ),
            validator: (v) => (v ?? '').trim().length < 10
                ? 'Write at least 10 characters'
                : null,
          ),
          const SizedBox(height: 8),
          if (widget.product?['image_url'] != null)
            SizedBox(
              height: 150,
              child: ShopImage(path: widget.product!['image_url'] as String?),
            ),
          OutlinedButton.icon(
            onPressed: busy
                ? null
                : () async {
                    final picked = await ImagePicker().pickImage(
                      source: ImageSource.gallery,
                      maxWidth: 1600,
                      imageQuality: 85,
                    );
                    if (picked != null && mounted) {
                      setState(() => image = picked);
                    }
                  },
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: Text(image == null ? 'Choose product photo' : image!.name),
          ),
          const SizedBox(height: 24),
          Text(
            'Variants & inventory',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 6),
          const Text(
            'Each SKU has its own price and stock. Existing variants remain to preserve order history.',
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < variants.length; i++) _variantForm(i),
          if (variants.length < 20)
            TextButton.icon(
              onPressed: () => setState(() => variants.add(_VariantInputs())),
              icon: const Icon(Icons.add),
              label: const Text('Add variant'),
            ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Saving…' : 'Save product'),
          ),
        ],
      ),
    ),
  );

  Widget _variantForm(int index) {
    final v = variants[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Variant ${index + 1}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (v.id == null && variants.length > 1)
                  IconButton(
                    tooltip: 'Remove variant',
                    onPressed: () => setState(() {
                      variants.removeAt(index);
                      v.dispose();
                    }),
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: v.sku,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'SKU'),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: v.price,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Price ₹'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: v.mrp,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'MRP ₹'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: v.stock,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Available stock'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: v.options,
              decoration: const InputDecoration(
                labelText: 'Options (optional)',
                hintText: 'color: Black, size: M',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
