import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, PRAYERS } from '../constants';
import { useApp } from '../context/AppContext';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CHILD_THEMES = [
  { grad: ['#818cf8', '#c084fc'], bg: ['#0a0820', '#130d2e', '#0a0820'], accent: '#818cf8' },
  { grad: ['#34d399', '#10b981'], bg: ['#061510', '#0a2018', '#061510'], accent: '#34d399' },
  { grad: ['#fbbf24', '#f59e0b'], bg: ['#140e02', '#1e1506', '#140e02'], accent: '#fbbf24' },
  { grad: ['#f472b6', '#ec4899'], bg: ['#150610', '#1e0a18', '#150610'], accent: '#f472b6' },
  { grad: ['#fb923c', '#f97316'], bg: ['#140a04', '#1e1008', '#140a04'], accent: '#fb923c' },
  { grad: ['#60a5fa', '#3b82f6'], bg: ['#040e20', '#081530', '#040e20'], accent: '#60a5fa' },
];

const BOY_THEME = {
  grad: ['#ef4444', '#1d4ed8'],
  bg: ['#060810', '#0a1428', '#0d0510'],
  accent: '#ef4444',
  backLabel: '⚡ HQ',
  celebEmoji: '⚡',
  celebTitle: 'LEGENDARY!',
  celebSub: 'All 5 missions complete! 🦸',
  getMotivation: (n) =>
    n === 0 ? 'Suit up, hero — every prayer is your power! ⚡'
    : n < 3  ? `Strong start! ${5 - n} more missions to go.`
    : n < 5  ? `Hero mode! Just ${5 - n} left! 💥`
    : 'LEGENDARY! All missions complete! 🏆',
};

const GIRL_THEME = {
  grad: ['#ec4899', '#c084fc'],
  bg: ['#1a0520', '#2d0838', '#1a0520'],
  accent: '#ec4899',
  backLabel: '💖 Home',
  celebEmoji: '💖',
  celebTitle: 'Fabulous!',
  celebSub: 'All 5 prayers sparkle today! ✨',
  getMotivation: (n) =>
    n === 0 ? 'Shine bright — every prayer is magic! ✨'
    : n < 3  ? `Glowing start! ${5 - n} more to sparkle! 💫`
    : n < 5  ? `Almost there! Just ${5 - n} left! 💖`
    : 'You are absolutely AMAZING today! 👑',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Tahajjud time 🌙';
  if (h < 12) return 'Good morning ☀️';
  if (h < 17) return 'Good afternoon 🌤️';
  if (h < 20) return 'Good evening 🌅';
  return 'Good night 🌙';
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

// ─── Confetti Piece ───────────────────────────────────────────────────────────
const ConfettiPiece = ({ x, color, size, delay }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const rotate     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 160;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H + 60, duration: 3500, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: drift, duration: 3500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 3500, delay: 2000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 6.28, duration: 3500, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, []);

  const rot = rotate.interpolate({ inputRange: [0, 6.28], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: size, height: size, backgroundColor: color, borderRadius: 3,
      opacity, transform: [{ translateY }, { translateX }, { rotate: rot }],
    }} />
  );
};

// ─── Celebration Overlay ──────────────────────────────────────────────────────
const CelebrationOverlay = ({ visible, childName, gender, latestEarned }) => {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(0.6)).current;
  const [confetti, setConfetti] = useState([]);

  const isBoy  = gender === 'boy';
  const isGirl = gender === 'girl';
  const celebColors = isBoy
    ? ['#ef4444','#1d4ed8','#fbbf24','#ffffff','#60a5fa','#f97316','#dc2626','#93c5fd']
    : isGirl
    ? ['#ec4899','#c084fc','#f9a8d4','#ffffff','#f472b6','#e879f9','#fde68a','#d946ef']
    : ['#fbbf24','#818cf8','#34d399','#fb923c','#c084fc','#f472b6','#60a5fa','#ffffff'];

  useEffect(() => {
    if (visible) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_W,
        color: celebColors[i % celebColors.length],
        size: 12 + Math.random() * 8,
        delay: Math.random() * 600,
      }));
      setConfetti(pieces);
      Animated.parallel([
        Animated.spring(bgOpacity, { toValue: 1, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.timing(bgOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();
      }, 3500);
    } else {
      bgOpacity.setValue(0);
      scale.setValue(0.6);
      setConfetti([]);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {confetti.map(c => <ConfettiPiece key={c.id} {...c} />)}
      <Animated.View style={[hStyles.celebBg, { opacity: bgOpacity }]}>
        <Animated.View style={[
          hStyles.celebCard,
          { transform: [{ scale }] },
          isBoy  && { borderColor: 'rgba(239,68,68,0.6)', shadowColor: '#ef4444' },
          isGirl && { borderColor: 'rgba(236,72,153,0.6)', shadowColor: '#ec4899' },
        ]}>
          <Text style={{ fontSize: 64, marginBottom: 8 }}>
            {isBoy ? '⚡' : isGirl ? '💖' : '🎉'}
          </Text>
          <Text style={[
            hStyles.celebTitle,
            isBoy  && { color: '#ef4444' },
            isGirl && { color: '#ec4899' },
          ]}>
            {isBoy ? 'LEGENDARY!' : isGirl ? 'Fabulous!' : 'Mashallah!'}
          </Text>
          <Text style={hStyles.celebName}>{childName}!</Text>
          <Text style={hStyles.celebSub}>
            {latestEarned
              ? `${latestEarned.icon || '🏆'} ${latestEarned.label?.trim() || 'Reward'} earned — Mashallah!`
              : isBoy ? 'All 5 missions complete! 🦸' : isGirl ? 'All 5 prayers sparkle today! ✨' : 'All 5 prayers done today 🙏'}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─── Prayer History Section ───────────────────────────────────────────────────
function HistorySection({ logs, todayLog, today, theme, onTogglePrayer }) {
  const [tab, setTab] = useState('today');
  const days7 = getLast7Days();
  const { cells, monthName } = getMonthCalendar();

  return (
    <View style={{ gap: 8 }}>
      <View style={hStyles.sectionRow}>
        <Text style={hStyles.sectionLabel}>PROGRESS</Text>
        <View style={hStyles.tabBar}>
          {['today', 'week', 'month'].map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[hStyles.tabBtn, tab === t && { backgroundColor: theme.accent + '25', borderColor: theme.accent + '60' }]}
            >
              <Text style={[hStyles.tabText, tab === t && { color: theme.accent }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={hStyles.card}>
        {/* ── Today ── */}
        {tab === 'today' && PRAYERS.map((p, i) => {
          const done = !!todayLog[p.id];
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => onTogglePrayer(p.id)}
              activeOpacity={0.72}
              style={[
                hStyles.prayerRow,
                i < PRAYERS.length - 1 && hStyles.prayerDivider,
                done && { backgroundColor: p.color + '08' },
              ]}
            >
              <Text style={hStyles.prayerEmoji}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[hStyles.prayerName, done && { color: '#fff' }]}>{p.name}</Text>
                <Text style={hStyles.prayerTime}>{p.clockTime} · {p.time}</Text>
              </View>
              <View style={[hStyles.checkCircle, done && { backgroundColor: p.color + '20', borderColor: p.color }]}>
                {done && <Text style={[hStyles.checkMark, { color: p.color }]}>✓</Text>}
              </View>
            </TouchableOpacity>
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
                <View key={key} style={hStyles.dayCol}>
                  <Text style={[hStyles.dayLetter, isToday && { color: theme.accent }]}>
                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </Text>
                  <View style={[
                    hStyles.dayCircle,
                    isToday && { borderColor: theme.accent + '80' },
                    allDone && { backgroundColor: theme.accent + '25', borderColor: theme.accent },
                  ]}>
                    {isFuture
                      ? <Text style={hStyles.futureDash}>–</Text>
                      : (
                        <View style={hStyles.weekDots}>
                          <View style={hStyles.weekDotsRow}>
                            {PRAYERS.slice(0, 3).map(p => (
                              <View key={p.id} style={[hStyles.weekDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.12)' }]} />
                            ))}
                          </View>
                          <View style={hStyles.weekDotsRow}>
                            {PRAYERS.slice(3).map(p => (
                              <View key={p.id} style={[hStyles.weekDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.12)' }]} />
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
            <Text style={hStyles.monthTitle}>{monthName}</Text>
            <View style={hStyles.monthDowRow}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <Text key={i} style={hStyles.monthDow}>{d}</Text>
              ))}
            </View>
            <View style={hStyles.monthGrid}>
              {cells.map((cell, i) => {
                if (!cell) return <View key={i} style={hStyles.monthCell} />;
                const dayLog = logs[cell.key] || {};
                const count = PRAYERS.filter(p => dayLog[p.id]).length;
                const isToday = cell.key === today;
                const isFuture = cell.key > today;
                const allDone = count === 5 && !isFuture;
                return (
                  <View key={cell.key} style={hStyles.monthCell}>
                    <View style={[
                      hStyles.monthDayCircle,
                      isToday && { borderColor: theme.accent },
                      allDone && { backgroundColor: theme.accent + '30', borderColor: theme.accent },
                    ]}>
                      <Text style={[
                        hStyles.monthDayNum,
                        isToday && { color: theme.accent, fontWeight: '900' },
                        allDone && { color: theme.accent },
                        isFuture && { opacity: 0.2 },
                      ]}>{cell.d}</Text>
                    </View>
                    {!isFuture && (
                      <View style={hStyles.monthMiniDots}>
                        {PRAYERS.map(p => (
                          <View key={p.id} style={[hStyles.monthMiniDot, { backgroundColor: dayLog[p.id] ? p.color : 'rgba(255,255,255,0.1)' }]} />
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

// ─── Rewards Journey (read-only) ──────────────────────────────────────────────
function RewardsJourney({ rewards, completeDays, theme }) {
  const sorted = [...rewards].sort((a, b) => a.days - b.days);
  if (sorted.length === 0) return null;

  return (
    <View>
      {sorted.map((r, idx) => {
        const earned   = completeDays >= r.days;
        const isNext   = !earned && (idx === 0 || completeDays >= (sorted[idx - 1]?.days ?? 0));
        const progress = Math.min((completeDays / r.days) * 100, 100);
        const durationLabel = `${r.days} Day${r.days !== 1 ? 's' : ''}`;
        const isLast   = idx === sorted.length - 1;

        return (
          <View key={r.id} style={hStyles.journeyStep}>
            <View style={hStyles.journeyLeft}>
              <View style={[
                hStyles.stepDot,
                earned && { backgroundColor: theme.accent, borderColor: theme.accent },
                isNext && !earned && { borderColor: theme.accent },
              ]}>
                <Text style={[hStyles.stepNum, earned && { color: COLORS.white }, isNext && !earned && { color: theme.accent }]}>
                  {earned ? '✓' : idx + 1}
                </Text>
              </View>
              {!isLast && (
                <View style={[hStyles.stepLine, earned && { backgroundColor: theme.accent + '50' }]} />
              )}
            </View>

            <View style={[
              hStyles.journeyCard,
              isNext && { borderColor: theme.accent + '50', backgroundColor: theme.accent + '08' },
              earned && { borderColor: theme.accent + '30' },
            ]}>
              <View style={hStyles.journeyCardTop}>
                <Text style={{ fontSize: 24 }}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[hStyles.journeyRewardName, earned && { color: theme.accent }]}>
                    {r.label?.trim() || 'Unnamed'}
                  </Text>
                  <Text style={hStyles.journeyRewardDays}>{durationLabel}</Text>
                </View>
              </View>

              {earned ? (
                <View style={[hStyles.earnedBadge, { borderColor: theme.accent + '50', backgroundColor: theme.accent + '12' }]}>
                  <Text style={[hStyles.earnedText, { color: theme.accent }]}>🎉 Earned! ({r.days} complete days)</Text>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <View style={hStyles.progressRow}>
                    <Text style={hStyles.progressLabel}>{completeDays} / {r.days} complete days</Text>
                    <Text style={[hStyles.progressPct, isNext && { color: theme.accent }]}>{Math.round(progress)}%</Text>
                  </View>
                  <View style={hStyles.progressBg}>
                    <LinearGradient
                      colors={theme.grad}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[hStyles.progressFill, { width: `${Math.max(progress, 1)}%` }]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Kid Home Screen ─────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { state, loadChildById, togglePrayer, getTodayLog, getStreak, getCompleteDays } = useApp();
  const { childId } = route.params || {};

  useEffect(() => {
    if (childId && !state.children.find(c => c.id === childId)) {
      loadChildById(childId);
    }
  }, [childId]);

  const childIndex  = state.children.findIndex(c => c.id === childId);
  const child       = state.children[childIndex] ?? state.children[0];
  const baseTheme   = CHILD_THEMES[Math.max(0, childIndex) % CHILD_THEMES.length];
  const genderTheme = child?.gender === 'boy' ? BOY_THEME : child?.gender === 'girl' ? GIRL_THEME : null;
  const theme       = genderTheme ? { ...baseTheme, ...genderTheme } : baseTheme;

  const todayLog     = getTodayLog(child?.id);
  const streak       = getStreak(child?.id);
  const completeDays = getCompleteDays(child?.id);
  const prayedCount  = PRAYERS.filter(p => todayLog[p.id]).length;
  const allDone      = prayedCount === PRAYERS.length;
  const logs         = state.prayerLogs[child?.id] || {};

  const childRewards  = child?.rewards ?? [];
  const earnedRewards = childRewards.filter(r => completeDays >= r.days);
  const latestEarned  = earnedRewards.length > 0
    ? [...earnedRewards].sort((a, b) => b.days - a.days)[0]
    : null;

  const [showCelebration, setShowCelebration] = useState(false);

  // Pulse avatar while not all done
  const avatarPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (allDone) { avatarPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [allDone]);

  const handleTogglePrayer = (prayerId) => {
    if (!child) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasDone = !!todayLog[prayerId];
    togglePrayer(child.id, prayerId);
    if (!wasDone && prayedCount + 1 === PRAYERS.length) {
      setTimeout(() => {
        setShowCelebration(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowCelebration(false), 3500);
      }, 180);
    }
  };

  if (!child) {
    return (
      <LinearGradient colors={['#0d0d1a', '#1a1040', '#0d0d1a']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.bg} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[hStyles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ──────────────────────────────────────────── */}
        <View style={hStyles.header}>
          {/* Avatar with pulse */}
          <Animated.View style={{ transform: [{ scale: avatarPulse }] }}>
            <LinearGradient colors={theme.grad} style={[hStyles.headerAvatar, { shadowColor: theme.accent }]}>
              <Text style={{ fontSize: 28 }}>{child.avatar}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Name + chips */}
          <View style={{ flex: 1 }}>
            <Text style={hStyles.greetingText}>{getGreeting()}</Text>
            <Text style={hStyles.childName}>{child.name}</Text>
            <View style={hStyles.chips}>
              <View style={hStyles.chip}>
                <Text style={hStyles.chipText}>✓ {completeDays}d</Text>
              </View>
              <View style={[hStyles.chip, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '45' }]}>
                <Text style={[hStyles.chipText, { color: theme.accent }]}>🏆 {earnedRewards.length}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* ─── Progress ──────────────────────────────────────────── */}
        <HistorySection
          logs={logs}
          todayLog={todayLog}
          today={todayKey()}
          theme={theme}
          onTogglePrayer={handleTogglePrayer}
        />

        {/* ─── Motivational pill ─────────────────────────────────── */}
        <View style={hStyles.motivationPill}>
          <Text style={{ fontSize: 16 }}>🕌</Text>
          <Text style={hStyles.motivationText}>
            {allDone && latestEarned
              ? `${latestEarned.label?.trim() || 'Reward'} earned — keep it up! ${latestEarned.icon || '⭐'}`
              : genderTheme
              ? genderTheme.getMotivation(prayedCount)
              : prayedCount === 0
              ? 'Start your quest — every prayer counts!'
              : prayedCount < 3
              ? `Great start! ${5 - prayedCount} more to go.`
              : prayedCount < 5
              ? `Almost there! Just ${5 - prayedCount} left!`
              : 'Incredible work today! ⭐'}
          </Text>
        </View>

        {/* ─── Rewards Journey ───────────────────────────────────── */}
        {childRewards.length > 0 && (
          <>
            <View style={hStyles.sectionRow}>
              <Text style={hStyles.sectionLabel}>REWARDS JOURNEY</Text>
              {earnedRewards.length > 0 && (
                <View style={[hStyles.earnedChip, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '45' }]}>
                  <Text style={[hStyles.earnedChipText, { color: theme.accent }]}>
                    {earnedRewards.length}/{childRewards.length} earned
                  </Text>
                </View>
              )}
            </View>
            <RewardsJourney rewards={child.rewards} completeDays={completeDays} theme={theme} />
          </>
        )}

        {/* ─── Sign out ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={hStyles.signOutBtn}
          onPress={async () => {
            await signOut(auth);
            await AsyncStorage.removeItem('@pq/mode');
            navigation.replace('ModeSelect');
          }}
        >
          <Text style={hStyles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <CelebrationOverlay visible={showCelebration} childName={child.name} gender={child.gender} latestEarned={latestEarned} />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 14 },

  // Header (mirrors parent modal)
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  greetingText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  childName: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  tabBar: { flexDirection: 'row', gap: 5 },
  tabBtn: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 14,
  },

  // Today prayer rows
  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  prayerDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  prayerEmoji: { fontSize: 20, width: 26, textAlign: 'center' },
  prayerName: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '800' },
  prayerTime: { color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 1 },
  checkCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 14, fontWeight: '900' },

  // Week tab
  dayCol: { alignItems: 'center', gap: 5, flex: 1 },
  dayLetter: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800' },
  dayCircle: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
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
  earnedChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  earnedChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

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

  // Motivation
  motivationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
  },
  motivationText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, flex: 1, fontWeight: '700' },

  // Celebration
  celebBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  celebCard: {
    backgroundColor: 'rgba(10,10,28,0.96)',
    borderWidth: 2, borderColor: 'rgba(52,211,153,0.5)',
    borderRadius: 32, padding: 44, alignItems: 'center',
    shadowColor: '#34d399', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20,
    maxWidth: SCREEN_W - 80,
  },
  celebTitle: { color: '#34d399', fontSize: 32, fontWeight: '900', marginBottom: 4 },
  celebName: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  celebSub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },

  // Sign out
  signOutBtn: {
    alignSelf: 'center', marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700' },
});
