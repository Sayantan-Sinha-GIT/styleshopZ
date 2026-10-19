import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

const shopBaseUrl = 'https://styleshopz.srimantasutapa123.workers.dev';

class ShopApiError implements Exception {
  const ShopApiError(this.message, this.status);
  final String message;
  final int status;
  @override
  String toString() => message;
}

class ShopApi {
  ShopApi({http.Client? client, FlutterSecureStorage? storage})
    : _client = client ?? http.Client(),
      _storage = storage ?? const FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;
  String? _session;

  Future<void> restore() async {
    _session = await _storage.read(key: 'shop_session');
  }

  Uri imageUri(String? path) {
    if (path == null || path.isEmpty) return Uri.parse('$shopBaseUrl/icon.svg');
    return Uri.parse(path.startsWith('http') ? path : '$shopBaseUrl$path');
  }

  Future<Map<String, dynamic>> get(String path, [Map<String, String>? query]) =>
      request('GET', path, query: query);

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) =>
      request('POST', path, body: body);

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) =>
      request('PATCH', path, body: body);

  Future<Map<String, dynamic>> delete(
    String path, [
    Map<String, String>? query,
  ]) => request('DELETE', path, query: query);

  Future<String> uploadImage(XFile file) async {
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
      throw const ShopApiError('Choose an image under 5 MB.', 400);
    }
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$shopBaseUrl/api/uploads'),
    );
    if (_session != null) {
      request.headers['Cookie'] = 'styleshopz_session=$_session';
    }
    request.files.add(
      http.MultipartFile.fromBytes('file', bytes, filename: file.name),
    );
    final response = await http.Response.fromStream(
      await _client.send(request).timeout(const Duration(seconds: 30)),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw ShopApiError(
        '${data['error'] ?? 'Upload failed. Please retry.'}',
        response.statusCode,
      );
    }
    return '${data['url']}';
  }

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$shopBaseUrl/api/$path')
        .replace(queryParameters: query);
    final request = http.Request(method, uri);
    request.headers['Accept'] = 'application/json';
    if (_session != null) {
      request.headers['Cookie'] = 'styleshopz_session=$_session';
    }
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    final streamed = await _client
        .send(request)
        .timeout(const Duration(seconds: 22));
    final response = await http.Response.fromStream(streamed);
    final cookie = response.headers['set-cookie'];
    if (cookie != null && cookie.startsWith('styleshopz_session=')) {
      final value = cookie
          .split(';')
          .first
          .substring('styleshopz_session='.length);
      _session = value.isEmpty ? null : value;
      if (_session == null) {
        await _storage.delete(key: 'shop_session');
      } else {
        await _storage.write(key: 'shop_session', value: _session);
      }
    }
    Map<String, dynamic> data;
    try {
      data = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw ShopApiError(
        'The shop sent an unexpected response. Please try again.',
        response.statusCode,
      );
    }
    if (response.statusCode >= 400) {
      throw ShopApiError(
        '${data['error'] ?? data['message'] ?? 'Something went wrong.'}',
        response.statusCode,
      );
    }
    return data;
  }

  void dispose() => _client.close();
}

int paise(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;

List<Map<String, dynamic>> rows(dynamic value) => value is List
    ? value
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .toList()
    : <Map<String, dynamic>>[];
