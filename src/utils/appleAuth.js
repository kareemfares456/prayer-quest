import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

function randomNonce(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = Crypto.getRandomBytes(length);
  return Array.from(bytes).map(b => charset[b % charset.length]).join('');
}

/**
 * Signs in (or up) with Apple and creates/merges the Firestore user doc.
 * Throws if the user cancels (error.code === 'ERR_REQUEST_CANCELED').
 * Throws with code 'ERR_APPLE_UNAVAILABLE' if Apple Sign In isn't available.
 */
export async function signInWithApple() {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    const err = new Error('Sign in with Apple is not available. Make sure you are signed into an Apple ID in device Settings.');
    err.code = 'ERR_APPLE_UNAVAILABLE';
    throw err;
  }

  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const credential = new OAuthProvider('apple.com').credential({
    idToken: apple.identityToken,
    rawNonce,
  });

  const { user } = await signInWithCredential(auth, credential);

  // Apple only provides fullName + email on the very first sign-in.
  const fn = apple.fullName;
  const name = (fn?.givenName || fn?.familyName)
    ? `${fn.givenName ?? ''} ${fn.familyName ?? ''}`.trim()
    : user.displayName ?? 'Parent';
  const email = apple.email ?? user.email ?? '';

  await setDoc(
    doc(db, 'users', user.uid),
    { name, email, createdAt: serverTimestamp() },
    { merge: true },
  );
  await AsyncStorage.setItem('@pq/mode', 'parent');
  return user;
}
