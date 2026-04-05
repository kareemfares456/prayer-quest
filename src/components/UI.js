import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput as RNTextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';

// ─── Label ────────────────────────────────────────────────────────────────────
export const Label = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ─── TextInput ────────────────────────────────────────────────────────────────
export const AppTextInput = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, style }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Label>{label}</Label>}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={[
          styles.input,
          focused && styles.inputFocused,
          style,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
};

// ─── Primary Button ───────────────────────────────────────────────────────────
export const PrimaryBtn = ({ children, onPress, disabled, loading }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
    <LinearGradient
      colors={disabled ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)'] : ['#818cf8', '#c084fc']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.primaryBtn}
    >
      {loading
        ? <ActivityIndicator color="white" size="small" />
        : <Text style={[styles.primaryBtnText, disabled && styles.primaryBtnTextDisabled]}>{children}</Text>
      }
    </LinearGradient>
  </TouchableOpacity>
);

// ─── Ghost Button ─────────────────────────────────────────────────────────────
export const GhostBtn = ({ children, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.ghostBtn}>
    <Text style={styles.ghostBtnText}>{children}</Text>
  </TouchableOpacity>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
export const StepIndicator = ({ total, current }) => (
  <View style={styles.stepRow}>
    {Array.from({ length: total }, (_, i) => {
      const s = i + 1;
      const done = current > s;
      const active = current === s;
      return (
        <React.Fragment key={s}>
          <View style={[
            styles.stepDot,
            active && styles.stepDotActive,
            done && styles.stepDotDone,
          ]}>
            <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextActive]}>
              {done ? '✓' : s}
            </Text>
          </View>
          {s < total && (
            <View style={[styles.stepLine, done && styles.stepLineDone]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 22,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13,
    color: COLORS.white,
    fontSize: 14,
    padding: 13,
  },
  inputFocused: {
    borderColor: 'rgba(129,140,248,0.6)',
  },
  primaryBtn: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.25)',
  },
  ghostBtn: {
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
  },
  ghostBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  stepDot: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(129,140,248,0.18)',
    borderColor: '#818cf8',
    shadowColor: '#818cf8',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  stepDotDone: {
    backgroundColor: '#818cf8',
    borderColor: '#818cf8',
  },
  stepDotText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontWeight: '900',
  },
  stepDotTextActive: {
    color: COLORS.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 5,
    borderRadius: 1,
  },
  stepLineDone: {
    backgroundColor: 'rgba(129,140,248,0.45)',
  },
});
