import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Share, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import {
  signOut, sendPasswordResetEmail, deleteUser,
  reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import {
  collection, doc, query, where, getDocs, deleteDoc, writeBatch, updateDoc,
} from 'firebase/firestore';
import { COLORS, PRAYERS, DURATION_OPTIONS, AVATARS } from '../constants';
import { useApp } from '../context/AppContext';

const REWARD_PLACEHOLDERS = [
  'e.g. Ice cream trip 🍦',
  'e.g. Movie night 🎬',
  'e.g. Trip to the park 🌳',
  'e.g. Special toy 🧸',
  'e.g. Stay up late 🌙',
  'e.g. Choose dinner 🍕',
];

const REWARD_SUGGESTIONS = [
  'Ice Cream Trip', 'Movie Night', 'Trip to the Park', 'Extra Screen Time',
  'Bedtime Story', 'Special Treat', 'New Book', 'Pocket Money',
  'Video Game Session', 'Friend Sleepover', 'Toy of Choice', 'Swimming',
  'Cooking Together', 'Board Game Night', 'Art Supplies', 'Library Visit',
];

const CHILD_THEMES = [
  { grad: ['#818cf8', '#c084fc'], glow: '#818cf8' },
  { grad: ['#34d399', '#10b981'], glow: '#34d399' },
  { grad: ['#fbbf24', '#f59e0b'], glow: '#fbbf24' },
  { grad: ['#f472b6', '#ec4899'], glow: '#f472b6' },
  { grad: ['#fb923c', '#f97316'], glow: '#fb923c' },
  { grad: ['#60a5fa', '#3b82f6'], glow: '#60a5fa' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'Tahajjud time', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' };
  if (h < 20) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Good night', emoji: '🌙' };
}

const todayKey = () => new Date().toISOString().split('T')[0];

const getLast7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: d.toISOString().split('T')[0], d };
  });

const getMonthCalendar = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ key: date.toISOString().split('T')[0], d });
  }
  return { cells, monthName };
};

// ─── History Section ───────────────────────────────────────────────────────────
function HistorySection({ logs, todayLog, today, theme }) {
  const [tab, setTab] = useState('week');
  const days7 = getLast7Days();
  const { cells, monthName } = getMonthCalendar();

  return (
    <View>
      <View style={pStyles.sectionRow}>
        <Text style={pStyles.sectionLabel}>PRAYER HISTORY</Text>
        <View style={pStyles.tabBar}>
          {['today', 'week', 'month'].map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[pStyles.tabBtn, tab === t && { backgroundColor: COLORS.purple + '25', borderColor: COLORS.purple + '60' }]}
            >
              <Text style={[pStyles.tabText, tab === t && { color: COLORS.purple }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={pStyles.card}>
        {/* ── Today ── */}
        {tab === 'today' && PRAYERS.map((p, i) => {
          const done = !!todayLog[p.id];
          return (
            <View key={p.id} style={[pStyles.prayerRow, i < PRAYERS.length - 1 && pStyles.prayerDivider]}>
              <Text style={pStyles.prayerEmoji}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.prayerName}>{p.name}</Text>
                <Text style={pStyles.prayerTime}>{p.clockTime}</Text>
              </View>
              <View style={[pStyles.checkCircle, done && { backgroundColor: p.color + '20', borderColor: p.color }]}>
                {done && <Text style={[pStyles.checkMark, { color: p.color }]}>✓</Text>}
              </View>
            </View>
          );
        })}

        {/* ── Week ── */}
        {tab === 'week' && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days7.map(({ key, d }) => {
              const dayLog = logs[key] || {};
              const count = PRAYERS.filter(p => dayLog[p.id]).length;
              const isToday = key === today;
              const isFuture = key > today;
              const allDone = count === 5;
              return (
                <View key={key} style={pStyles.dayCol}>
                  <Text style={[pStyles.dayLetter, isToday && { color: COLORS.purple }]}>
                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </Text>
                  <View style={[
                    pStyles.dayCircle,
                    isToday && { borderColor: COLORS.purple + '80' },
                    allDone && { backgroundColor: COLORS.purple + '25', borderColor: COLORS.purple },
                  ]}>
                    {isFuture
                      ? <Text style={pStyles.futureDash}>–</Text>
                      : (
                        <View style={pStyles.weekDots}>
                          <View style={pStyles.weekDotsRow}>
                            {PRAYERS.slice(0, 3).map(p => (
                              <View key={p.id} style={[pStyles.weekDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.12)' }]} />
                            ))}
                          </View>
                          <View style={pStyles.weekDotsRow}>
                            {PRAYERS.slice(3).map(p => (
                              <View key={p.id} style={[pStyles.weekDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.12)' }]} />
                            ))}
                          </View>
                        </View>
                      )
                    }
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Month ── */}
        {tab === 'month' && (
          <View>
            <Text style={pStyles.monthTitle}>{monthName}</Text>
            <View style={pStyles.monthDowRow}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <Text key={i} style={pStyles.monthDow}>{d}</Text>
              ))}
            </View>
            <View style={pStyles.monthGrid}>
              {cells.map((cell, i) => {
                if (!cell) return <View key={i} style={pStyles.monthCell} />;
                const dayLog = logs[cell.key] || {};
                const count = PRAYERS.filter(p => dayLog[p.id]).length;
                const isToday = cell.key === today;
                const isFuture = cell.key > today;
                const allDone = count === 5 && !isFuture;
                return (
                  <View key={cell.key} style={pStyles.monthCell}>
                    <View style={[
                      pStyles.monthDayCircle,
                      isToday && { borderColor: COLORS.purple },
                      allDone && { backgroundColor: COLORS.purple + '30', borderColor: COLORS.purple },
                    ]}>
                      <Text style={[
                        pStyles.monthDayNum,
                        isToday && { color: COLORS.purple, fontWeight: '900' },
                        allDone && { color: COLORS.purple },
                        isFuture && { opacity: 0.2 },
                      ]}>{cell.d}</Text>
                    </View>
                    {!isFuture && (
                      <View style={pStyles.monthMiniDots}>
                        {PRAYERS.map(p => (
                          <View key={p.id} style={[pStyles.monthMiniDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.1)' }]} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Rewards Journey ──────────────────────────────────────────────────────────
function RewardsJourney({ child, completeDays, theme, updateChildRewards, isEditing }) {
  const sorted = [...child.rewards].sort((a, b) => a.days - b.days);

  const updateReward = (rid, key, val) => {
    updateChildRewards(child.id, child.rewards.map(r => r.id === rid ? { ...r, [key]: val } : r));
  };

  const addReward = () => {
    const maxDays = sorted.length > 0 ? sorted[sorted.length - 1].days : 0;
    const next = DURATION_OPTIONS.find(o => o.days > maxDays) ?? DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
    updateChildRewards(child.id, [...child.rewards, { id: 'r' + Date.now(), icon: '🎁', label: '', days: next.days }]);
  };

  const removeReward = (rid) => {
    if (child.rewards.length > 1) updateChildRewards(child.id, child.rewards.filter(r => r.id !== rid));
  };

  return (
    <View>
      {sorted.map((r, idx) => {
        const earned = completeDays >= r.days;
        const isNext = !earned && (idx === 0 || completeDays >= (sorted[idx - 1]?.days ?? 0));
        const progress = Math.min((completeDays / r.days) * 100, 100);
        const prevDays = idx > 0 ? sorted[idx - 1].days : 0;
        const options = DURATION_OPTIONS.filter(o => o.days > prevDays);
        const durationLabel = DURATION_OPTIONS.find(d => d.days === r.days)?.label ?? `${r.days}d`;
        const isLast = idx === sorted.length - 1;

        return (
          <View key={r.id} style={pStyles.journeyStep}>
            <View style={pStyles.journeyLeft}>
              <View style={[
                pStyles.stepDot,
                earned && { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
                isNext && !earned && { borderColor: COLORS.purple },
              ]}>
                <Text style={[pStyles.stepNum, (earned || isNext) && { color: earned ? COLORS.white : COLORS.purple }]}>
                  {earned ? '✓' : idx + 1}
                </Text>
              </View>
              {!isLast && (
                <View style={[pStyles.stepLine, earned && { backgroundColor: COLORS.purple + '50' }]} />
              )}
            </View>

            <View style={[
              pStyles.journeyCard,
              isNext && !isEditing && { borderColor: COLORS.purple + '50', backgroundColor: COLORS.purple + '08' },
              earned && !isEditing && { borderColor: COLORS.purple + '30' },
              isEditing && { borderColor: COLORS.purple + '40' },
            ]}>
              <View style={pStyles.journeyCardTop}>
                <Text style={{ fontSize: 24 }}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  {isEditing ? (
                    <TextInput
                      value={r.label}
                      onChangeText={v => updateReward(r.id, 'label', v)}
                      placeholder="Reward name..."
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      style={pStyles.editInput}
                    />
                  ) : (
                    <Text style={[pStyles.journeyRewardName, earned && { color: COLORS.purple }]}>
                      {r.label || 'Unnamed'}
                    </Text>
                  )}
                  <Text style={pStyles.journeyRewardDays}>{durationLabel}</Text>
                </View>
                {isEditing && child.rewards.length > 1 && (
                  <TouchableOpacity onPress={() => removeReward(r.id)} style={pStyles.removeRewardBtn}>
                    <Text style={{ color: COLORS.red, fontSize: 13 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {options.map(opt => {
                    const sel = r.days === opt.days;
                    return (
                      <TouchableOpacity
                        key={opt.days}
                        onPress={() => updateReward(r.id, 'days', opt.days)}
                        style={[pStyles.dChip, sel && { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '25' }]}
                      >
                        <Text style={[pStyles.dChipText, sel && { color: COLORS.white }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : earned ? (
                <View style={[pStyles.earnedBadge, { borderColor: COLORS.purple + '50', backgroundColor: COLORS.purple + '12' }]}>
                  <Text style={[pStyles.earnedText, { color: COLORS.purple }]}>🎉 Earned! ({r.days} complete days)</Text>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <View style={pStyles.progressRow}>
                    <Text style={pStyles.progressLabel}>{completeDays} / {r.days} complete days</Text>
                    <Text style={[pStyles.progressPct, isNext && { color: COLORS.purple }]}>{Math.round(progress)}%</Text>
                  </View>
                  <View style={pStyles.progressBg}>
                    <LinearGradient
                      colors={[COLORS.purple, '#c084fc']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[pStyles.progressFill, { width: `${Math.max(progress, 1)}%` }]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {isEditing && child.rewards.length < 8 && (
        <TouchableOpacity onPress={addReward} style={pStyles.addRewardBtn}>
          <Text style={[pStyles.addRewardText, { color: COLORS.purple }]}>+ Add Reward</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ visible, onClose, child }) {
  const [copied, setCopied] = useState(false);
  if (!child || !visible) return null;

  const code = child.inviteCode || '??????';
  const formatted = code.match(/.{1,2}/g)?.join(' ') ?? code;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: `Join me on PrayerQuest! ${child.name}'s invite code is: ${code}\n\nOpen PrayerQuest → "I'm a Child" → Enter this code.`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pStyles.sheet, { maxHeight: '80%' }]}>
          <View style={pStyles.handle} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={invStyles.inviteTitle}>{child.avatar} Invite {child.name}</Text>
              <Text style={invStyles.inviteSub}>Share this code to connect</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={pStyles.closeBtn}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View style={invStyles.qrBox}>
            <QRCode
              value={code}
              size={180}
              color="#818cf8"
              backgroundColor="#0d0a1e"
            />
          </View>

          {/* Code display */}
          <View style={invStyles.codeBox}>
            <Text style={invStyles.codeLabel}>INVITE CODE</Text>
            <Text style={invStyles.codeText}>{formatted}</Text>
          </View>

          {/* Instruction */}
          <Text style={invStyles.instruction}>
            Ask {child.name} to open PrayerQuest → "I'm a Child" → Enter this code
          </Text>

          {/* Actions */}
          <View style={invStyles.actions}>
            <TouchableOpacity onPress={handleCopy} style={invStyles.actionBtn}>
              <LinearGradient
                colors={copied ? ['#34d399', '#10b981'] : ['rgba(129,140,248,0.2)', 'rgba(192,132,252,0.2)']}
                style={invStyles.actionBtnGrad}
              >
                <Text style={invStyles.actionBtnText}>{copied ? '✓ Copied!' : '📋 Copy Code'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={invStyles.actionBtn}>
              <LinearGradient
                colors={['rgba(129,140,248,0.2)', 'rgba(192,132,252,0.2)']}
                style={invStyles.actionBtnGrad}
              >
                <Text style={invStyles.actionBtnText}>↑ Share</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Add Child Modal ───────────────────────────────────────────────────────────
function AddChildModal({ visible, onClose, onSaved }) {
  const { state, updateChild, addChild, updateChildRewards } = useApp();
  const [step, setStep] = useState('setup'); // 'setup' | 'rewards'
  const [showSuggest, setShowSuggest] = useState(false);
  const [newChildId, setNewChildId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Local state for setup step — no Firestore write until "Set Up Rewards" is pressed
  const [localName, setLocalName] = useState('');
  const [localAvatar, setLocalAvatar] = useState(AVATARS[0]);
  const [localGender, setLocalGender] = useState('');

  // Find the newly created child by tracked ID (only exists after setup is confirmed)
  const child = newChildId
    ? state.children.find(c => c.id === newChildId)
    : null;

  useEffect(() => {
    if (visible) {
      setStep('setup');
      setNewChildId(null);
      setCreateError('');
      setCreating(false);
      setLocalName('');
      setLocalAvatar(AVATARS[0]);
      setLocalGender('');
    }
  }, [visible]);

  // Called when "Set Up Rewards →" is pressed — creates child for the first time
  const handleSetupNext = async () => {
    if (newChildId) { setStep('rewards'); return; }
    setCreating(true);
    const id = await addChild();
    if (!id) {
      setCreating(false);
      setCreateError('Could not create child. Please sign in and try again.');
      return;
    }
    await updateChild(id, { name: localName.trim(), avatar: localAvatar, gender: localGender });
    setNewChildId(id);
    setCreating(false);
    setStep('rewards');
  };

  // Setup values: local before creation, Firestore-backed after (if user goes back)
  const setupName = newChildId ? (child?.name ?? '') : localName;
  const setupAvatar = newChildId ? (child?.avatar ?? AVATARS[0]) : localAvatar;
  const setupGender = newChildId ? (child?.gender ?? '') : localGender;
  const setSetupName = newChildId ? (v => updateChild(newChildId, { name: v })) : setLocalName;
  const setSetupAvatar = newChildId ? (av => updateChild(newChildId, { avatar: av })) : setLocalAvatar;
  const setSetupGender = newChildId ? (g => updateChild(newChildId, { gender: g })) : setLocalGender;

  const handleDone = () => {
    onClose();
    setStep('setup');
    if (child) onSaved?.(child);
  };

  const updateReward = (rid, key, val) => {
    if (!child) return;
    updateChildRewards(child.id, child.rewards.map(r => r.id === rid ? { ...r, [key]: val } : r));
  };

  const addReward = () => {
    if (!child) return;
    const sorted = [...child.rewards].sort((a, b) => a.days - b.days);
    const maxDays = sorted.length > 0 ? sorted[sorted.length - 1].days : 0;
    const next = DURATION_OPTIONS.find(o => o.days > maxDays) ?? DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
    updateChildRewards(child.id, [...child.rewards, { id: 'r' + Date.now(), icon: '🎁', label: '', days: next.days }]);
  };

  const removeReward = (rid) => {
    if (!child || child.rewards.length <= 1) return;
    updateChildRewards(child.id, child.rewards.filter(r => r.id !== rid));
  };

  const addSuggestedReward = (label) => {
    if (!child) return;
    const sorted = [...child.rewards].sort((a, b) => a.days - b.days);
    const maxDays = sorted.length > 0 ? sorted[sorted.length - 1].days : 0;
    const next = DURATION_OPTIONS.find(o => o.days > maxDays) ?? DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
    updateChildRewards(child.id, [...child.rewards, { id: 'r' + Date.now(), icon: '🎁', label, days: next.days }]);
  };

  if (!visible) return null;

  const sheetHeight = (creating || createError)
    ? { height: '50%' }
    : step === 'rewards' ? { height: '88%' } : { maxHeight: '80%' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <View style={pStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pStyles.sheet, sheetHeight]}>
          <View style={pStyles.handle} />

          {creating ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <ActivityIndicator size="large" color="#818cf8" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>Setting up profile…</Text>
            </View>
          ) : createError ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Text style={{ color: '#f87171', fontSize: 15, textAlign: 'center', fontWeight: '700' }}>{createError}</Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 20, padding: 12 }}>
                <Text style={{ color: '#818cf8', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'setup' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={pStyles.childName}>New Child Setup</Text>
              <Text style={[pStyles.sectionLabel, { marginBottom: 10, marginTop: 4 }]}>AVATAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {AVATARS.map(av => (
                  <TouchableOpacity
                    key={av}
                    onPress={() => setSetupAvatar(av)}
                    style={[addStyles.avatarBtn, setupAvatar === av && addStyles.avatarBtnSel]}
                  >
                    <Text style={{ fontSize: 22 }}>{av}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[pStyles.sectionLabel, { marginBottom: 8 }]}>NAME</Text>
              <TextInput
                value={setupName}
                onChangeText={setSetupName}
                placeholder="e.g. Youssef"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={addStyles.nameInput}
              />

              <Text style={[pStyles.sectionLabel, { marginBottom: 8, marginTop: 16 }]}>GENDER</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {['boy', 'girl'].map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setSetupGender(g)}
                    style={[addStyles.genderBtn, setupGender === g && addStyles.genderBtnSel]}
                  >
                    <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>
                      {g === 'boy' ? '👦 Boy' : '👧 Girl'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleSetupNext}
                disabled={setupName.trim().length < 2}
                style={[addStyles.addBtn, setupName.trim().length < 2 && { opacity: 0.4 }]}
              >
                <LinearGradient colors={['#818cf8', '#c084fc']} style={addStyles.addBtnGrad}>
                  <Text style={addStyles.addBtnText}>Set Up Rewards →</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          ) : step === 'rewards' && child ? (
            <>
              <View style={addStyles.rewardsHeader}>
                <TouchableOpacity onPress={() => setStep('setup')} style={addStyles.backBtn}>
                  <Text style={addStyles.backBtnText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={[pStyles.childName, { flex: 1, textAlign: 'center' }]}>
                  {child.avatar} Rewards
                </Text>
                <View style={{ width: 48 }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginBottom: 12, lineHeight: 18 }}>
                Set up milestone rewards for {child.name}. They earn rewards after completing full-prayer days.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {/* AI Suggest button */}
                <TouchableOpacity
                  onPress={() => setShowSuggest(s => !s)}
                  style={[addStyles.aiBtn, showSuggest && addStyles.aiBtnActive]}
                >
                  <Text style={{ fontSize: 15 }}>✨</Text>
                  <Text style={addStyles.aiBtnText}>Suggest rewards with AI</Text>
                  <Text style={[addStyles.aiBtnChevron, showSuggest && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
                </TouchableOpacity>

                {showSuggest && (
                  <View style={addStyles.suggestPanel}>
                    <Text style={addStyles.suggestLabel}>TAP TO ADD</Text>
                    <View style={addStyles.suggestGrid}>
                      {REWARD_SUGGESTIONS.filter(s => !child.rewards.some(r => r.label === s)).map(s => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => { addSuggestedReward(s); setShowSuggest(false); }}
                          style={addStyles.suggestChip}
                        >
                          <Text style={addStyles.suggestChipText}>+ {s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {[...child.rewards].sort((a, b) => a.days - b.days).map((r, idx) => {
                  const sorted = [...child.rewards].sort((a, b) => a.days - b.days);
                  const prevDays = idx > 0 ? sorted[idx - 1].days : 0;
                  const options = DURATION_OPTIONS.filter(o => o.days > prevDays);
                  return (
                    <View key={r.id} style={addStyles.rewardCard}>
                      <View style={addStyles.rewardCardTop}>
                        <Text style={{ fontSize: 22 }}>{r.icon}</Text>
                        <TextInput
                          value={r.label}
                          onChangeText={v => updateReward(r.id, 'label', v)}
                          placeholder={REWARD_PLACEHOLDERS[idx % REWARD_PLACEHOLDERS.length]}
                          placeholderTextColor="rgba(255,255,255,0.25)"
                          style={addStyles.rewardNameInput}
                        />
                        {child.rewards.length > 1 && (
                          <TouchableOpacity onPress={() => removeReward(r.id)} style={pStyles.removeRewardBtn}>
                            <Text style={{ color: COLORS.red, fontSize: 13 }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={addStyles.rewardedAfterLabel}>REWARDED AFTER</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {options.map(opt => {
                          const sel = r.days === opt.days;
                          return (
                            <TouchableOpacity
                              key={opt.days}
                              onPress={() => updateReward(r.id, 'days', opt.days)}
                              style={[pStyles.dChip, sel && { borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.25)' }]}
                            >
                              <Text style={[pStyles.dChipText, sel && { color: COLORS.white }]}>{opt.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}

                {child.rewards.length < 8 && (
                  <TouchableOpacity onPress={addReward} style={[pStyles.addRewardBtn, { marginLeft: 0, marginBottom: 16 }]}>
                    <Text style={[pStyles.addRewardText, { color: '#818cf8' }]}>+ Add Reward</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleDone} style={addStyles.addBtn}>
                  <LinearGradient colors={['#818cf8', '#c084fc']} style={addStyles.addBtnGrad}>
                    <Text style={addStyles.addBtnText}>Save {child.name} →</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Account Modal ─────────────────────────────────────────────────────────────
function AccountModal({ visible, onClose }) {
  const { authUser, parentData } = useApp();
  const [displayName, setDisplayName]   = useState('');
  const [nameLoading, setNameLoading]   = useState(false);
  const [nameSaved, setNameSaved]       = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent]       = useState(false);
  // delete flow: 'idle' | 'confirm' | 'reauth' | 'deleting'
  const [deleteStep, setDeleteStep]     = useState('idle');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError]   = useState('');

  const isEmailProvider = authUser?.providerData?.[0]?.providerId === 'password';

  useEffect(() => {
    if (visible) {
      setDisplayName(parentData?.name || '');
      setNameSaved(false);
      setResetSent(false);
      setDeleteStep('idle');
      setDeletePassword('');
      setDeleteError('');
    }
  }, [visible]);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === parentData?.name) return;
    setNameLoading(true);
    try {
      await updateDoc(doc(db, 'users', authUser.uid), { name: trimmed });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (e) {
      // silently fail
    } finally {
      setNameLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!authUser?.email) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, authUser.email);
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteStep('deleting');
    try {
      // Reauthenticate for email/password users
      if (isEmailProvider) {
        const credential = EmailAuthProvider.credential(authUser.email, deletePassword);
        await reauthenticateWithCredential(authUser, credential);
      }

      // Delete all children docs
      const childrenSnap = await getDocs(
        query(collection(db, 'children'), where('parentId', '==', authUser.uid))
      );
      const batch = writeBatch(db);
      childrenSnap.docs.forEach(d => batch.delete(d.ref));
      // Delete user profile doc
      batch.delete(doc(db, 'users', authUser.uid));
      await batch.commit();

      // Delete Firebase Auth account — triggers onAuthStateChanged → 'none'
      await deleteUser(authUser);
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
        setDeleteStep('reauth');
      } else if (e.code === 'auth/requires-recent-login') {
        setDeleteError('Please sign out, sign back in, then try again.');
        setDeleteStep('idle');
      } else {
        setDeleteError('Something went wrong. Please try again.');
        setDeleteStep('confirm');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={pStyles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[pStyles.sheet, { height: '85%' }]}>
            <View style={pStyles.handle} />

            {/* Header */}
            <View style={[pStyles.header, { paddingBottom: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={pStyles.childName}>Account</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                  {authUser?.email}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={pStyles.closeBtn}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 24 }}>

              {/* ── Edit Name ── */}
              <View>
                <Text style={acctStyles.sectionLabel}>DISPLAY NAME</Text>
                <View style={acctStyles.row}>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={[acctStyles.input, { flex: 1 }]}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    disabled={nameLoading || !displayName.trim() || displayName.trim() === parentData?.name}
                    style={[acctStyles.saveBtn, (nameLoading || !displayName.trim() || displayName.trim() === parentData?.name) && { opacity: 0.4 }]}
                  >
                    {nameLoading
                      ? <ActivityIndicator color="#818cf8" size="small" />
                      : <Text style={acctStyles.saveBtnText}>{nameSaved ? '✓ Saved' : 'Save'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Reset Password ── */}
              {isEmailProvider && (
                <View>
                  <Text style={acctStyles.sectionLabel}>PASSWORD</Text>
                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={resetLoading || resetSent}
                    style={[acctStyles.actionBtn, (resetLoading || resetSent) && { opacity: 0.5 }]}
                  >
                    {resetLoading
                      ? <ActivityIndicator color="#818cf8" size="small" />
                      : <Text style={acctStyles.actionBtnText}>
                          {resetSent ? '✓ Reset email sent' : 'Send Password Reset Email'}
                        </Text>
                    }
                  </TouchableOpacity>
                  {resetSent && (
                    <Text style={acctStyles.hint}>Check your inbox at {authUser?.email}</Text>
                  )}
                </View>
              )}

              {/* ── Delete Account ── */}
              <View style={acctStyles.dangerZone}>
                <Text style={acctStyles.dangerLabel}>DELETE ACCOUNT</Text>
                <Text style={acctStyles.dangerDesc}>
                  Deleting your account permanently removes all your data including all children's prayer records and rewards. This cannot be undone.
                </Text>

                {deleteStep === 'idle' && (
                  <TouchableOpacity
                    onPress={() => setDeleteStep('confirm')}
                    style={acctStyles.deleteBtn}
                  >
                    <Text style={acctStyles.deleteBtnText}>Delete Account</Text>
                  </TouchableOpacity>
                )}

                {deleteStep === 'confirm' && (
                  <View style={{ gap: 10 }}>
                    <Text style={acctStyles.dangerConfirmText}>
                      Are you sure? This will delete your account and all data permanently.
                    </Text>
                    {deleteError ? <Text style={acctStyles.errorText}>{deleteError}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => { setDeleteStep('idle'); setDeleteError(''); }} style={[acctStyles.actionBtn, { flex: 1 }]}>
                        <Text style={acctStyles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => isEmailProvider ? setDeleteStep('reauth') : handleDeleteAccount()}
                        style={[acctStyles.deleteBtn, { flex: 1 }]}
                      >
                        <Text style={acctStyles.deleteBtnText}>Yes, Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {deleteStep === 'reauth' && (
                  <View style={{ gap: 10 }}>
                    <Text style={acctStyles.hint}>Enter your password to confirm deletion:</Text>
                    <TextInput
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      placeholder="Your password"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      secureTextEntry
                      style={acctStyles.input}
                      autoFocus
                    />
                    {deleteError ? <Text style={acctStyles.errorText}>{deleteError}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => { setDeleteStep('idle'); setDeleteError(''); setDeletePassword(''); }} style={[acctStyles.actionBtn, { flex: 1 }]}>
                        <Text style={acctStyles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDeleteAccount}
                        disabled={!deletePassword}
                        style={[acctStyles.deleteBtn, { flex: 1 }, !deletePassword && { opacity: 0.4 }]}
                      >
                        <Text style={acctStyles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {deleteStep === 'deleting' && (
                  <View style={{ alignItems: 'center', paddingVertical: 12, gap: 8 }}>
                    <ActivityIndicator color="#f87171" />
                    <Text style={acctStyles.hint}>Deleting account…</Text>
                  </View>
                )}
              </View>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const acctStyles = StyleSheet.create({
  sectionLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    color: '#ffffff', fontSize: 15, fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: 'rgba(129,140,248,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.4)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 72,
  },
  saveBtnText: { color: '#818cf8', fontSize: 13, fontWeight: '800' },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 },
  dangerZone: {
    backgroundColor: 'rgba(248,113,113,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 18, padding: 16, gap: 12,
  },
  dangerLabel: {
    color: '#f87171', fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  dangerDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 19 },
  dangerConfirmText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  deleteBtn: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#f87171', fontSize: 14, fontWeight: '800' },
  errorText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
});

// ─── Child Profile Modal ───────────────────────────────────────────────────────
function ChildProfileModal({ visible, onClose, childId, theme }) {
  const { state, getTodayLog, getStreak, getPoints, updateChildRewards, removeChild } = useApp();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [rewardsEditing, setRewardsEditing] = useState(false);
  const child = state.children.find(c => c.id === childId);
  if (!child) return null;

  const log = getTodayLog(child.id);
  const streak = getStreak(child.id);
  const logs = state.prayerLogs[child.id] || {};
  const today = todayKey();
  const completeDays = Object.values(logs).filter(day => PRAYERS.every(p => day[p.id])).length;
  const awardsEarned = child.rewards.filter(r => completeDays >= r.days).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pStyles.sheet, { height: '88%' }]}>
          <View style={pStyles.handle} />

          {/* Header */}
          <View style={pStyles.header}>
            <LinearGradient colors={theme.grad} style={pStyles.avatar}>
              <Text style={{ fontSize: 26 }}>{child.avatar}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.childName}>{child.name}</Text>
              <View style={pStyles.chips}>
                <View style={pStyles.chip}>
                  <Text style={pStyles.chipText}>✓ {completeDays} {completeDays === 1 ? 'day' : 'days'}</Text>
                </View>
                <View style={pStyles.chip}>
                  <Text style={pStyles.chipText}>🏆 {awardsEarned}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={pStyles.closeBtn}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <HistorySection logs={logs} todayLog={log} today={today} theme={theme} />

            <View style={[pStyles.sectionRow, { marginTop: 20 }]}>
              <Text style={pStyles.sectionLabel}>REWARDS JOURNEY</Text>
              <TouchableOpacity
                onPress={() => setRewardsEditing(e => !e)}
                style={[pStyles.editBtn, rewardsEditing && { backgroundColor: COLORS.purple + '20', borderColor: COLORS.purple + '60' }]}
              >
                <Text style={[pStyles.editBtnText, rewardsEditing && { color: COLORS.purple }]}>
                  {rewardsEditing ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            <RewardsJourney
              child={child}
              completeDays={completeDays}
              theme={theme}
              updateChildRewards={updateChildRewards}
              isEditing={rewardsEditing}
            />

            {/* Remove child */}
            {confirmRemove ? (
              <View style={pStyles.removeConfirm}>
                <Text style={pStyles.removeConfirmText}>Remove {child.name}? This can't be undone.</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => setConfirmRemove(false)} style={pStyles.cancelBtn}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { removeChild(child.id); onClose(); }}
                    style={pStyles.confirmRemoveBtn}
                  >
                    <Text style={{ color: COLORS.red, fontWeight: '800', fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setConfirmRemove(true)} style={pStyles.removeBtn}>
                <Text style={pStyles.removeBtnText}>Remove {child.name}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Child Card ────────────────────────────────────────────────────────────────
function ChildRow({ child, theme, log, streak, completeDays, onPress, onShare, onTogglePrayer }) {
  const done = PRAYERS.filter(p => log[p.id]).length;
  const awardsEarned = child.rewards.filter(r => completeDays >= r.days).length;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.childCard}>
      {/* Header row */}
      <View style={styles.childCardHeader}>
        <LinearGradient colors={theme.grad} style={styles.rowAvatar}>
          <Text style={{ fontSize: 22 }}>{child.avatar}</Text>
        </LinearGradient>
        <Text style={styles.rowName}>{child.name || 'Unnamed'}</Text>
        <Text style={styles.cardChevron}>›</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onShare} style={styles.shareBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.shareBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Prayer emoji row */}
      <View style={styles.prayerRow}>
        {PRAYERS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.prayerItem}
            onPress={() => onTogglePrayer(p.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={[
              styles.prayerEmojiBox,
              log[p.id]
                ? { backgroundColor: p.color + '25', borderColor: p.color + '80' }
                : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
            ]}>
              <Text style={[styles.prayerEmoji, { opacity: log[p.id] ? 1 : 0.3 }]}>{p.emoji}</Text>
            </View>
            <Text style={[styles.prayerLabel, { color: log[p.id] ? p.color : 'rgba(255,255,255,0.3)' }]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.cardStatsRow}>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatValue}>{completeDays}</Text>
          <Text style={styles.cardStatLabel}>full days</Text>
        </View>
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatValue}>{awardsEarned}</Text>
          <Text style={styles.cardStatLabel}>awards</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ParentDashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, parentData, getTodayLog, getStreak, getCompleteDays, togglePrayer } = useApp();
  const { children } = state;
  const greeting = getGreeting();
  const [selectedChild, setSelectedChild] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [inviteChild, setInviteChild] = useState(null); // child object to invite
  const [showAccount, setShowAccount] = useState(false);

  const totalDone = children.reduce((sum, c) =>
    sum + PRAYERS.filter(p => getTodayLog(c.id)[p.id]).length, 0);
  const totalMax = children.length * 5;
  const pct = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0;
  const prayerTotals = PRAYERS.map(p => ({
    ...p, done: children.filter(c => getTodayLog(c.id)[p.id]).length,
  }));

  return (
    <LinearGradient colors={['#0d0d1a', '#130d2e', '#0d0d1a']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSmall}>{greeting.emoji} {greeting.text}</Text>
            <TouchableOpacity onPress={() => setShowAccount(true)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <Text style={styles.parentName}>{parentData?.name?.split(' ')[0] || 'Parent'}</Text>
              <View style={styles.accountIconBadge}>
                <Text style={{ fontSize: 12 }}>⚙️</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Children List */}
        {children.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionLabel}>TODAY'S PROGRESS</Text>
            <TouchableOpacity onPress={() => setShowAddChild(true)} style={styles.addChildBtn}>
              <Text style={styles.addChildBtnText}>+ Add Child</Text>
            </TouchableOpacity>
          </View>
        )}
        {children.length > 0 ? children.map((child, i) => {
          const theme = CHILD_THEMES[i % CHILD_THEMES.length];
          return (
            <ChildRow
              key={child.id}
              child={child}
              theme={theme}
              log={getTodayLog(child.id)}
              streak={getStreak(child.id)}
              completeDays={getCompleteDays(child.id)}
              onPress={() => setSelectedChild({ childId: child.id, theme, index: i })}
              onShare={() => setInviteChild(child)}
              onTogglePrayer={(prayerId) => togglePrayer(child.id, prayerId)}
            />
          );
        }) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Add your first child</Text>
            <Text style={styles.emptySub}>
              Set up a profile, track their daily prayers, and motivate them with custom rewards.
            </Text>
            <TouchableOpacity onPress={() => setShowAddChild(true)} style={styles.emptyBtn}>
              <LinearGradient colors={['#818cf8', '#c084fc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Add Your First Child →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {children.length > 0 && <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>🕌</Text>
          <Text style={styles.quoteText}>"Prayer is the pillar of religion."</Text>
          <Text style={styles.quoteSource}>— Hadith</Text>
        </View>}

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            await signOut(auth);
            // App.js onAuthStateChanged fires with null → clears stale mode →
            // setStatus('none') → navigator automatically shows ModeSelect.
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {selectedChild && (
        <ChildProfileModal
          visible={!!selectedChild}
          onClose={() => setSelectedChild(null)}
          childId={selectedChild.childId}
          theme={selectedChild.theme}
        />
      )}

      <InviteModal
        visible={!!inviteChild}
        onClose={() => setInviteChild(null)}
        child={inviteChild}
      />

      <AddChildModal
        visible={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSaved={(child) => { setShowAddChild(false); setInviteChild(child); }}
      />

      <AccountModal
        visible={showAccount}
        onClose={() => setShowAccount(false)}
      />
    </LinearGradient>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  greetingSmall: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  parentName: { color: COLORS.white, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  accountIconBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100, width: 26, height: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  dateText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 3 },
  parentAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#818cf8', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  parentAvatarText: { color: COLORS.white, fontSize: 22, fontWeight: '900' },

  progressCard: {
    backgroundColor: 'rgba(129,140,248,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 22, padding: 18,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  progressLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  progressBig: { color: COLORS.white, fontSize: 38, fontWeight: '900', lineHeight: 42 },
  progressOf: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '700', paddingBottom: 6 },
  pctCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(129,140,248,0.15)',
    borderWidth: 2, borderColor: 'rgba(129,140,248,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  pctText: { color: COLORS.purple, fontSize: 15, fontWeight: '900' },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 16 },
  barFill: { height: '100%', borderRadius: 100 },
  breakdown: { flexDirection: 'row', justifyContent: 'space-between' },
  breakItem: { alignItems: 'center', gap: 3 },
  breakEmoji: { fontSize: 16 },
  breakCount: { fontSize: 12, fontWeight: '900' },
  breakName: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '700' },

  emptyState: {
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20,
    backgroundColor: 'rgba(129,140,248,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.12)',
    borderRadius: 28, gap: 12,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 4 },
  emptyTitle: { color: COLORS.white, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  emptySub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  emptyFeatures: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  emptyFeaturePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6,
  },
  emptyFeatureText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  emptyBtn: { borderRadius: 16, overflow: 'hidden', width: '100%', marginTop: 8 },
  emptyBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  emptyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },

  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: -2 },
  addChildBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
    backgroundColor: 'rgba(129,140,248,0.1)',
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)',
  },
  addChildBtnText: { color: COLORS.purple, fontSize: 12, fontWeight: '800' },

  childCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 12, gap: 10,
  },
  cardChevron: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '400', marginLeft: 2, marginTop: 2 },
  childCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  rowName: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  doneBadge: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  doneBadgeText: { fontSize: 11, fontWeight: '900' },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  streakText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  prayerItem: { alignItems: 'center', gap: 4, flex: 1 },
  prayerEmojiBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  prayerEmoji: { fontSize: 18 },
  prayerLabel: { fontSize: 9, fontWeight: '700' },

  cardStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 6, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 24,
  },
  cardStat: { alignItems: 'center', gap: 1 },
  cardStatValue: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  cardStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  quoteCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, alignItems: 'center', gap: 6,
  },
  quoteIcon: { fontSize: 28 },
  quoteText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  quoteSource: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '700' },

  shareBtn: {
    height: 28, borderRadius: 14, paddingHorizontal: 12,
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtnText: { color: '#818cf8', fontSize: 12, fontWeight: '800' },

  signOutBtn: {
    alignSelf: 'center', marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700' },
});

// ─── Profile Modal Styles ──────────────────────────────────────────────────────
const pStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#130d2e',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: { width: 38, height: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  childName: { color: COLORS.white, fontSize: 20, fontWeight: '900', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  tabBar: { flexDirection: 'row', gap: 5 },
  tabBtn: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 14, marginBottom: 4,
  },

  // Prayer rows (today tab)
  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  prayerDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  prayerEmoji: { fontSize: 20, width: 26 },
  prayerName: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  prayerTime: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, fontWeight: '900' },

  // Week tab
  dayCol: { alignItems: 'center', gap: 5, flex: 1 },
  dayLetter: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800' },
  dayCircle: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  dayCount: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '900' },
  weekDots: { gap: 3, alignItems: 'center' },
  weekDotsRow: { flexDirection: 'row', gap: 3 },
  weekDot: { width: 6, height: 6, borderRadius: 3 },
  futureDash: { color: 'rgba(255,255,255,0.1)', fontSize: 12 },

  // Month tab
  monthTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  monthDowRow: { flexDirection: 'row', marginBottom: 6 },
  monthDow: { width: `${100 / 7}%`, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  monthDayCircle: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  monthDayNum: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  monthMiniDots: { flexDirection: 'row', gap: 1.5, marginTop: 1 },
  monthMiniDot: { width: 4, height: 4, borderRadius: 2 },

  // Rewards journey
  journeyStep: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  journeyLeft: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900' },
  stepLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4, borderRadius: 1 },

  journeyCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 14, marginBottom: 8,
  },
  journeyCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  journeyRewardName: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  journeyRewardDays: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },

  earnedBadge: { marginTop: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  earnedText: { fontSize: 12, fontWeight: '800' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  progressPct: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 100 },

  editInput: { color: COLORS.white, fontSize: 14, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 2 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  editBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800' },
  removeRewardBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  addRewardBtn: {
    marginTop: 4, marginLeft: 40, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed', alignItems: 'center',
  },
  addRewardText: { fontSize: 13, fontWeight: '800' },
  dChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginRight: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  dChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },

  removeBtn: {
    marginTop: 8, paddingVertical: 12, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center',
  },
  removeBtnText: { color: COLORS.red, fontSize: 13, fontWeight: '700' },
  removeConfirm: {
    marginTop: 8, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', gap: 12,
  },
  removeConfirmText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  confirmRemoveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center' },
});

// ─── Add Child Modal Styles ────────────────────────────────────────────────────
const addStyles = StyleSheet.create({
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 8,
  },
  avatarBtnSel: { borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.2)' },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 13,
    color: COLORS.white, fontSize: 16, padding: 14,
  },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center',
  },
  genderBtnSel: { borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.18)' },
  addBtn: { borderRadius: 15, overflow: 'hidden' },
  addBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  addBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '900' },

  rewardsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { width: 48, paddingVertical: 4 },
  backBtnText: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '700' },
  rewardCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  rewardCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardNameInput: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 2 },
  rewardedAfterLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 12 },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.25)',
  },
  aiBtnActive: { backgroundColor: 'rgba(192,132,252,0.15)', borderColor: 'rgba(192,132,252,0.5)' },
  aiBtnText: { flex: 1, color: '#c084fc', fontSize: 13, fontWeight: '800' },
  aiBtnChevron: { color: '#c084fc', fontSize: 14 },

  suggestPanel: {
    backgroundColor: 'rgba(192,132,252,0.06)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)',
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  suggestLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  suggestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: 'rgba(192,132,252,0.1)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)',
  },
  suggestChipText: { color: '#c084fc', fontSize: 12, fontWeight: '700' },
});

// ─── Invite Modal Styles ───────────────────────────────────────────────────────
const invStyles = StyleSheet.create({
  inviteTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  inviteSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },

  qrBox: {
    alignSelf: 'center',
    backgroundColor: '#0d0a1e',
    borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.3)',
    marginBottom: 20,
    shadowColor: '#818cf8', shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },

  codeBox: {
    alignItems: 'center', marginBottom: 14,
    backgroundColor: 'rgba(129,140,248,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
  },
  codeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  codeText: { color: '#818cf8', fontSize: 30, fontWeight: '900', letterSpacing: 8 },

  instruction: {
    color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center',
    lineHeight: 18, marginBottom: 20,
  },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.3)' },
  actionBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
