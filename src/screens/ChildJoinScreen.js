import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useApp } from '../context/AppContext';

// ─── Code Input ───────────────────────────────────────────────────────────────
function CodeInput({ value, onChange }) {
  return (
    <View style={styles.codeInputWrapper}>
      <TextInput
        style={styles.codeInput}
        value={value}
        onChangeText={t => onChange(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="ABC123"
        placeholderTextColor="rgba(255,255,255,0.2)"
        autoCapitalize="characters"
        maxLength={6}
        keyboardType="default"
        returnKeyType="done"
      />
      <Text style={styles.codeHint}>{value.length}/6 characters</Text>
    </View>
  );
}

// ─── QR Scanner Tab ───────────────────────────────────────────────────────────
function ScanTab({ onCodeScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const handleScan = ({ data }) => {
    if (scannedRef.current) return;
    // Support raw 6-char code or a URL containing ?code=XXXXXX
    const match = data.match(/(?:code=)?([A-Z0-9]{6})$/);
    if (match) {
      scannedRef.current = true;
      onCodeScanned(match[1]);
    }
  };

  if (!permission) return <ActivityIndicator color="#818cf8" style={{ marginTop: 60 }} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Text style={styles.permissionText}>Camera access is needed to scan QR codes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraBox}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      {/* Finder overlay */}
      <View style={styles.finder} />
      <Text style={styles.scanHint}>Point at the QR code shown by the parent</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChildJoinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setChildSession } = useApp();
  const [tab, setTab]     = useState('code'); // 'scan' | 'code'
  const [code, setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const joinWithCode = async (inviteCode) => {
    const c = inviteCode.trim().toUpperCase();
    if (c.length !== 6) {
      setError('Enter the full 6-character code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const inviteSnap = await getDoc(doc(db, 'inviteCodes', c));
      if (!inviteSnap.exists()) {
        setError('Code not found. Ask your parent to share again.');
        setLoading(false);
        return;
      }
      const { childId } = inviteSnap.data();

      // Verify the child doc exists
      const childSnap = await getDoc(doc(db, 'children', childId));
      if (!childSnap.exists()) {
        setError('Something went wrong. Try again.');
        setLoading(false);
        return;
      }

      // setChildSession saves to AsyncStorage and updates appStatus to 'child',
      // which causes AppNavigator to switch to the child screen group automatically.
      await setChildSession(childId);
    } catch (e) {
      setError('Network error. Check your connection.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0d0d1a', '#130d2e', '#0d0d1a']}
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ModeSelect')}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Join Your Family</Text>
          <Text style={styles.sub}>
            Ask your parent to open PrayerQuest and tap the share button next to your name.
          </Text>

          {/* Tab switcher */}
          <View style={styles.tabs}>
            {['code', 'scan'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => { setTab(t); setError(''); }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'code' ? '⌨️  Enter Code' : '📷  Scan QR'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {tab === 'scan' ? (
            <ScanTab onCodeScanned={joinWithCode} />
          ) : (
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>INVITE CODE</Text>
              <CodeInput value={code} onChange={setCode} />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.joinBtn, (code.length !== 6 || loading) && styles.joinBtnDisabled]}
                activeOpacity={0.85}
                onPress={() => joinWithCode(code)}
                disabled={code.length !== 6 || loading}
              >
                <LinearGradient
                  colors={['#818cf8', '#c084fc']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.joinBtnGrad}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.joinBtnText}>Join Family →</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 16 },

  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
  },
  backBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },

  title: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22, marginBottom: 4 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
  },
  tabActive: { backgroundColor: 'rgba(129,140,248,0.18)', borderWidth: 1, borderColor: 'rgba(129,140,248,0.35)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#818cf8' },

  // Camera
  cameraBox: {
    height: 300, borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  finder: {
    position: 'absolute', width: 200, height: 200,
    borderWidth: 3, borderColor: '#818cf8', borderRadius: 20,
    top: '50%', left: '50%',
    transform: [{ translateX: -100 }, { translateY: -120 }],
  },
  scanHint: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100,
  },

  permissionBox: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  permissionText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: 'rgba(129,140,248,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.4)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionBtnText: { color: '#818cf8', fontSize: 14, fontWeight: '800' },

  // Code entry
  codeSection: { gap: 14 },
  codeLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  codeInputWrapper: { gap: 6 },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.35)',
    borderRadius: 18, paddingHorizontal: 24, paddingVertical: 18,
    color: '#ffffff', fontSize: 32, fontWeight: '900',
    letterSpacing: 10, textAlign: 'center',
  },
  codeHint: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center' },

  error: {
    color: '#f87171', fontSize: 13, fontWeight: '700',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10, padding: 10, textAlign: 'center',
  },

  joinBtn: { borderRadius: 18, overflow: 'hidden' },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
