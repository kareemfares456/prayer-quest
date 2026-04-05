import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { AppTextInput, PrimaryBtn, GhostBtn } from '../components/UI';

function SocialBtn({ label, icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.socialBtn}>
      <Text style={styles.socialIcon}>{icon}</Text>
      <Text style={styles.socialText}>{label}</Text>
    </TouchableOpacity>
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

  const handleSocialLogin = async () => {
    await AsyncStorage.setItem('@pq/mode', 'parent');
    navigation.replace('ParentDashboard');
  };

  const handleLogin = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.js onAuthStateChanged will navigate to ParentDashboard
    } catch (e) {
      const msg = e.code === 'auth/invalid-credential'
        ? 'Wrong email or password.'
        : e.code === 'auth/user-not-found'
        ? 'No account found with that email.'
        : 'Login failed. Please try again.';
      setError(msg);
    } finally {
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

              <View style={styles.socialRow}>
                <SocialBtn label="Google" icon="G" onPress={handleSocialLogin} />
                <SocialBtn label="Apple" icon="" onPress={handleSocialLogin} />
              </View>
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
  socialRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffffff', borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  socialIcon: { fontSize: 16, fontWeight: '900', color: '#1f1f1f' },
  socialText: { color: '#1f1f1f', fontSize: 14, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  orText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' },
  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.15)',
    fontSize: 11, marginTop: 18, marginBottom: 8,
  },
});
