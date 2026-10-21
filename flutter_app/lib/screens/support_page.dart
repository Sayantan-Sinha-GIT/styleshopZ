import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_widgets.dart';

const _categories = <String, String>{
  'order_delivery': 'Order or delivery',
  'payment_refund': 'Payment or refund',
  'return_replacement': 'Return or replacement',
  'product_issue': 'Product issue',
  'account_access': 'Account or sign-in',
  'seller_shop': 'Seller shop',
  'technical_issue': 'App or website',
  'other': 'Something else',
};

String _label(String key) => _categories[key] ?? 'Something else';
String _status(dynamic value) => '$value'.replaceAll('_', ' ');

class SupportPage extends StatefulWidget {
  const SupportPage({super.key, this.orderId});
  final String? orderId;

  @override
  State<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends State<SupportPage> {
  final subject = TextEditingController();
  final message = TextEditingController();
  final picker = ImagePicker();
  List<Map<String, dynamic>> tickets = [];
  List<Map<String, dynamic>> orders = [];
  List<XFile> photos = [];
  String category = 'other';
  String? orderId;
  String? error;
  int offset = 0;
  int total = 0;
  bool loaded = false;
  bool loading = false;
  bool sending = false;
  bool creating = false;

  @override
  void initState() {
    super.initState();
    orderId = widget.orderId;
    if (orderId != null) {
      category = 'order_delivery';
      creating = true;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded) {
      loaded = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => load());
    }
  }

  @override
  void dispose() {
    subject.dispose();
    message.dispose();
    super.dispose();
  }

  Future<void> load() async {
    if (!mounted) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final api = ShopScope.of(context).api;
      final isCustomer = ShopScope.of(context).user?['role'] == 'customer';
      final data = await api.get('support', {'offset': '$offset'});
      if (isCustomer) {
        try {
          final orderData = await api.get('orders');
          orders = rows(orderData['orders']);
        } catch (_) {
          // A support case remains possible even when the order list is unavailable.
        }
      }
      if (mounted) {
        setState(() {
          tickets = rows(data['tickets']);
          total = (data['total'] as num?)?.toInt() ?? tickets.length;
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

  Future<void> choosePhotos() async {
    final picked = await picker.pickMultiImage(imageQuality: 85);
    if (!mounted) return;
    if (picked.length > 4) {
      shopMessage(context, 'Choose at most four photos.');
      return;
    }
    setState(() => photos = picked);
  }

  Future<void> create() async {
    if (subject.text.trim().length < 4 || message.text.trim().length < 2) {
      shopMessage(context, 'Add a subject and describe what happened.');
      return;
    }
    setState(() => sending = true);
    try {
      final api = ShopScope.of(context).api;
      final urls = <String>[];
      for (final photo in photos) {
        urls.add(await api.uploadImage(photo, private: true));
      }
      final created = await api.post('support', {
        'category': category,
        'orderId': orderId,
        'subject': subject.text.trim(),
        'message': message.text.trim(),
        'photoUrls': urls,
      });
      if (!mounted) return;
      subject.clear();
      message.clear();
      setState(() {
        creating = false;
        photos = [];
        offset = 0;
      });
      await load();
      if (mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                SupportConversationPage(id: '${created['ticketId']}'),
          ),
        );
        if (mounted) await load();
      }
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Support')),
    body: RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
        children: [
          Text(
            'HERE TO HELP.',
            style: Theme.of(context).textTheme.displayMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Questions, order issues and replies stay here. No real payments or parcels are involved.',
          ),
          const SizedBox(height: 22),
          FilledButton.icon(
            onPressed: sending
                ? null
                : () => setState(() => creating = !creating),
            icon: Icon(creating ? Icons.close : Icons.add),
            label: Text(creating ? 'Close form' : 'New ticket'),
          ),
          if (creating) ...[
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              key: ValueKey(category),
              isExpanded: true,
              initialValue: category,
              decoration: const InputDecoration(labelText: 'Issue type'),
              items: _categories.entries
                  .map(
                    (entry) => DropdownMenuItem(
                      value: entry.key,
                      child: Text(entry.value),
                    ),
                  )
                  .toList(),
              onChanged: sending
                  ? null
                  : (value) => setState(() => category = value ?? 'other'),
            ),
            if (orders.isNotEmpty) ...[
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                key: ValueKey(orderId),
                isExpanded: true,
                initialValue: orderId,
                decoration: const InputDecoration(
                  labelText: 'Related order (optional)',
                ),
                items: [
                  const DropdownMenuItem<String>(
                    value: null,
                    child: Text('No order to link'),
                  ),
                  ...orders.map(
                    (order) => DropdownMenuItem<String>(
                      value: '${order['id']}',
                      child: Text('Order ${'${order['id']}'.substring(0, 8)}'),
                    ),
                  ),
                ],
                onChanged: sending
                    ? null
                    : (value) => setState(() => orderId = value),
              ),
            ],
            const SizedBox(height: 14),
            TextField(
              controller: subject,
              maxLength: 150,
              decoration: const InputDecoration(labelText: 'Subject'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: message,
              maxLength: 2000,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'What happened?'),
            ),
            OutlinedButton.icon(
              onPressed: sending ? null : choosePhotos,
              icon: const Icon(Icons.attach_file),
              label: Text(
                photos.isEmpty
                    ? 'Add photos (optional)'
                    : '${photos.length} photos selected',
              ),
            ),
            const Text(
              'Up to four JPEG, PNG or WebP photos, each under 5 MB. Only you and the owner can view them.',
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: sending ? null : create,
              child: Text(sending ? 'Sending…' : 'Send to support'),
            ),
          ],
          const SizedBox(height: 24),
          Text('Conversations', style: Theme.of(context).textTheme.titleLarge),
          if (loading && tickets.isEmpty)
            const Padding(
              padding: EdgeInsets.all(30),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (error != null) ErrorPane(message: error!, onRetry: load),
          if (!loading && error == null && tickets.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 26),
              child: Text(
                'No conversations yet. Open a ticket when you need a hand.',
              ),
            ),
          ...tickets.map(
            (ticket) => Card(
              child: ListTile(
                title: Text('${ticket['subject']}'),
                subtitle: Text(
                  '${_label('${ticket['category']}')} · ${_status(ticket['status'])}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          SupportConversationPage(id: '${ticket['id']}'),
                    ),
                  );
                  if (context.mounted) await load();
                },
              ),
            ),
          ),
          if (total > 30)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: offset == 0 || loading
                      ? null
                      : () {
                          setState(() => offset -= 30);
                          load();
                        },
                  child: const Text('Previous'),
                ),
                Text('${offset + 1}–${offset + tickets.length} of $total'),
                TextButton(
                  onPressed: offset + 30 >= total || loading
                      ? null
                      : () {
                          setState(() => offset += 30);
                          load();
                        },
                  child: const Text('Next'),
                ),
              ],
            ),
        ],
      ),
    ),
  );
}

class SupportConversationPage extends StatefulWidget {
  const SupportConversationPage({super.key, required this.id});
  final String id;

  @override
  State<SupportConversationPage> createState() =>
      _SupportConversationPageState();
}

class _SupportConversationPageState extends State<SupportConversationPage> {
  final message = TextEditingController();
  final picker = ImagePicker();
  Map<String, dynamic>? ticket;
  List<Map<String, dynamic>> messages = [];
  List<XFile> photos = [];
  String? error;
  bool loaded = false;
  bool busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded) {
      loaded = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => load());
    }
  }

  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final data = await ShopScope.of(context).api
          .get('support', {'id': widget.id});
      if (mounted) {
        setState(() {
          ticket = Map<String, dynamic>.from(data['ticket'] as Map);
          messages = rows(data['messages']);
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
  }

  Future<void> change(String status) async {
    setState(() => busy = true);
    try {
      await ShopScope.of(context).api
          .patch('support', {'ticketId': widget.id, 'status': status});
      await load();
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> reply() async {
    if (message.text.trim().length < 2) return;
    setState(() => busy = true);
    try {
      final api = ShopScope.of(context).api;
      final urls = <String>[];
      for (final photo in photos) {
        urls.add(await api.uploadImage(photo, private: true));
      }
      await api.post('support', {
        'ticketId': widget.id,
        'message': message.text.trim(),
        'photoUrls': urls,
      });
      message.clear();
      photos = [];
      await load();
    } catch (e) {
      if (mounted) shopMessage(context, '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = ticket;
    final closed =
        current != null && ['resolved', 'closed'].contains(current['status']);
    return Scaffold(
      appBar: AppBar(title: const Text('Conversation')),
      body: error != null
          ? ErrorPane(message: error!, onRetry: load)
          : current == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  '${current['subject']}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  '${_label('${current['category']}')} · ${_status(current['status'])}',
                ),
                if (current['order_id'] != null)
                  Text('Linked order ${current['order_id']}'),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  children: [
                    if (closed)
                      OutlinedButton(
                        onPressed: busy ? null : () => change('open'),
                        child: const Text('Reopen ticket'),
                      ),
                    if (!closed)
                      OutlinedButton(
                        onPressed: busy ? null : () => change('resolved'),
                        child: const Text('Mark resolved'),
                      ),
                    if (current['status'] != 'closed')
                      TextButton(
                        onPressed: busy ? null : () => change('closed'),
                        child: const Text('Close ticket'),
                      ),
                  ],
                ),
                const Divider(height: 30),
                ...messages.map(
                  (entry) => Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${entry['sender_name']} · ${entry['sender_role']}',
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                          const SizedBox(height: 8),
                          Text('${entry['message']}'),
                          if (entry['attachment_urls'] is List)
                            ...(entry['attachment_urls'] as List)
                                .whereType<String>()
                                .map(
                                  (path) => Padding(
                                    padding: const EdgeInsets.only(top: 10),
                                    child: FutureBuilder<Uint8List>(
                                      future: ShopScope.of(context).api
                                          .privateImageBytes(path),
                                      builder: (context, snapshot) =>
                                          snapshot.hasData
                                          ? Image.memory(
                                              snapshot.data!,
                                              width: 160,
                                              height: 160,
                                              fit: BoxFit.cover,
                                            )
                                          : snapshot.hasError
                                          ? const Text('Photo unavailable')
                                          : const SizedBox(
                                              width: 40,
                                              height: 40,
                                              child:
                                                  CircularProgressIndicator(),
                                            ),
                                    ),
                                  ),
                                ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (closed)
                  const Padding(
                    padding: EdgeInsets.only(top: 16),
                    child: Text('Reopen this conversation before replying.'),
                  ),
                if (!closed) ...[
                  const SizedBox(height: 18),
                  TextField(
                    controller: message,
                    maxLength: 2000,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Reply to support',
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () async {
                            final selected = await picker.pickMultiImage(
                              imageQuality: 85,
                            );
                            if (!context.mounted) return;
                            if (selected.length > 4) {
                              shopMessage(
                                context,
                                'Choose at most four photos.',
                              );
                              return;
                            }
                            setState(() => photos = selected);
                          },
                    icon: const Icon(Icons.attach_file),
                    label: Text(
                      photos.isEmpty
                          ? 'Add photos'
                          : '${photos.length} photos selected',
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: busy ? null : reply,
                    child: Text(busy ? 'Sending…' : 'Send reply'),
                  ),
                ],
              ],
            ),
    );
  }
}
