import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

// ─── Configure once ───────────────────────────────────────────────────────────
// Get these from Google Cloud Console → APIs & Services → Credentials
// https://console.cloud.google.com/apis/credentials?project=prayer-quest-kids
GoogleSignin.configure({
  webClientId:  '687789562844-h5tuatj3dun481s0hn14rtdepj27jrdn.apps.googleusercontent.com',
  iosClientId:  '687789562844-j484s04g077vffhfnuf4hffqqop036q8.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

/**
 * Signs in (or up) with Google and creates/merges the Firestore user doc.
 * Throws with code 'ERR_REQUEST_CANCELED' if the user cancels (same pattern as appleAuth).
 */
export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    // Not needed on iOS, ignore
  }

  let userInfo;
  try {
    userInfo = await GoogleSignin.signIn();
  } catch (e) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      const err = new Error('Cancelled');
      err.code = 'ERR_REQUEST_CANCELED';
      throw err;
    }
    throw e;
  }

  // userInfo.data.idToken is available directly on newer versions
  const idToken = userInfo.data?.idToken ?? (await GoogleSignin.getTokens()).idToken;

  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);

  const name  = user.displayName ?? userInfo.data?.user?.name  ?? 'Parent';
  const email = user.email       ?? userInfo.data?.user?.email ?? '';

  await setDoc(
    doc(db, 'users', user.uid),
    { name, email, createdAt: serverTimestamp() },
    { merge: true },
  );
  await AsyncStorage.setItem('@pq/mode', 'parent');
  return user;
}
