import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../google_auth.dart';
import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_widgets.dart';
import 'address_page.dart';
import 'cart_page.dart';
import 'product_page.dart';

String _status(dynamic value) => '$value'.split('_').map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}').join(' ');
String _localDate(dynamic value) {
  final date = DateTime.tryParse('$value');
  return date == null ? '$value' : DateFormat('d MMM y · h:mm a').format(date.toLocal());
}

class AccountPage extends StatelessWidget {
  const AccountPage({super.key});
  @override
  Widget build(BuildContext context) {
    final state = ShopScope.of(context);
    final theme = Theme.of(context);
    return ListView(padding: const EdgeInsets.fromLTRB(20, 18, 20, 30), children: [
      Text('YOUR CORNER.', style: theme.textTheme.displayMedium),
      const SizedBox(height: 10),
      if (state.user == null) ...[
        const Text('Sign in to keep your bag, addresses and demo orders together.'),
        const SizedBox(height: 24),
        FilledButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginPage())), child: const Text('Sign in')),
        const SizedBox(height: 10),
        OutlinedButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginPage(register: true))), child: const Text('Create an account')),
      ] else ...[
        Text('${state.user!['name']}', style: theme.textTheme.titleLarge),
        Text('${state.user!['email']}', style: theme.textTheme.bodyMedium),
        const SizedBox(height: 8),
        if (state.user!['email_verified_at'] == null) ActionChip(label: const Text('Verify email'), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerifyEmailPage()))),
        const SizedBox(height: 24),
        ListTile(leading: const Icon(Icons.local_shipping_outlined), title: const Text('Your orders'), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersPage()))),
        ListTile(leading: const Icon(Icons.place_outlined), title: const Text('Saved addresses'), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddressesPage()))),
        ListTile(leading: const Icon(Icons.auto_awesome_outlined), title: const Text('Shopping assistant'), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AssistantPage()))),
      ],
      const Divider(height: 36),
      ListTile(leading: const Icon(Icons.description_outlined), title: const Text('Terms and conditions'), trailing: const Icon(Icons.open_in_new), onTap: () => launchUrl(Uri.parse('$shopBaseUrl/terms'), mode: LaunchMode.externalApplication)),
      ListTile(leading: const Icon(Icons.privacy_tip_outlined), title: const Text('Privacy policy'), trailing: const Icon(Icons.open_in_new), onTap: () => launchUrl(Uri.parse('$shopBaseUrl/privacy'), mode: LaunchMode.externalApplication)),
      if (state.user != null) ...[
        const SizedBox(height: 18),
        OutlinedButton.icon(onPressed: () async { try { await state.logout(); } catch (e) { if (context.mounted) shopMessage(context, '$e'); } }, icon: const Icon(Icons.logout), label: const Text('Sign out')),
      ],
      const SizedBox(height: 20),
      Text('styleshopZ is a demonstration shop. There are no real payments or deliveries.', style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
    ]);
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, this.register = false, this.nextCheckout = false});
  final bool register;
  final bool nextCheckout;
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool register = false;
  bool busy = false;
  String? error;

  @override
  void initState() { super.initState(); register = widget.register; }
  @override
  void dispose() { name.dispose(); email.dispose(); password.dispose(); super.dispose(); }

  Future<void> submit() async {
    if (!(form.currentState?.validate() ?? false) || busy) return;
    setState(() { busy = true; error = null; });
    try {
      final state = ShopScope.of(context);
      if (register) { await state.register(name.text.trim(), email.text.trim(), password.text); }
      else { await state.login(email.text.trim(), password.text); }
      if (!mounted) return;
      if (state.guestMergeFailed) shopMessage(context, 'Signed in, but some bag items could not be moved to your account. They remain saved on this device.');
      if (register && state.user?['email_verified_at'] == null) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => VerifyEmailPage(nextCheckout: widget.nextCheckout)));
      } else if (widget.nextCheckout) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const CheckoutPage()));
      } else { Navigator.pop(context); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => busy = false);
  }

  Future<void> google() async {
    if (busy) return;
    final state = ShopScope.of(context);
    setState(() { busy = true; error = null; });
    try {
      await GoogleShopAuth.signIn(state);
      if (!mounted) return;
      if (state.guestMergeFailed) shopMessage(context, 'Signed in, but some bag items could not be moved to your account. They remain saved on this device.');
      if (widget.nextCheckout) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const CheckoutPage()));
      } else {
        Navigator.pop(context);
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(appBar: AppBar(title: Text(register ? 'Create account' : 'Sign in')), body: Form(key: form, child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 30), children: [
      Text(register ? 'JOIN THE SHOP.' : 'WELCOME BACK.', style: theme.textTheme.displayMedium),
      const SizedBox(height: 10), Text(register ? 'Create a customer account for your bag and demo orders.' : 'Pick up where you left off.'),
      const SizedBox(height: 28),
      if (register) Padding(padding: const EdgeInsets.only(bottom: 12), child: TextFormField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Your name'), validator: (v) => (v ?? '').trim().length < 2 ? 'Enter your name' : null)),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: TextFormField(controller: email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(labelText: 'Email address'), validator: (v) => !(v ?? '').contains('@') ? 'Enter a valid email' : null)),
      TextFormField(controller: password, obscureText: true, autofillHints: [register ? AutofillHints.newPassword : AutofillHints.password], decoration: const InputDecoration(labelText: 'Password'), validator: (v) => (v ?? '').length < 8 ? 'Use at least 8 characters' : null),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: theme.colorScheme.error))),
      const SizedBox(height: 20),
      FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Please wait…' : register ? 'Create account' : 'Sign in')),
      const SizedBox(height: 12),
      OutlinedButton.icon(onPressed: busy ? null : google, icon: const Icon(Icons.account_circle_outlined), label: const Text('Continue with Google')),
      const SizedBox(height: 6),
      TextButton(onPressed: () => setState(() { register = !register; error = null; }), child: Text(register ? 'Already have an account? Sign in' : 'New here? Create an account')),
      if (!register) TextButton(onPressed: busy ? null : () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ResetPasswordPage())), child: const Text('Forgot your password?')),
    ])));
  }
}

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key});
  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final email = TextEditingController();
  final code = TextEditingController();
  final password = TextEditingController();
  bool codeRequested = false;
  bool busy = false;
  String? message;
  String? error;

  @override
  void dispose() { email.dispose(); code.dispose(); password.dispose(); super.dispose(); }

  Future<void> submit() async {
    if (busy) return;
    if (!email.text.contains('@')) { setState(() => error = 'Enter your email address.'); return; }
    if (codeRequested && (code.text.trim().length != 8 || password.text.length < 8)) {
      setState(() => error = 'Enter the eight-digit code and a password of at least eight characters.');
      return;
    }
    setState(() { busy = true; error = null; message = null; });
    try {
      final response = await ShopScope.of(context).api.post('auth/email-reset', {
        'email': email.text.trim(),
        if (codeRequested) 'code': code.text.trim(),
        if (codeRequested) 'password': password.text,
      });
      if (!mounted) return;
      if (codeRequested) {
        shopMessage(context, '${response['message'] ?? 'Password updated. Sign in now.'}');
        Navigator.pop(context);
      } else {
        setState(() { codeRequested = true; message = '${response['message'] ?? 'Check your inbox for a reset code.'}'; });
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Reset password')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      Text('BACK IN A MOMENT.', style: Theme.of(context).textTheme.displayMedium),
      const SizedBox(height: 10),
      const Text('We will email an eight-digit code. It expires after ten minutes.'),
      const SizedBox(height: 22),
      TextField(controller: email, enabled: !codeRequested && !busy, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address')),
      if (codeRequested) ...[
        const SizedBox(height: 12),
        TextField(controller: code, keyboardType: TextInputType.number, maxLength: 8, decoration: const InputDecoration(labelText: 'Reset code')),
        const SizedBox(height: 12),
        TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'New password')),
      ],
      if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!)),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      const SizedBox(height: 18),
      FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Please wait…' : codeRequested ? 'Update password' : 'Email me a code')),
      if (codeRequested) TextButton(onPressed: busy ? null : () => setState(() { codeRequested = false; code.clear(); }), child: const Text('Request a new code')),
    ]),
  );
}

class VerifyEmailPage extends StatefulWidget {
  const VerifyEmailPage({super.key, this.nextCheckout = false});
  final bool nextCheckout;
  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  final code = TextEditingController();
  String? message;
  bool busy = false;
  @override
  void dispose() { code.dispose(); super.dispose(); }
  Future<void> send([bool verify = false]) async {
    setState(() { busy = true; message = null; });
    try {
      final state = ShopScope.of(context);
      final api = state.api;
      final result = await api.post('auth/verify-email', verify ? {'code': code.text.trim()} : {});
      if (!mounted) return;
      if (verify) {
        await state.refreshUser();
        if (mounted) {
          if (widget.nextCheckout) { Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const CheckoutPage())); }
          else { Navigator.pop(context); }
        }
      } else {
        setState(() => message = '${result['message'] ?? 'Check your inbox for the code.'}');
      }
    } catch (e) { if (mounted) setState(() => message = '$e'); }
    if (mounted) setState(() => busy = false);
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Verify email')), body: ListView(padding: const EdgeInsets.all(20), children: [
    const Text('Enter the eight-digit code sent to your email. It expires after ten minutes.'),
    const SizedBox(height: 18), TextField(controller: code, keyboardType: TextInputType.number, maxLength: 8, decoration: const InputDecoration(labelText: 'Verification code')),
    const SizedBox(height: 12), FilledButton(onPressed: busy ? null : () => send(true), child: const Text('Verify email')),
    TextButton(onPressed: busy ? null : () => send(), child: const Text('Send a new code')),
    if (message != null) Text(message!),
  ]));
}

class AddressesPage extends StatefulWidget {
  const AddressesPage({super.key});
  @override
  State<AddressesPage> createState() => _AddressesPageState();
}

class _AddressesPageState extends State<AddressesPage> {
  List<Map<String, dynamic>> addresses = [];
  bool loading = true;
  String? error;
  @override
  void didChangeDependencies() { super.didChangeDependencies(); if (loading && addresses.isEmpty) WidgetsBinding.instance.addPostFrameCallback((_) => load()); }
  Future<void> load() async {
    try { final data = await ShopScope.of(context).api.get('profile'); if (mounted) setState(() { addresses = rows(data['addresses']); loading = false; error = null; }); }
    catch (e) { if (mounted) setState(() { error = '$e'; loading = false; }); }
  }
  Future<void> edit([Map<String, dynamic>? initial]) async {
    final result = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => AddressPage(initial: initial)));
    if (result != null) await load();
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Saved addresses')), body: loading ? const Center(child: CircularProgressIndicator()) : error != null ? ErrorPane(message: error!, onRetry: load) : ListView(padding: const EdgeInsets.all(20), children: [
    if (addresses.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Text('No addresses yet. Add one when you are ready to place a demo order.')),
    ...addresses.map((a) => Card(child: ListTile(title: Text('${a['name']} · ${a['line1']}'), subtitle: Text('${a['city']}, ${a['state']} ${a['pincode']}'), trailing: const Icon(Icons.edit_outlined), onTap: () => edit(a)))),
    const SizedBox(height: 16), FilledButton.icon(onPressed: () => edit(), icon: const Icon(Icons.add), label: const Text('Add address')),
  ]));
}

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});
  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  List<Map<String, dynamic>> orders = [];
  bool loading = true;
  String? error;
  @override
  void didChangeDependencies() { super.didChangeDependencies(); if (loading && orders.isEmpty) WidgetsBinding.instance.addPostFrameCallback((_) => load()); }
  Future<void> load() async {
    try { final data = await ShopScope.of(context).api.get('orders'); if (mounted) setState(() { orders = rows(data['orders']); loading = false; error = null; }); }
    catch (e) { if (mounted) setState(() { error = '$e'; loading = false; }); }
  }
  Future<void> openOrder(String id) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailPage(id: id)));
    if (mounted) await load();
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Your orders')), body: loading ? const Center(child: CircularProgressIndicator()) : error != null ? ErrorPane(message: error!, onRetry: load) : RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(20), children: [
    if (orders.isEmpty) const Padding(padding: EdgeInsets.all(30), child: Text('No demo orders yet. Your order journey will appear here.')),
    ...orders.map((o) => Card(child: ListTile(
      title: Text('Order ${'${o['id']}'.substring(0, 8)} · ${money(o['total_paise'])}'),
      subtitle: Text('${_status(o['status'])} · ${rows(o['items']).length} items'),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => openOrder('${o['id']}'),
    ))),
  ])));
}

class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key, required this.id});
  final String id;
  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  Map<String, dynamic>? detail;
  String? error;
  @override
  void didChangeDependencies() { super.didChangeDependencies(); if (detail == null && error == null) WidgetsBinding.instance.addPostFrameCallback((_) => load()); }
  Future<void> load() async {
    try { final data = await ShopScope.of(context).api.get('orders/${widget.id}'); if (mounted) setState(() => detail = data); }
    catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> cancel() async {
    final confirm = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Cancel this order?'),
      content: const Text('This demo order will be cancelled and its items returned to stock.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Keep order')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Cancel order')),
      ],
    ));
    if (confirm != true || !mounted) return;
    try { await ShopScope.of(context).api.post('orders/${widget.id}/cancel', {'reason': 'Cancelled by customer'}); await load(); if (mounted) shopMessage(context, 'Order cancelled'); }
    catch (e) { if (mounted) shopMessage(context, '$e'); }
  }
  @override
  Widget build(BuildContext context) {
    final order = detail?['order'] as Map?;
    final events = rows(detail?['events']);
    return Scaffold(appBar: AppBar(title: const Text('Order details')), body: error != null ? ErrorPane(message: error!, onRetry: load) : order == null ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(20), children: [
      Text('${order['status']}'.toUpperCase(), style: Theme.of(context).textTheme.displayMedium),
      const SizedBox(height: 8), SelectableText('Reference ${order['id']}'),
      const SizedBox(height: 14), Text('Total ${money(order['total_paise'])}', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 22), Text('Items', style: Theme.of(context).textTheme.titleLarge),
      ...rows(detail?['items']).map((item) { final snapshot = item['variant_snapshot'] as Map?; return ListTile(title: Text('${snapshot?['title'] ?? 'Product'}'), subtitle: Text('${_status(item['status'])} · Qty ${item['quantity']}')); }),
      const SizedBox(height: 18), Text('Journey', style: Theme.of(context).textTheme.titleLarge),
      ...events.map((event) => ListTile(leading: const Icon(Icons.radio_button_checked), title: Text(_status(event['status'])), subtitle: Text(_localDate(event['created_at'])))),
      if (['placed', 'packed', 'awaiting_payment'].contains(order['status'])) Padding(padding: const EdgeInsets.only(top: 18), child: OutlinedButton(onPressed: cancel, child: const Text('Cancel order'))),
      const SizedBox(height: 20), const Text('Demo fulfilment is simulated. No parcel is shipped.'),
    ]));
  }
}

class AssistantPage extends StatefulWidget {
  const AssistantPage({super.key});
  @override
  State<AssistantPage> createState() => _AssistantPageState();
}

class _AssistantPageState extends State<AssistantPage> {
  final input = TextEditingController();
  final conversationScroll = ScrollController();
  final latestMessageKey = GlobalKey();
  List<Map<String, dynamic>> messages = [];
  bool busy = false;
  bool loaded = false;
  String? error;
  @override
  void didChangeDependencies() { super.didChangeDependencies(); if (!loaded) { loaded = true; WidgetsBinding.instance.addPostFrameCallback((_) => load()); } }
  @override
  void dispose() { input.dispose(); conversationScroll.dispose(); super.dispose(); }
  void showLatest() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (!mounted || !conversationScroll.hasClients) return;
    conversationScroll.jumpTo(conversationScroll.position.maxScrollExtent);
    WidgetsBinding.instance.addPostFrameCallback((_) {
    final target = latestMessageKey.currentContext;
    if (target != null) Scrollable.ensureVisible(target, alignment: 0.04, duration: const Duration(milliseconds: 250), curve: Curves.easeOutCubic);
    });
  });
  Future<void> load() async {
    try { final data = await ShopScope.of(context).api.get('assistant/chat'); if (mounted) { setState(() => messages = rows(data['messages'])); showLatest(); } }
    catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || busy) return;
    input.clear(); setState(() { busy = true; error = null; messages.add({'role': 'user', 'content': text}); });
    showLatest();
    try { final data = await ShopScope.of(context).api.post('assistant/chat', {'message': text}); if (mounted) { setState(() => messages.add({'role': 'assistant', 'content': data['reply'], 'results': data['results'], 'actionProposal': data['actionProposal']})); showLatest(); } }
    catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => busy = false);
  }
  Future<void> confirm(Map<String, dynamic> message) async {
    final proposal = message['actionProposal'] as Map?;
    final token = proposal?['confirmation'];
    if (token == null || busy) return;
    setState(() { busy = true; error = null; });
    try {
      final state = ShopScope.of(context);
      final data = await state.api.post('assistant/chat', {'confirmation': token});
      await state.refreshCart();
      if (mounted) { setState(() { message.remove('actionProposal'); messages.add({'role': 'assistant', 'content': data['reply']}); }); showLatest(); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => busy = false);
  }
  Widget bubble(Map<String, dynamic> message) {
    final isUser = message['role'] == 'user';
    final theme = Theme.of(context);
    final results = rows(message['results']);
    final proposal = message['actionProposal'] as Map?;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 520), child: Card(
        color: isUser ? theme.colorScheme.primaryContainer : null,
        child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          MarkdownBody(data: '${message['content'] ?? ''}', selectable: true, styleSheet: MarkdownStyleSheet.fromTheme(theme)),
          ...results.where((result) => result['type'] == 'products').expand((result) => rows(result['items']).take(4)).map((product) => Padding(
            padding: const EdgeInsets.only(top: 9),
            child: OutlinedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductPage(id: '${product['id']}'))),
              child: Row(children: [
                Expanded(child: Text('${product['title'] ?? 'View product'}', maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.left)),
                const SizedBox(width: 8), Text(money(product['price_paise'])),
                const SizedBox(width: 3), const Icon(Icons.arrow_outward, size: 16),
              ]),
            ),
          )),
          if (proposal != null) Padding(padding: const EdgeInsets.only(top: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${proposal['prompt'] ?? 'Confirm this change?'}', style: theme.textTheme.bodyMedium),
            const SizedBox(height: 7),
            FilledButton.icon(onPressed: busy ? null : () => confirm(message), icon: const Icon(Icons.check), label: Text('${proposal['buttonLabel'] ?? 'Confirm'}')),
          ])),
        ])),
      )),
    );
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Shopping assistant')), body: Column(children: [
    Expanded(child: ListView(controller: conversationScroll, padding: const EdgeInsets.all(20), children: [
      if (messages.isEmpty) Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('GOOD TASTE. GOOD ANSWERS.', style: Theme.of(context).textTheme.displayMedium),
        const SizedBox(height: 8), const Text('Ask for products, offers or help with your demo orders.'),
        const SizedBox(height: 16),
        ...['Find a good pair of headphones', 'Show me the latest offers', 'How does demo delivery work?'].map((prompt) => Padding(
          padding: const EdgeInsets.only(bottom: 8), child: ActionChip(label: Text(prompt), onPressed: () { input.text = prompt; send(); }),
        )),
      ]),
      ...messages.asMap().entries.map((entry) => KeyedSubtree(key: entry.key == messages.length - 1 ? latestMessageKey : null, child: bubble(entry.value))),
      if (busy) const Center(child: CircularProgressIndicator()),
      if (error != null) Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
    ])),
    SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 10), child: Row(children: [
      Expanded(child: TextField(controller: input, maxLines: 2, minLines: 1, onSubmitted: (_) => send(), decoration: const InputDecoration(hintText: 'Ask about the shop…'))),
      IconButton.filled(tooltip: 'Send message', onPressed: busy ? null : send, icon: const Icon(Icons.send)),
    ]))),
  ]));
}
