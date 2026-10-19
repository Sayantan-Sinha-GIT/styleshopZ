import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'shop_api.dart';
import 'shop_state.dart';
import 'shop_theme.dart';

final _wholeRupees = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final _rupeesWithPaise = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
String money(dynamic value) {
  final amount = paise(value);
  return (amount % 100 == 0 ? _wholeRupees : _rupeesWithPaise).format(amount / 100);
}

class ShopImage extends StatelessWidget {
  const ShopImage({super.key, required this.path, this.fit = BoxFit.cover, this.radius = 12});
  final String? path;
  final BoxFit fit;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHigh;
    if (path == null || path!.isEmpty) {
      return DecoratedBox(decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(radius)), child: const Center(child: Icon(Icons.shopping_bag_outlined, size: 38)));
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Image.network(
        ShopScope.of(context).api.imageUri(path).toString(), fit: fit,
        errorBuilder: (_, _, _) => ColoredBox(color: color, child: const Center(child: Icon(Icons.broken_image_outlined))),
        loadingBuilder: (context, child, progress) => progress == null ? child : ColoredBox(color: color, child: const Center(child: CircularProgressIndicator(strokeWidth: 2))),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Expanded(child: Text(title.toUpperCase(), style: Theme.of(context).textTheme.headlineLarge)),
      if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
    ],
  );
}

class ProductTile extends StatelessWidget {
  const ProductTile({super.key, required this.product, required this.onTap});
  final Map<String, dynamic> product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    final id = '${product['id'] ?? product['product_id']}';
    final price = product['unit_price_paise'] ?? product['price_paise'];
    final mrp = paise(product['mrp_paise']);
    final discounted = mrp > paise(price);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AspectRatio(aspectRatio: 0.9, child: Stack(fit: StackFit.expand, children: [
            ShopImage(path: product['image_url'] as String?),
            if (discounted) Positioned(top: 9, left: 9, child: DecoratedBox(decoration: BoxDecoration(color: const Color(0xFF0E0F11), borderRadius: BorderRadius.circular(20)), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5), child: Text('-${((mrp - paise(price)) * 100 / mrp).round()}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11))))),
            Positioned(top: 5, right: 5, child: IconButton.filledTonal(
              tooltip: state.savedProducts.contains(id) ? 'Remove saved item' : 'Save item',
              onPressed: () => state.toggleSaved(id),
              icon: Icon(state.savedProducts.contains(id) ? Icons.favorite : Icons.favorite_border),
            )),
          ])),
          const SizedBox(height: 10),
          Text('${product['brand'] ?? ''}', style: Theme.of(context).textTheme.bodySmall, maxLines: 1),
          const SizedBox(height: 2),
          Text('${product['title'] ?? ''}', style: Theme.of(context).textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 7, children: [
            Text(money(price), style: Theme.of(context).textTheme.titleMedium?.copyWith(color: accentInk(context))),
            if (discounted) Text(money(mrp), style: Theme.of(context).textTheme.bodySmall?.copyWith(decoration: TextDecoration.lineThrough)),
          ]),
        ]),
      ),
    );
  }
}

class ErrorPane extends StatelessWidget {
  const ErrorPane({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(28),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off_outlined, size: 42), const SizedBox(height: 14),
      Text(message, textAlign: TextAlign.center), const SizedBox(height: 12),
      if (onRetry != null) OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
    ]),
  ));
}

void shopMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
}
