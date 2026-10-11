import { firebaseConfig, googleWebClientId } from './firebase-config';
import { Capacitor } from '@capacitor/core';

export async function googleLoginToken(apiKey:string) {
  if(!apiKey)throw new Error('Google sign-in configuration is loading. Try again in a moment.');
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, inMemoryPersistence, setPersistence, signOut }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] || initializeApp({...firebaseConfig,apiKey});
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  try {
    let credential;
    if (Capacitor.isNativePlatform()) {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      await SocialLogin.initialize({ google: { webClientId: googleWebClientId } });
      const result = await SocialLogin.login({ provider: 'google', options: {} });
      const token = (result.result as { idToken?: string }).idToken;
      if (!token) throw new Error('Google sign-in was closed. Please try again.');
      credential = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      credential = await signInWithPopup(auth, provider);
    }
    return await credential.user.getIdToken(true);
  } finally {
    await signOut(auth).catch(()=>{});
  }
}
