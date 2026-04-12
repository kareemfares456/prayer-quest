import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, PRAYERS } from '../constants';
import { useApp } from '../context/AppContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CHILD_THEMES = [
  { grad: ['#818cf8', '#c084fc'], bg: ['#0a0820', '#130d2e', '#0a0820'], accent: '#818cf8' },
  { grad: ['#34d399', '#10b981'], bg: ['#061510', '#0a2018', '#061510'], accent: '#34d399' },
  { grad: ['#fbbf24', '#f59e0b'], bg: ['#140e02', '#1e1506', '#140e02'], accent: '#fbbf24' },
  { grad: ['#f472b6', '#ec4899'], bg: ['#150610', '#1e0a18', '#150610'], accent: '#f472b6' },
  { grad: ['#fb923c', '#f97316'], bg: ['#140a04', '#1e1008', '#140a04'], accent: '#fb923c' },
  { grad: ['#60a5fa', '#3b82f6'], bg: ['#040e20', '#081530', '#040e20'], accent: '#60a5fa' },
];


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
const CelebrationOverlay = ({ visible, childName, latestEarned }) => {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(0.6)).current;
  const [confetti, setConfetti] = useState([]);

  const celebColors = ['#818cf8','#c084fc','#fbbf24','#34d399','#fb923c','#60a5fa','#f472b6','#ffffff'];

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
        <Animated.View style={[hStyles.celebCard, { transform: [{ scale }] }]}>
          <Text style={{ fontSize: 64, marginBottom: 8 }}>🎉</Text>
          <Text style={hStyles.celebTitle}>Mashallah!</Text>
          <Text style={hStyles.celebName}>{childName}!</Text>
          <Text style={hStyles.celebSub}>
            {latestEarned
              ? `${latestEarned.icon || '🏆'} ${latestEarned.label?.trim() || 'Reward'} earned — Mashallah!`
              : 'All 5 prayers done today 🙏'}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─── Prayer Gauge ─────────────────────────────────────────────────────────────
const ENCOURAGE = ['', 'Great start! 🌟', "You're doing great! ✨", 'More than halfway! 💪', 'Almost there! 🔥', 'Mashallah! All done! 🎉'];

// Arc goes from 135° (lower-left / ~7 o'clock) clockwise 270° to 45° (lower-right / ~5 o'clock)
// leaving a gap at the bottom. Exactly 5 dots — one per prayer.
const GAUGE_START_DEG = 135;
const GAUGE_ARC_DEG   = 270;

// Linear interpolation between two hex colours (as RGB)
function lerpColor(hexA, hexB, t) {
  const parse = h => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

// Gradient stops: green → teal → indigo → purple
function gaugeColor(t) {
  const stops = ['#4ade80', '#06b6d4', '#818cf8', '#c084fc'];
  const seg = (stops.length - 1) * t;
  const idx = Math.min(Math.floor(seg), stops.length - 2);
  return lerpColor(stops[idx], stops[idx + 1], seg - idx);
}

// Convert polar angle → SVG cartesian
function polarToCart(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Build an SVG arc path (always clockwise)
function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToCart(cx, cy, r, startDeg);
  const e = polarToCart(cx, cy, r, endDeg);
  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function PrayerGauge({ todayLog, theme }) {
  const count = PRAYERS.filter(p => todayLog[p.id]).length;
  const N     = PRAYERS.length; // 5
  const SIZE  = 220;
  const R     = 92;
  const cx    = SIZE / 2;
  const cy    = SIZE / 2;
  const DOT_R = 11;   // large dot radius
  const GLOW  = 18;   // glow halo radius for the last filled dot
  const LINE_W = 3.5; // arc stroke width

  // 5 dots evenly placed along the 270° arc
  const dots = Array.from({ length: N }, (_, i) => {
    const deg = GAUGE_START_DEG + (GAUGE_ARC_DEG * i) / (N - 1);
    const t   = i / (N - 1);
    const pos = polarToCart(cx, cy, R, deg);
    return { ...pos, t, deg };
  });

  // The filled arc ends at the last completed dot's angle (count>1 to avoid zero-length arc)
  const filledEndDeg = count > 1
    ? GAUGE_START_DEG + (GAUGE_ARC_DEG * (count - 1)) / (N - 1)
    : null;
  const fullEndDeg = GAUGE_START_DEG + GAUGE_ARC_DEG; // 405° → same as 45°

  // Gradient anchor points: start=dot[0], end=dot[4] (horizontal span of the arc)
  const gx1 = dots[0].x;
  const gy1 = dots[0].y;
  const gx2 = dots[N - 1].x;
  const gy2 = dots[N - 1].y;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 6 }}>
      <View style={{ width: SIZE, height: SIZE }}>
        {/* SVG: arc lines + 5 prayer dots */}
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
          <Defs>
            {/* Gradient runs from arc start → arc end (left → right) */}
            <LinearGradient id="arcGrad" x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="userSpaceOnUse">
              <Stop offset="0"    stopColor="#4ade80" />
              <Stop offset="0.35" stopColor="#06b6d4" />
              <Stop offset="0.7"  stopColor="#818cf8" />
              <Stop offset="1"    stopColor="#c084fc" />
            </LinearGradient>
          </Defs>

          {/* Faint full-arc track */}
          <Path
            d={arcPath(cx, cy, R, GAUGE_START_DEG, fullEndDeg)}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={LINE_W}
            fill="none"
            strokeLinecap="round"
          />

          {/* Gradient filled arc (only when 2+ prayers done) */}
          {filledEndDeg && (
            <Path
              d={arcPath(cx, cy, R, GAUGE_START_DEG, filledEndDeg)}
              stroke="url(#arcGrad)"
              strokeWidth={LINE_W}
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Glow behind last filled dot */}
          {count > 0 && (
            <Circle cx={dots[count - 1].x} cy={dots[count - 1].y} r={GLOW} fill={gaugeColor(dots[count - 1].t)} opacity={0.22} />
          )}

          {/* 5 prayer dots */}
          {dots.map((d, i) => (
            <Circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={DOT_R}
              fill={i < count ? gaugeColor(d.t) : 'rgba(255,255,255,0.10)'}
            />
          ))}
        </Svg>

        {/* Center content */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 68 }}>{count}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>of 5 prayers</Text>
          {count > 0 && (
            <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '800', marginTop: 5, textAlign: 'center', paddingHorizontal: 30 }}>
              {ENCOURAGE[count]}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Prayer Buttons ───────────────────────────────────────────────────────────
function PrayerButtons({ todayLog, onToggle, theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {PRAYERS.map(p => {
        const done = !!todayLog[p.id];
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onToggle(p.id)}
            activeOpacity={0.75}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: done ? theme.accent + '22' : 'rgba(255,255,255,0.05)',
              borderWidth: 1.5,
              borderColor: done ? theme.accent + '70' : 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
            <Text style={{ color: done ? theme.accent : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', marginTop: 5 }}>
              {p.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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

      {tab === 'today' && (
        <>
          <PrayerGauge todayLog={todayLog} theme={theme} />
          <PrayerButtons todayLog={todayLog} onToggle={onTogglePrayer} theme={theme} />
        </>
      )}

      <View style={tab !== 'today' ? hStyles.card : null}>
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
  const { state, appStatus, savedChildId: contextChildId, clearChildSession, loadChildById, togglePrayer, getTodayLog, getStreak, getCompleteDays } = useApp();
  const { childId: paramChildId } = route.params || {};
  // Fall back to context's savedChildId in case initialParams weren't set yet
  const childId = paramChildId ?? contextChildId;

  useEffect(() => {
    if (childId && !state.children.find(c => c.id === childId)) {
      loadChildById(childId);
    }
  }, [childId]);

  const childIndex  = state.children.findIndex(c => c.id === childId);
  const child       = state.children[childIndex] ?? state.children[0];
  const theme = CHILD_THEMES[Math.max(0, childIndex) % CHILD_THEMES.length];

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
                <Text style={hStyles.chipText}>✓ {completeDays} {completeDays === 1 ? 'day' : 'days'}</Text>
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

        {/* ─── Sign out / Back ────────────────────────────────────── */}
        <TouchableOpacity
          style={hStyles.signOutBtn}
          onPress={async () => {
            if (appStatus === 'child') {
              // clearChildSession resets appStatus to 'none', which causes the
              // navigator to switch to the logged-out group (ModeSelect) automatically.
              await clearChildSession();
            } else {
              // In parent mode, this screen is pushed onto the parent stack —
              // just go back to ParentDashboard.
              navigation.goBack();
            }
          }}
        >
          <Text style={hStyles.signOutText}>{appStatus === 'child' ? 'Sign Out' : '← Back'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CelebrationOverlay visible={showCelebration} childName={child.name} latestEarned={latestEarned} />
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
