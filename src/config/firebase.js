import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── TODO: Paste your Firebase config here ────────────────────────────────────
// Get this from: Firebase Console → Project Settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey:            'AIzaSyCGBdxxtFBfIcdSWBzMc7AF7grr83O_oAs',
  authDomain:        'prayer-quest-kids.firebaseapp.com',
  projectId:         'prayer-quest-kids',
  storageBucket:     'prayer-quest-kids.firebasestorage.app',
  messagingSenderId: '687789562844',
  appId:             '1:687789562844:web:22551a60f8040e14580d19',
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

// Use AsyncStorage for auth persistence on React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
