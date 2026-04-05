import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ModeSelectScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#0d0d1a', '#1a1040', '#0d0d1a']}
      style={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.emoji}>🕌</Text>
        <Text style={styles.title}>Prayer Quest</Text>
        <Text style={styles.sub}>Who's opening the app?</Text>

        {/* Parent card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Signup')}
        >
          <LinearGradient
            colors={['rgba(129,140,248,0.15)', 'rgba(192,132,252,0.08)']}
            style={StyleSheet.absoluteFill}
            borderRadius={24}
          />
          <Text style={styles.cardEmoji}>👨‍👩‍👧‍👦</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I'm a Parent</Text>
            <Text style={styles.cardSub}>Manage your children's prayer tracking and set rewards</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        {/* Child card */}
        <TouchableOpacity
          style={[styles.card, styles.cardChild]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ChildJoin')}
        >
          <LinearGradient
            colors={['rgba(52,211,153,0.12)', 'rgba(16,185,129,0.06)']}
            style={StyleSheet.absoluteFill}
            borderRadius={24}
          />
          <Text style={styles.cardEmoji}>🧒</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: '#34d399' }]}>I'm a Child</Text>
            <Text style={styles.cardSub}>Join with your parent's invite code and log your prayers</Text>
          </View>
          <Text style={[styles.cardArrow, { color: '#34d399' }]}>→</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>🔒 Your family's data is private and secure</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  emoji: { fontSize: 60, marginBottom: 4 },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '900', letterSpacing: 0.5 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 12 },

  card: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 24, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.25)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardChild: { borderColor: 'rgba(52,211,153,0.25)' },
  cardEmoji: { fontSize: 40 },
  cardText: { flex: 1 },
  cardTitle: { color: '#818cf8', fontSize: 18, fontWeight: '900' },
  cardSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3, lineHeight: 17 },
  cardArrow: { color: '#818cf8', fontSize: 22, fontWeight: '900' },

  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.15)',
    fontSize: 11, marginTop: 16,
  },
});
