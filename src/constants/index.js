// ─── Theme ────────────────────────────────────────────────────────────────────
export const COLORS = {
  bg:       '#0d0d1a',
  bgMid:    '#1a1040',
  card:     'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.09)',
  purple:   '#818cf8',
  violet:   '#c084fc',
  green:    '#34d399',
  amber:    '#fbbf24',
  orange:   '#fb923c',
  pink:     '#f472b6',
  red:      '#f87171',
  white:    '#ffffff',
  white70:  'rgba(255,255,255,0.7)',
  white50:  'rgba(255,255,255,0.5)',
  white35:  'rgba(255,255,255,0.35)',
  white20:  'rgba(255,255,255,0.2)',
  white10:  'rgba(255,255,255,0.1)',
  white06:  'rgba(255,255,255,0.06)',
  white04:  'rgba(255,255,255,0.04)',
};

// ─── Prayers ──────────────────────────────────────────────────────────────────
export const PRAYERS = [
  { id: 'fajr',    name: 'Fajr',    arabic: 'الفجر',  emoji: '🌙', time: 'Dawn',      clockTime: '5:15 AM',  color: '#818cf8' },
  { id: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر',  emoji: '☀️', time: 'Midday',    clockTime: '1:00 PM',  color: '#fbbf24' },
  { id: 'asr',     name: 'Asr',     arabic: 'العصر',  emoji: '🌤️', time: 'Afternoon', clockTime: '4:15 PM',  color: '#34d399' },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', emoji: '🌅', time: 'Sunset',    clockTime: '6:45 PM',  color: '#fb923c' },
  { id: 'isha',    name: 'Isha',    arabic: 'العشاء', emoji: '✨', time: 'Night',     clockTime: '8:00 PM',  color: '#c084fc' },
];

// ─── Signup / Rewards ─────────────────────────────────────────────────────────
export const PRESET_REWARDS = [
  { id: 'screen',  icon: '📱', label: 'Extra Screen Time' },
  { id: 'treat',   icon: '🍦', label: 'Special Treat' },
  { id: 'outing',  icon: '🎡', label: 'Fun Outing' },
  { id: 'toy',     icon: '🧸', label: 'New Toy' },
  { id: 'money',   icon: '💰', label: 'Pocket Money' },
  { id: 'game',    icon: '🎮', label: 'Game Time' },
  { id: 'story',   icon: '📖', label: 'Bedtime Story' },
  { id: 'trip',    icon: '🌟', label: 'Special Trip' },
];

export const REWARD_ICONS = [
  '🎁','📱','🍦','🎡','🧸','💰','🎮','📖','🌟','🏆',
  '🎪','🚀','🍕','🎨','⚽','🎵','🎬','🏖️','🛒','🎠',
];

export const PERIOD_OPTIONS = [
  { value: 1,  label: '1 Month',  sublabel: '~30 days' },
  { value: 2,  label: '2 Months', sublabel: '~60 days' },
  { value: 3,  label: '3 Months', sublabel: 'One quarter' },
  { value: 6,  label: '6 Months', sublabel: 'Half year' },
  { value: 9,  label: '9 Months', sublabel: 'School year' },
  { value: 12, label: '1 Year',   sublabel: 'Full year' },
];

export const DURATION_OPTIONS = [
  { days: 1,   label: '1 Day' },
  { days: 3,   label: '3 Days' },
  { days: 7,   label: '1 Week' },
  { days: 14,  label: '2 Weeks' },
  { days: 21,  label: '3 Weeks' },
  { days: 30,  label: '1 Month' },
  { days: 60,  label: '2 Months' },
  { days: 90,  label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year' },
];

export const AVATARS = ['🧒','👧','👦','🧑','🐻','🦁','🌙','⭐','🦋','🐯'];

export const newChild = (idx) => ({
  id: Date.now() + idx,
  name: '', age: '', gender: '', avatar: AVATARS[idx % AVATARS.length],
  trackingMonths: 3,
  rewards: [
    { id: 'r1', icon: '🎁', label: '', days: 1 },
    { id: 'r2', icon: '🎁', label: '', days: 3 },
  ],
});
