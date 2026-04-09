import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppTextInput, PrimaryBtn, GhostBtn } from '../components/UI';
import { signInWithApple } from '../utils/appleAuth';
import { signInWithGoogle } from '../utils/googleAuth';

// ─── Social Buttons ────────────────────────────────────────────────────────────
function SocialBtn({ label, icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.socialBtn}>
      <Text style={styles.socialIcon}>{icon}</Text>
      <Text style={styles.socialText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SocialRow({ onGoogle, onApple }) {
  return (
    <View style={styles.socialRow}>
      <SocialBtn label="Google" icon="G" onPress={onGoogle} />
      {Platform.OS === 'ios' && (
        <SocialBtn label="Apple" icon="" onPress={onApple} />
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

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext, onGoogle, onApple, error, onLogin }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.welcomeEmoji}>🕌</Text>
      <Text style={styles.welcomeTitle}>Welcome to{'\n'}Prayer Quest</Text>
      <Text style={styles.welcomeSub}>
        Help your children build a beautiful habit of daily prayer — with streaks, custom rewards, and real encouragement.
      </Text>
      <SocialRow onGoogle={onGoogle} onApple={onApple} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OrDivider />
      <PrimaryBtn onPress={onNext}>Continue with Email →</PrimaryBtn>
      <TouchableOpacity onPress={onLogin} style={styles.loginLink} activeOpacity={0.7}>
        <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkAccent}>Sign in</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 1: Parent Account ───────────────────────────────────────────────────
function StepParent({ data, onChange, onNext, onBack, onGoogle, onApple, loading, error }) {
  const valid = data.name.trim().length > 1 && data.email.includes('@') && data.password.length >= 6;
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Account</Text>
      <Text style={styles.stepSub}>Visible to you only — not your children.</Text>
      <SocialRow onGoogle={onGoogle} onApple={onApple} />
      <OrDivider />
      <AppTextInput label="Full Name" value={data.name} onChangeText={v => onChange('name', v)} placeholder="e.g. Ahmed Al-Rashidi" />
      <AppTextInput label="Email" value={data.email} onChangeText={v => onChange('email', v)} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
      <AppTextInput label="Password" value={data.password} onChangeText={v => onChange('password', v)} placeholder="Min. 6 characters" secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.btnStack}>
        <PrimaryBtn onPress={onNext} disabled={!valid || loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Get Started →'}
        </PrimaryBtn>
        <GhostBtn onPress={onBack}>← Back</GhostBtn>
      </View>

    </View>
  );
}

// ─── Main Signup Screen ───────────────────────────────────────────────────────
export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [parent, setParent] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateParent = (k, v) => setParent(p => ({ ...p, [k]: v }));

  const handleComplete = async (overrideParent) => {
    const data = overrideParent ?? parent;
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: data.name,
        email: data.email.trim(),
        createdAt: serverTimestamp(),
      });
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
      // Keep loading=true so spinner shows until this screen unmounts.
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : e.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : 'Registration failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
      // Keep loading=true so spinner shows until this screen unmounts.
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError('Google sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleApple = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
      // App.js onAuthStateChanged → setStatus('parent') → navigator switches automatically.
      // Keep loading=true so spinner shows until this screen unmounts.
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

  const steps = [
    <StepWelcome onNext={() => setStep(1)} onGoogle={handleGoogle} onApple={handleApple} error={error} onLogin={() => navigation?.navigate('Login')} />,
    <StepParent
      data={parent}
      onChange={updateParent}
      onNext={() => handleComplete()}
      onBack={() => setStep(0)}
      onGoogle={handleGoogle}
      onApple={handleApple}
      loading={loading}
      error={error}
    />,
  ];

  return (
    <LinearGradient colors={['#0d0d1a', '#1a1040', '#0d0d1a']} style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, styles.scrollCenter]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <View style={styles.card}>
              {steps[step]}
            </View>
            <Text style={styles.footer}>🔒 Your family's data is private and secure</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 16 },
  scrollCenter: { justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 26,
    padding: 24,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.15)',
    fontSize: 11,
    marginTop: 18,
    marginBottom: 8,
  },

  stepContainer: { gap: 0 },
  stepTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  stepSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 20 },
  btnStack: { gap: 8, marginTop: 16 },

  error: {
    color: '#f87171', fontSize: 13, fontWeight: '700',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10, padding: 10, textAlign: 'center',
    marginTop: 8,
  },

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

  welcomeEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 20 },
  welcomeTitle: { color: '#ffffff', fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 34, marginBottom: 12 },
  welcomeSub: { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  loginLink: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  loginLinkText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  loginLinkAccent: { color: '#818cf8', fontWeight: '700' },
});
