# 🕌 Prayer Quest — React Native (Expo)

A gamified Islamic prayer tracker for children, built with Expo & React Native.

---

## Project Structure

```
PrayerQuest/
├── App.js                        # Navigation root
├── app.json                      # Expo config
├── package.json
├── babel.config.js
├── assets/                       # App icons & splash (add your own)
└── src/
    ├── constants/index.js        # Colors, prayers, rewards data
    ├── components/UI.js          # Shared components (Button, Input, etc.)
    └── screens/
        ├── SignupScreen.js       # 4-step parent onboarding
        └── HomeScreen.js        # Daily prayer tracker
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npx expo start
```

### 3. Run on your device

- Install **Expo Go** on your phone (iOS App Store / Google Play)
- Scan the QR code shown in the terminal
- App runs instantly on your real device!

---

## Running on Simulators

```bash
# iOS Simulator (Mac only, requires Xcode)
npx expo start --ios

# Android Emulator (requires Android Studio)
npx expo start --android
```

---

## Building for App Stores

### Setup EAS (Expo Application Services)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build for Android (APK/AAB)

```bash
# Development APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Google Play)
eas build --platform android --profile production
```

### Build for iOS (IPA)

```bash
# Requires Apple Developer Account ($99/year)
eas build --platform ios --profile production
```

### Submit to stores

```bash
# Google Play
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

---

## App Icons & Splash Screen

Replace the placeholder files in `/assets/`:
- `icon.png` — 1024×1024px app icon
- `adaptive-icon.png` — 1024×1024px Android adaptive icon
- `splash.png` — 1242×2436px splash screen

---

## Key Features

- **Signup Flow** — 4-step parent onboarding:
  1. Welcome
  2. Parent account (name, email, password)
  3. Per-child setup (avatar, age, gender, tracking period 1–12mo, custom rewards)
  4. Review & launch

- **Prayer Tracker** — Daily home screen:
  - 5 prayer checkpoints with dot progress track
  - Streak counter + next reward progress
  - Tap to mark prayers with haptic feedback
  - Confetti + Mashallah celebration when all 5 done
  - Rewards map modal (tap "Next Reward" card)

---

## Customization

Edit `src/constants/index.js` to:
- Change prayer names / times
- Add more reward presets
- Adjust reward point thresholds
- Add more avatar emoji options

---

## Dependencies

| Package | Purpose |
|---|---|
| `expo` | Core framework |
| `expo-linear-gradient` | Gradient backgrounds |
| `expo-haptics` | Haptic feedback on prayer tap |
| `expo-font` / `@expo-google-fonts/nunito` | Custom font |
| `react-navigation` | Screen navigation |
| `react-native-safe-area-context` | Safe area handling |
| `react-native-reanimated` | Smooth animations |
