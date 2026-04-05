import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, PRAYERS } from '../constants';
import { useApp } from '../context/AppContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CHILD_THEMES = [
  { grad: ['#818cf8', '#c084fc'], bg: ['#0a0820', '#130d2e', '#0a0820'], accent: '#818cf8', light: 'rgba(129,140,248,0.15)' },
  { grad: ['#34d399', '#10b981'], bg: ['#061510', '#0a2018', '#061510'], accent: '#34d399', light: 'rgba(52,211,153,0.15)' },
  { grad: ['#fbbf24', '#f59e0b'], bg: ['#140e02', '#1e1506', '#140e02'], accent: '#fbbf24', light: 'rgba(251,191,36,0.15)' },
  { grad: ['#f472b6', '#ec4899'], bg: ['#150610', '#1e0a18', '#150610'], accent: '#f472b6', light: 'rgba(244,114,182,0.15)' },
  { grad: ['#fb923c', '#f97316'], bg: ['#140a04', '#1e1008', '#140a04'], accent: '#fb923c', light: 'rgba(251,146,60,0.15)' },
  { grad: ['#60a5fa', '#3b82f6'], bg: ['#040e20', '#081530', '#040e20'], accent: '#60a5fa', light: 'rgba(96,165,250,0.15)' },
];

// Superhero theme for boys
const BOY_THEME = {
  grad: ['#ef4444', '#1d4ed8'],
  bg: ['#060810', '#0a1428', '#0d0510'],
  accent: '#ef4444',
  light: 'rgba(239,68,68,0.15)',
  questLabel: "TODAY'S MISSION",
  backLabel: '⚡ HQ',
  allDoneEmoji: '🦸',
  allDoneText: 'Mission Complete! All 5 prayers!',
  allDoneColor: '#ef4444',
  celebEmoji: '⚡',
  celebTitle: 'LEGENDARY!',
  celebSub: 'All 5 missions complete! 🦸',
  getMotivation: (n) =>
    n === 0 ? 'Suit up, hero — every prayer is your power! ⚡'
    : n < 3  ? `Strong start! ${5 - n} more missions to go.`
    : n < 5  ? `Hero mode! Just ${5 - n} left! 💥`
    : 'LEGENDARY! All missions complete! 🏆',
};

// Barbie theme for girls
const GIRL_THEME = {
  grad: ['#ec4899', '#c084fc'],
  bg: ['#1a0520', '#2d0838', '#1a0520'],
  accent: '#ec4899',
  light: 'rgba(236,72,153,0.15)',
  questLabel: '✨ SPARKLE QUEST',
  backLabel: '💖 Home',
  allDoneEmoji: '👑',
  allDoneText: 'Amazing! All 5 prayers done! ✨',
  allDoneColor: '#ec4899',
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
const CelebrationOverlay = ({ visible, childName, gender }) => {
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
      <Animated.View style={[styles.celebBg, { opacity: bgOpacity }]}>
        <Animated.View style={[
          styles.celebCard,
          { transform: [{ scale }] },
          isBoy  && { borderColor: 'rgba(239,68,68,0.6)', shadowColor: '#ef4444' },
          isGirl && { borderColor: 'rgba(236,72,153,0.6)', shadowColor: '#ec4899' },
        ]}>
          <Text style={{ fontSize: 64, marginBottom: 8 }}>
            {isBoy ? '⚡' : isGirl ? '💖' : '🎉'}
          </Text>
          <Text style={[
            styles.celebMashallah,
            isBoy  && { color: '#ef4444' },
            isGirl && { color: '#ec4899' },
          ]}>
            {isBoy ? 'LEGENDARY!' : isGirl ? 'Fabulous!' : 'Mashallah!'}
          </Text>
          <Text style={styles.celebName}>{childName}!</Text>
          <Text style={styles.celebSub}>
            {isBoy ? 'All 5 missions complete! 🦸' : isGirl ? 'All 5 prayers sparkle today! ✨' : 'All 5 prayers done today 🙏'}
          </Text>
          <Text style={styles.celebSub2}>+5 bonus points!</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─── Rewards Map Modal ────────────────────────────────────────────────────────
const RewardsMapModal = ({ visible, onClose, rewards, completeDays }) => {
  const validRewards = rewards.filter(r => r.label?.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Rewards Map ✨</Text>
              <Text style={styles.modalSub}>
                {completeDays} complete days · {validRewards.filter(r => completeDays >= r.days).length}/{validRewards.length} earned
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {validRewards.map((r, i) => {
              const earned    = completeDays >= r.days;
              const prevDays  = i > 0 ? validRewards[i - 1].days : 0;
              const isCurrent = !earned && (i === 0 || completeDays >= prevDays);
              const pct       = isCurrent ? Math.min(100, ((completeDays - prevDays) / (r.days - prevDays)) * 100) : 0;
              const isLast    = i === validRewards.length - 1;

              return (
                <View key={r.id}>
                  <View style={[
                    styles.rewardNode,
                    earned && styles.rewardNodeEarned,
                    isCurrent && styles.rewardNodeCurrent,
                  ]}>
                    <View style={[
                      styles.rewardNodeIcon,
                      { borderColor: earned ? COLORS.purple : 'rgba(255,255,255,0.1)', backgroundColor: earned ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.04)' },
                      !earned && { opacity: 0.4 },
                    ]}>
                      <Text style={{ fontSize: 24 }}>{r.icon}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rewardNodeLabel, !earned && !isCurrent && { color: 'rgba(255,255,255,0.3)' }]}>
                        {r.label}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      {earned ? (
                        <View style={styles.earnedBadge}>
                          <Text style={styles.earnedBadgeText}>Earned ✓</Text>
                        </View>
                      ) : isCurrent ? (
                        <View>
                          <Text style={styles.ptsLeft}>{r.days - completeDays} days left</Text>
                          <View style={styles.miniBarBg}>
                            <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.lockedPts}>{r.days} days</Text>
                      )}
                    </View>
                  </View>
                  {!isLast && (
                    <View style={[styles.connector, earned && { backgroundColor: 'rgba(129,140,248,0.4)' }]} />
                  )}
                </View>
              );
            })}

            <View style={styles.totalPill}>
              <Text style={{ fontSize: 20 }}>🏅</Text>
              <Text style={styles.totalPtsText}>{completeDays} complete days</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Prayer Card ──────────────────────────────────────────────────────────────
function PrayerCard({ prayer, done, onPress, scaleAnim, theme, gender }) {
  const isBoy  = gender === 'boy';
  const isGirl = gender === 'girl';
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.prayerCard,
          isBoy  && { borderRadius: 10, borderLeftWidth: 4, borderLeftColor: theme.accent + '80' },
          isGirl && { borderRadius: 28 },
          done && {
            backgroundColor: prayer.color + '12',
            borderColor: prayer.color + '60',
            shadowColor: prayer.color,
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          },
        ]}
      >
        {/* Left color accent stripe when done */}
        {done && <View style={[styles.cardStripe, { backgroundColor: prayer.color }]} />}

        {/* Emoji */}
        <Text style={styles.cardEmoji}>{prayer.emoji}</Text>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, done && { color: '#ffffff' }]}>{prayer.name}</Text>
            <Text style={styles.cardArabic}>{prayer.arabic}</Text>
          </View>
          <Text style={styles.cardTime}>{prayer.clockTime} · {prayer.time}</Text>
        </View>

        {/* Check circle */}
        <View style={[
          styles.cardCheck,
          done && {
            backgroundColor: prayer.color,
            shadowColor: prayer.color,
            shadowOpacity: 0.7,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}>
          <Text style={{ color: done ? '#ffffff' : 'rgba(255,255,255,0.2)', fontSize: done ? 17 : 19, fontWeight: '900' }}>
            {done ? '✓' : '○'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Kid Home Screen ─────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { state, loadChildById, togglePrayer, getTodayLog, getStreak, getCompleteDays } = useApp();
  const { childId } = route.params || {};

  // Load child if in child mode (Firestore fetch)
  useEffect(() => {
    if (childId && !state.children.find(c => c.id === childId)) {
      loadChildById(childId);
    }
  }, [childId]);

  const childIndex = state.children.findIndex(c => c.id === childId);
  const child      = state.children[childIndex] ?? state.children[0];
  const baseTheme  = CHILD_THEMES[Math.max(0, childIndex) % CHILD_THEMES.length];
  const genderTheme = child?.gender === 'boy' ? BOY_THEME : child?.gender === 'girl' ? GIRL_THEME : null;
  const theme       = genderTheme ? { ...baseTheme, ...genderTheme } : baseTheme;

  const todayLog     = getTodayLog(child?.id);
  const streak       = getStreak(child?.id);
  const completeDays = getCompleteDays(child?.id);
  const prayedCount  = PRAYERS.filter(p => todayLog[p.id]).length;
  const allDone      = prayedCount === PRAYERS.length;

  const [showCelebration, setShowCelebration] = useState(false);
  const [showRewards, setShowRewards]         = useState(false);

  // Per-prayer scale animations
  const scaleAnims = useRef(
    PRAYERS.reduce((acc, p) => ({ ...acc, [p.id]: new Animated.Value(1) }), {})
  ).current;

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

  // Rewards
  const childRewards   = child?.rewards?.filter(r => r.label?.trim()) ?? [];
  const nextReward     = childRewards.find(r => completeDays < r.days);
  const prevRewardDays = (() => {
    const earned = childRewards.filter(r => completeDays >= r.days);
    return earned.length > 0 ? earned[earned.length - 1].days : 0;
  })();
  const rewardProgress = nextReward
    ? Math.min(100, ((completeDays - prevRewardDays) / (nextReward.days - prevRewardDays)) * 100)
    : 100;

  const handleTogglePrayer = (prayerId) => {
    if (!child) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.spring(scaleAnims[prayerId], { toValue: 1.05, friction: 4, useNativeDriver: true }),
      Animated.spring(scaleAnims[prayerId], { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <LinearGradient colors={theme.bg} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Back Button ─────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ModeSelect')}
          style={[styles.backBtn, genderTheme && { borderColor: theme.accent + '40', backgroundColor: theme.accent + '12' }]}
        >
          <Text style={[styles.backBtnText, genderTheme && { color: theme.accent }]}>
            {genderTheme ? theme.backLabel : '← Family'}
          </Text>
        </TouchableOpacity>

        {/* ─── Hero Section ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{today}</Text>

          {/* Avatar */}
          <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: avatarPulse }] }]}>
            <LinearGradient colors={theme.grad} style={[styles.avatarCircle, { shadowColor: theme.accent }]}>
              <Text style={{ fontSize: 42 }}>{child.avatar}</Text>
            </LinearGradient>
            {allDone && (
              <View style={[styles.avatarDoneBadge, { backgroundColor: theme.accent + '25', borderColor: theme.accent }]}>
                <Text style={{ fontSize: 18 }}>✓</Text>
              </View>
            )}
          </Animated.View>

          <Text style={styles.heroName}>{child.name}</Text>

          {/* Streak badge */}
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
          )}
        </View>

        {/* ─── TODAY'S QUEST ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabel}>{genderTheme ? theme.questLabel : "TODAY'S QUEST"}</Text>
          <Text style={[styles.sectionCount, allDone && { color: COLORS.green }]}>
            {allDone ? '✓ Complete!' : `${prayedCount} / 5`}
          </Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Prayer cards */}
        <View style={styles.prayerList}>
          {PRAYERS.map(p => (
            <PrayerCard
              key={p.id}
              prayer={p}
              done={!!todayLog[p.id]}
              onPress={() => handleTogglePrayer(p.id)}
              scaleAnim={scaleAnims[p.id]}
              theme={theme}
              gender={child.gender}
            />
          ))}
        </View>

        {/* All done banner */}
        {allDone && (
          <View style={[styles.allDoneBanner, {
            borderColor: (genderTheme ? theme.allDoneColor : COLORS.green) + '40',
            backgroundColor: (genderTheme ? theme.allDoneColor : COLORS.green) + '10',
          }]}>
            <Text style={{ fontSize: 24 }}>{genderTheme ? theme.allDoneEmoji : '🌟'}</Text>
            <Text style={[styles.allDoneText, { color: genderTheme ? theme.allDoneColor : COLORS.green }]}>
              {genderTheme ? theme.allDoneText : 'Mashallah! All 5 prayers done today!'}
            </Text>
          </View>
        )}

        {/* ─── NEXT REWARD ──────────────────────────────────────── */}
        {nextReward && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>NEXT REWARD</Text>
              <View style={styles.sectionLine} />
            </View>

            <TouchableOpacity onPress={() => setShowRewards(true)} activeOpacity={0.85} style={styles.rewardCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 32 }}>{nextReward.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>{nextReward.label}</Text>
                  <Text style={[styles.rewardSub, { color: theme.accent }]}>
                    {completeDays} / {nextReward.days} complete days
                  </Text>
                </View>
                <Text style={[styles.viewAll, { color: theme.accent }]}>View all →</Text>
              </View>
              <View style={styles.rewardBarBg}>
                <LinearGradient
                  colors={theme.grad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.rewardBarFill, { width: `${rewardProgress}%` }]}
                />
              </View>
              <Text style={styles.rewardDaysLeft}>
                {nextReward.days - completeDays} more complete days to go!
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Motivational footer */}
        <View style={styles.motivationPill}>
          <Text style={{ fontSize: 16 }}>🕌</Text>
          <Text style={styles.motivationText}>
            {genderTheme
              ? theme.getMotivation(prayedCount)
              : prayedCount === 0
              ? 'Start your quest — every prayer counts!'
              : prayedCount < 3
              ? `Great start! ${5 - prayedCount} more to go.`
              : prayedCount < 5
              ? `Almost there! Just ${5 - prayedCount} left!`
              : 'Incredible work today! 🏆'}
          </Text>
        </View>
      </ScrollView>

      <CelebrationOverlay visible={showCelebration} childName={child.name} gender={child.gender} />
      <RewardsMapModal
        visible={showRewards}
        onClose={() => setShowRewards(false)}
        rewards={child?.rewards ?? []}
        completeDays={completeDays}
      />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 12 },

  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
  },
  backBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },

  // Hero
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  greetingText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '700' },
  dateText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 4 },
  avatarWrapper: { position: 'relative', marginVertical: 4 },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 14,
  },
  avatarDoneBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  heroName: { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: 0.3 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
  },
  streakText: { color: '#fbbf24', fontSize: 13, fontWeight: '800' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionCount: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900' },

  // Prayer cards
  prayerList: { gap: 8 },
  prayerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16,
    overflow: 'hidden',
  },
  cardStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 2,
  },
  cardEmoji: { fontSize: 24, width: 30, textAlign: 'center' },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardName: { color: 'rgba(255,255,255,0.65)', fontSize: 16, fontWeight: '800' },
  cardArabic: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  cardTime: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600' },
  cardCheck: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },

  // All done
  allDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1.5,
  },
  allDoneText: { fontSize: 14, fontWeight: '800', flex: 1 },

  // Reward card
  rewardCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22, padding: 18,
  },
  rewardName: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  rewardSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  viewAll: { fontSize: 11, fontWeight: '800' },
  rewardBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden', marginBottom: 8 },
  rewardBarFill: { height: '100%', borderRadius: 100 },
  rewardDaysLeft: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600' },

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
  celebMashallah: { color: '#34d399', fontSize: 32, fontWeight: '900', marginBottom: 4 },
  celebName: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  celebSub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },
  celebSub2: { color: '#fbbf24', fontSize: 14, fontWeight: '800', marginTop: 6 },

  // Rewards modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: '#130d2e',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, maxHeight: '88%',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHandle: { width: 38, height: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  modalSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },

  rewardNode: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rewardNodeEarned: { borderColor: 'rgba(255,255,255,0.2)' },
  rewardNodeCurrent: { borderColor: 'rgba(129,140,248,0.5)', backgroundColor: 'rgba(129,140,248,0.08)' },
  rewardNodeIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rewardNodeLabel: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  earnedBadge: {
    backgroundColor: 'rgba(129,140,248,0.18)',
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.5)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  earnedBadgeText: { color: COLORS.purple, fontSize: 11, fontWeight: '900' },
  ptsLeft: { color: COLORS.purple, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  miniBarBg: { marginTop: 5, height: 4, width: 64, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' },
  miniBarFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 100 },
  lockedPts: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '700' },
  connector: { width: 2, height: 14, marginLeft: 37, backgroundColor: 'rgba(255,255,255,0.07)' },
  totalPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 100,
    paddingHorizontal: 22, paddingVertical: 11,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  totalPtsText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
});
