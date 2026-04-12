import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AppTextInput, PrimaryBtn, GhostBtn } from '../components/UI';
import { signInWithApple } from '../utils/appleAuth';
import { signInWithGoogle } from '../utils/googleAuth';

function SocialButtons({ onGoogle, onApple }) {
  return (
    <View style={styles.socialStack}>
      <TouchableOpacity onPress={onGoogle} activeOpacity={0.85} style={styles.socialBtn}>
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <TouchableOpacity onPress={onApple} activeOpacity={0.85} style={styles.socialBtn}>
          <Text style={styles.appleIcon}>{'\uF8FF'}</Text>
          <Text style={styles.socialBtnText}>Continue with Apple</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function OrDivider() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>or</Text>
      <View style={styles.orLine} />
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const valid = email.includes('@') && password.length >= 6;

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError('Google sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
    } catch (e) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // user dismissed the sheet — no error to show
      } else if (e.code === 'ERR_APPLE_UNAVAILABLE') {
        setError('Sign in with Apple is not available. Please sign into an Apple ID in Settings.');
      } else {
        setError('Apple sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
    } catch (e) {
      const msg = e.code === 'auth/invalid-credential'
        ? 'Wrong email or password.'
        : e.code === 'auth/user-not-found'
        ? 'No account found with that email.'
        : 'Login failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0d0d1a', '#1a1040', '#0d0d1a']}
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.sub}>Sign in to your parent account</Text>

              <SocialButtons onGoogle={handleGoogleLogin} onApple={handleAppleLogin} />
              <OrDivider />

              <AppTextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppTextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.btnStack}>
                <PrimaryBtn onPress={handleLogin} disabled={!valid || loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Sign In →'}
                </PrimaryBtn>
                <GhostBtn onPress={() => navigation.navigate('Signup')}>
                  Create an account
                </GhostBtn>
                <GhostBtn onPress={() => navigation.navigate('ModeSelect')}>
                  ← Back
                </GhostBtn>
              </View>
            </View>

            <Text style={styles.footer}>🔒 Your family's data is private and secure</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 26, padding: 24, gap: 4,
  },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 20 },
  error: {
    color: '#f87171', fontSize: 13, fontWeight: '700',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10, padding: 10, textAlign: 'center',
    marginTop: 4,
  },
  btnStack: { gap: 8, marginTop: 16 },
  socialStack: { gap: 10, marginBottom: 4 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingVertical: 14,
  },
  googleIcon: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  appleIcon: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  socialBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  orText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' },
  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.15)',
    fontSize: 11, marginTop: 18, marginBottom: 8,
  },
});
