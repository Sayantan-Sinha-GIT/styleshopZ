import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:styleshopz_flutter/screens/support_page.dart';
import 'package:styleshopz_flutter/shop_api.dart';
import 'package:styleshopz_flutter/shop_state.dart';

class SupportFakeApi extends ShopApi {
  final tickets = <Map<String, dynamic>>[];
  final messages = <Map<String, dynamic>>[];
  Map<String, dynamic>? created;
  String status = 'open';

  @override
  Future<void> restore() async {}

  @override
  Future<Map<String, dynamic>> get(
    String path, [
    Map<String, String>? query,
  ]) async {
    if (path == 'auth/me') {
      return {
        'user': {
          'id': 'customer-1',
          'role': 'customer',
          'name': 'Customer',
          'email': 'customer@example.test',
        },
      };
    }
    if (path == 'cart') {
      return {'items': <Map<String, dynamic>>[], 'subtotalPaise': 0};
    }
    if (path == 'orders') {
      return {
        'orders': [
          {'id': '12345678-1234-1234-1234-123456789012', 'status': 'delivered'},
        ],
      };
    }
    if (path == 'support' && query?['id'] != null) {
      return {
        'ticket': {...tickets.first, 'status': status},
        'messages': messages,
      };
    }
    if (path == 'support') {
      return {'tickets': tickets, 'total': tickets.length, 'offset': 0};
    }
    throw StateError('Unexpected GET $path');
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    if (path != 'support') throw StateError('Unexpected POST $path');
    if (body['ticketId'] != null) {
      messages.add({
        'id': 'message-2',
        'sender_name': 'Customer',
        'sender_role': 'customer',
        'message': body['message'],
        'attachment_urls': [],
      });
      return {'ok': true, 'ticketId': body['ticketId']};
    }
    created = body;
    tickets.add({
      'id': 'ticket-1',
      'subject': body['subject'],
      'category': body['category'],
      'status': 'open',
      'order_id': body['orderId'],
    });
    messages.add({
      'id': 'message-1',
      'sender_name': 'Customer',
      'sender_role': 'customer',
      'message': body['message'],
      'attachment_urls': [],
    });
    return {'ok': true, 'ticketId': 'ticket-1'};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    if (path != 'support') throw StateError('Unexpected PATCH $path');
    status = '${body['status']}';
    return {'ok': true};
  }
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets(
    'customer links an order, opens a case, replies and resolves it',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final api = SupportFakeApi();
      final state = ShopState(api);
      await state.initialize();
      await tester.pumpWidget(
        ShopScope(
          state: state,
          child: const MaterialApp(
            home: SupportPage(orderId: '12345678-1234-1234-1234-123456789012'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('HERE TO HELP.'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Subject'),
        'Damaged sample item',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'What happened?'),
        'The screen appears cracked.',
      );
      await tester.scrollUntilVisible(
        find.text('Send to support'),
        240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Send to support'));
      await tester.pumpAndSettle();
      expect(api.created?['category'], 'order_delivery');
      expect(api.created?['orderId'], '12345678-1234-1234-1234-123456789012');
      expect(find.text('Damaged sample item'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Reply to support'),
        'Please review the photo.',
      );
      await tester.scrollUntilVisible(
        find.text('Send reply'),
        240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Send reply'));
      await tester.pumpAndSettle();
      expect(messagesText(api), contains('Please review the photo.'));
      await tester.scrollUntilVisible(
        find.text('Mark resolved'),
        -240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Mark resolved'));
      await tester.pumpAndSettle();
      expect(api.status, 'resolved');
      expect(find.text('Reopen ticket'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      state.dispose();
    },
  );
}

String messagesText(SupportFakeApi api) =>
    api.messages.map((entry) => entry['message']).join(' ');
