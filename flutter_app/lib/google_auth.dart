import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'shop_state.dart';

const _firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _webClientId = '165742447431-vfqihf93s27lml6dho4bq6b352kqa2vq.apps.googleusercontent.com';

class GoogleShopAuth {
  static bool _ready = false;

  static Future<void> _initialize() async {
    if (_ready) return;
    if (_firebaseApiKey.isEmpty) throw StateError('Google sign-in is not configured for this build.');
    await Firebase.initializeApp(options: const FirebaseOptions(
      apiKey: _firebaseApiKey,
      appId: '1:165742447431:android:013266a1aba2fcb80ada62',
      messagingSenderId: '165742447431',
      projectId: 'styleshopz-market-2026',
    ));
    await GoogleSignIn.instance.initialize(serverClientId: _webClientId);
    _ready = true;
  }

  static Future<void> signIn(ShopState state) async {
    await _initialize();
    final account = await GoogleSignIn.instance.authenticate();
    final idToken = account.authentication.idToken;
    if (idToken == null) throw StateError('Google did not return an identity token. Please try again.');
    try {
      final credential = await FirebaseAuth.instance.signInWithCredential(GoogleAuthProvider.credential(idToken: idToken));
      final firebaseToken = await credential.user?.getIdToken(true);
      if (firebaseToken == null) throw StateError('Firebase could not verify the Google account.');
      await state.loginWithFirebaseToken(firebaseToken);
    } finally {
      await FirebaseAuth.instance.signOut().catchError((_) {});
      await GoogleSignIn.instance.signOut().catchError((_) {});
    }
  }
}
