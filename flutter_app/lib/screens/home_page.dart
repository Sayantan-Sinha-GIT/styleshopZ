import 'dart:async';

import 'package:flutter/material.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_theme.dart';
import '../shop_widgets.dart';
import 'product_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.active, required this.onBrowse, required this.onCart});
  final bool active;
  final void Function({String? category}) onBrowse;
  final VoidCallback onCart;
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final pageController = PageController();
  Timer? timer;
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> banners = [];
  List<Map<String, dynamic>> products = [];
  List<Map<String, dynamic>> categories = [];
  int currentBanner = 0;
  bool initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!initialized) {
      initialized = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => load());
    }
    timer ??= Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted || !widget.active || banners.length < 2 || MediaQuery.disableAnimationsOf(context)) return;
      pageController.animateToPage((currentBanner + 1) % banners.length, duration: const Duration(milliseconds: 520), curve: Curves.easeInOutCubic);
    });
  }

  Future<void> load() async {
    if (!mounted) return;
    setState(() { loading = true; error = null; });
    try {
      final api = ShopScope.of(context).api;
      final results = await Future.wait([api.get('banners'), api.get('products', {'limit': '8', 'featured': 'true'}), api.get('categories')]);
      if (!mounted) return;
      setState(() {
        banners = rows(results[0]['banners']);
        products = rows(results[1]['products']);
        categories = rows(results[2]['tree']);
        loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { error = '$e'; loading = false; });
    }
  }

  @override
  void dispose() { timer?.cancel(); pageController.dispose(); super.dispose(); }

  String cover(String category) {
    final name = category.toLowerCase();
    if (name.contains('electron')) return '/photos/categories/electronics.webp';
    if (name.contains('fashion')) return '/photos/categories/fashion.webp';
    if (name.contains('home')) return '/photos/categories/home-kitchen.webp';
    if (name.contains('beauty')) return '/photos/categories/beauty-health.webp';
    return '/photos/categories/sports-fitness.webp';
  }

  void openProduct(Map<String, dynamic> product) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductPage(id: '${product['id']}')));

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
    final cardWidth = (width - 40 - (columns - 1) * 12) / columns;
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 10, 20, 24), children: [
        Text('DEMO SHOP · NO REAL PAYMENTS OR DELIVERIES', style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.7, color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 24),
        Text('FIND IT. BUY IT.', style: theme.textTheme.displayLarge?.copyWith(fontSize: width < 370 ? 49 : 57)),
        Text('Watch it come.', style: theme.textTheme.headlineLarge?.copyWith(fontStyle: FontStyle.italic, color: accentInk(context), fontSize: 31)),
        const SizedBox(height: 14),
        Text('Tech, style and everyday essentials. Find a good fit, then follow your demo order.', style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 18),
        Align(alignment: Alignment.centerLeft, child: FilledButton.icon(onPressed: () => widget.onBrowse(), icon: const Icon(Icons.arrow_outward), label: const Text('Explore the shop'))),
        const SizedBox(height: 26),
        if (loading) const SizedBox(height: 280, child: Center(child: CircularProgressIndicator()))
        else if (error != null) SizedBox(height: 250, child: ErrorPane(message: error!, onRetry: load))
        else ...[
          if (banners.isNotEmpty) ...[
            SizedBox(height: width < 600 ? 300 : 420, child: PageView.builder(
              controller: pageController,
              itemCount: banners.length,
              onPageChanged: (index) => setState(() => currentBanner = index),
              itemBuilder: (context, index) {
                final banner = banners[index];
                return Stack(fit: StackFit.expand, children: [
                  ShopImage(path: banner['image_url'] as String?, radius: 18),
                  Positioned(left: 12, top: 12, child: Chip(label: Text('${banner['title'] ?? 'Featured collection'}'), avatar: const Icon(Icons.auto_awesome_outlined, size: 18))),
                  Positioned(left: 12, right: 12, bottom: 12, child: FilledButton.tonalIcon(
                    onPressed: () => widget.onBrowse(), icon: const Icon(Icons.arrow_outward), label: const Text('Explore collection'),
                  )),
                ]);
              },
            )),
            const SizedBox(height: 10),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(banners.length, (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 250), margin: const EdgeInsets.symmetric(horizontal: 3),
              width: index == currentBanner ? 24 : 7, height: 7,
              decoration: BoxDecoration(color: index == currentBanner ? amber : theme.colorScheme.outline, borderRadius: BorderRadius.circular(8)),
            ))),
          ],
          const SizedBox(height: 36),
          SectionTitle('Good finds. Better prices.', action: 'See all', onAction: () => widget.onBrowse()),
          const SizedBox(height: 16),
          Wrap(spacing: 12, runSpacing: 24, children: products.map((product) => SizedBox(width: cardWidth, child: ProductTile(product: product, onTap: () => openProduct(product)))).toList()),
          const SizedBox(height: 40),
          const SectionTitle('Every shelf. A new possibility.'),
          const SizedBox(height: 18),
          SizedBox(height: 205, child: ListView.separated(
            scrollDirection: Axis.horizontal, itemCount: categories.length, separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final category = categories[index];
              return SizedBox(width: width < 600 ? 230 : 280, child: InkWell(
                onTap: () => widget.onBrowse(category: '${category['slug']}'),
                child: Stack(fit: StackFit.expand, children: [
                  ShopImage(path: cover('${category['name']}')),
                  Positioned(left: 10, right: 10, bottom: 10, child: DecoratedBox(
                    decoration: BoxDecoration(color: charcoal.withValues(alpha: 0.88), borderRadius: BorderRadius.circular(10)),
                    child: Padding(padding: const EdgeInsets.all(10), child: Row(children: [Expanded(child: Text('${category['name']}', maxLines: 2, style: theme.textTheme.titleMedium?.copyWith(color: Colors.white))), const Icon(Icons.arrow_outward, color: amber)])),
                  )),
                ]),
              ));
            },
          )),
        ],
        const SizedBox(height: 30),
        Text('A demonstration shop. Browse freely; checkout and delivery are simulated.', style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
      ]),
    );
  }
}
