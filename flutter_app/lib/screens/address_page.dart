import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../shop_api.dart';
import '../shop_state.dart';
import '../shop_widgets.dart';

class AddressPage extends StatefulWidget {
  const AddressPage({super.key, this.initial});
  final Map<String, dynamic>? initial;
  @override
  State<AddressPage> createState() => _AddressPageState();
}

class _AddressPageState extends State<AddressPage> {
  final form = GlobalKey<FormState>();
  final placeQuery = TextEditingController();
  final fields = <String, TextEditingController>{};
  Timer? debounce;
  List<Map<String, dynamic>> suggestions = [];
  double? lat;
  double? lng;
  bool saving = false;
  String? error;

  @override
  void initState() {
    super.initState();
    for (final name in ['name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode']) {
      fields[name] = TextEditingController(text: '${widget.initial?[name] ?? ''}');
    }
    lat = double.tryParse('${widget.initial?['latitude'] ?? ''}');
    lng = double.tryParse('${widget.initial?['longitude'] ?? ''}');
  }

  @override
  void dispose() { debounce?.cancel(); placeQuery.dispose(); for (final controller in fields.values) { controller.dispose(); } super.dispose(); }

  void searchPlaces(String value) {
    debounce?.cancel();
    if (value.trim().length < 2) { setState(() => suggestions = []); return; }
    debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final data = await ShopScope.of(context).api.get('places/search', {'q': value.trim()});
        if (mounted && placeQuery.text.trim() == value.trim()) setState(() => suggestions = rows(data['suggestions']));
      } catch (e) { if (mounted) setState(() { suggestions = []; error = '$e'; }); }
    });
  }

  Future<void> pin(double latitude, double longitude) async {
    setState(() { lat = latitude; lng = longitude; suggestions = []; });
    try {
      final data = await ShopScope.of(context).api.get('places/reverse', {'lat': '$latitude', 'lng': '$longitude'});
      if (!mounted) return;
      final address = Map<String, dynamic>.from(data['address'] as Map);
      for (final name in ['line1', 'line2', 'city', 'state', 'pincode']) {
        if ('${address[name] ?? ''}'.isNotEmpty) fields[name]!.text = '${address[name]}';
      }
    } catch (_) { if (mounted) shopMessage(context, 'Pin saved. Complete the written address below.'); }
  }

  Future<void> useLocation() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) throw const ShopApiError('Location permission was not granted. Search the map or enter the address manually.', 403);
      final position = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 12)));
      await pin(position.latitude, position.longitude);
    } catch (e) { if (mounted) shopMessage(context, '$e'); }
  }

  Future<void> save() async {
    if (!(form.currentState?.validate() ?? false) || saving) return;
    setState(() { saving = true; error = null; });
    final body = <String, dynamic>{for (final item in fields.entries) item.key: item.value.text.trim()};
    if (widget.initial?['id'] != null) body['id'] = widget.initial!['id'];
    if (lat != null && lng != null) { body['latitude'] = lat; body['longitude'] = lng; }
    try {
      final saved = await ShopScope.of(context).api.post('addresses', body);
      if (!mounted) return;
      Navigator.pop(context, {...body, 'id': saved['id'] ?? widget.initial?['id']});
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    if (mounted) setState(() => saving = false);
  }

  Widget input(String name, String label, {bool optional = false, TextInputType? keyboard}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: fields[name], keyboardType: keyboard, textCapitalization: name == 'phone' || name == 'pincode' ? TextCapitalization.none : TextCapitalization.words,
      decoration: InputDecoration(labelText: label),
      validator: optional ? null : (value) => value == null || value.trim().isEmpty ? 'Enter $label' : null,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final center = LatLng(lat ?? 28.6139, lng ?? 77.2090);
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial == null ? 'Add address' : 'Edit address')),
      body: Form(key: form, child: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 30), children: [
        Text('FIND THE DOOR.', style: theme.textTheme.displayMedium),
        const SizedBox(height: 8), const Text('Search a place, drop a pin or enter the address yourself. A full written address is required.'),
        const SizedBox(height: 18),
        TextField(controller: placeQuery, onChanged: searchPlaces, decoration: const InputDecoration(labelText: 'Search a landmark or street', prefixIcon: Icon(Icons.place_outlined))),
        if (suggestions.isNotEmpty) Card(child: Column(children: suggestions.map((place) => ListTile(
          title: Text('${place['title']}'), subtitle: Text('${place['subtitle']}'),
          onTap: () { placeQuery.text = '${place['title']}'; pin((place['lat'] as num).toDouble(), (place['lng'] as num).toDouble()); },
        )).toList())),
        const SizedBox(height: 12),
        SizedBox(height: 240, child: ClipRRect(borderRadius: BorderRadius.circular(14), child: FlutterMap(
          key: ValueKey('${lat?.toStringAsFixed(6)}:${lng?.toStringAsFixed(6)}'),
          options: MapOptions(initialCenter: center, initialZoom: lat == null ? 11 : 15, onTap: (_, point) => pin(point.latitude, point.longitude)),
          children: [
            TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.styleshopz.styleshopz_flutter'),
            if (lat != null && lng != null) MarkerLayer(markers: [Marker(point: LatLng(lat!, lng!), width: 48, height: 48, child: const Icon(Icons.location_pin, size: 44, color: Color(0xFFF0B429)))]),
          ],
        ))),
        const SizedBox(height: 4), Text('Map data © OpenStreetMap contributors', style: theme.textTheme.bodySmall),
        Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: useLocation, icon: const Icon(Icons.my_location), label: const Text('Use my location'))),
        const SizedBox(height: 8),
        input('name', 'Full name'),
        input('phone', 'Indian mobile number', keyboard: TextInputType.phone),
        input('line1', 'House, street and area'),
        input('line2', 'Landmark (optional)', optional: true),
        input('city', 'City'),
        input('state', 'State'),
        input('pincode', 'Six-digit PIN', keyboard: TextInputType.number),
        if (error != null) Text(error!, style: TextStyle(color: theme.colorScheme.error)),
        const SizedBox(height: 8),
        FilledButton(onPressed: saving ? null : save, child: Text(saving ? 'Saving…' : 'Save address')),
      ])),
    );
  }
}
