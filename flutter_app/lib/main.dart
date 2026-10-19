import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/account_page.dart';
import 'screens/cart_page.dart';
import 'screens/home_page.dart';
import 'screens/search_page.dart';
import 'shop_api.dart';
import 'shop_state.dart';
import 'shop_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = ShopState(ShopApi());
  await state.initialize();
  runApp(ShopScope(state: state, child: ShopApp(state: state)));
}

class ShopApp extends StatelessWidget {
  const ShopApp({super.key, required this.state});
  final ShopState state;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: state,
    builder: (context, _) {
      final dark = state.darkMode;
      SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
        statusBarColor: dark ? charcoal : const Color(0xFFECEDEF),
        statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: dark ? charcoal : const Color(0xFFECEDEF),
        systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      ));
      return MaterialApp(
        title: 'styleshopZ',
        debugShowCheckedModeBanner: false,
        theme: shopTheme(Brightness.light),
        darkTheme: shopTheme(Brightness.dark),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        home: const ShopShell(),
      );
    },
  );
}

class ShopShell extends StatefulWidget {
  const ShopShell({super.key});
  @override
  State<ShopShell> createState() => _ShopShellState();
}

class _ShopShellState extends State<ShopShell> {
  int tab = 0;
  final searchKey = GlobalKey<SearchPageState>();

  void openSearch({String? category}) {
    setState(() => tab = 1);
    if (category != null) WidgetsBinding.instance.addPostFrameCallback((_) => searchKey.currentState?.selectCategory(category));
  }

  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    final theme = Theme.of(context);
    final narrow = MediaQuery.sizeOf(context).width < 600;
    final pages = [
      HomePage(active: tab == 0, onBrowse: openSearch, onCart: () => setState(() => tab = 3)),
      SearchPage(key: searchKey),
      const SavedPage(),
      const CartPage(),
      const AccountPage(),
    ];
    final destinations = <NavigationDestination>[
      const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
      const NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
      const NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Saved'),
      NavigationDestination(icon: Badge(isLabelVisible: state.cartCount > 0, label: Text('${state.cartCount}'), child: const Icon(Icons.shopping_bag_outlined)), label: 'Bag'),
      const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'You'),
    ];
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          DecoratedBox(decoration: BoxDecoration(color: amber, borderRadius: BorderRadius.circular(10)), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 9, vertical: 5), child: Text('Sz', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: charcoal)))),
          const SizedBox(width: 9),
          Text('styleshopZ', style: theme.textTheme.titleLarge?.copyWith(color: state.darkMode ? amber : charcoal, fontWeight: FontWeight.w800)),
        ]),
        actions: [
          IconButton(tooltip: 'Change theme', onPressed: state.toggleTheme, icon: Icon(state.darkMode ? Icons.light_mode_outlined : Icons.dark_mode_outlined)),
          if (tab != 3) IconButton(tooltip: 'Open bag', onPressed: () => setState(() => tab = 3), icon: Badge(isLabelVisible: state.cartCount > 0, label: Text('${state.cartCount}'), child: const Icon(Icons.shopping_bag_outlined))),
          const SizedBox(width: 12),
        ],
      ),
      body: Row(children: [
        if (!narrow) NavigationRail(
          selectedIndex: tab, onDestinationSelected: (i) => setState(() => tab = i),
          destinations: destinations.map((d) => NavigationRailDestination(icon: d.icon, selectedIcon: d.selectedIcon, label: Text(d.label))).toList(),
        ),
        Expanded(child: IndexedStack(index: tab, children: pages)),
      ]),
      bottomNavigationBar: narrow ? NavigationBar(
        selectedIndex: tab, onDestinationSelected: (i) => setState(() => tab = i), destinations: destinations,
      ) : null,
    );
  }
}
