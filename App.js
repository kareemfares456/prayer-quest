import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Nunito_600SemiBold, Nunito_700Bold,
  Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { View, ActivityIndicator } from 'react-native';

import { AppProvider, useApp } from './src/context/AppContext';
import ModeSelectScreen  from './src/screens/ModeSelectScreen';
import SignupScreen      from './src/screens/SignupScreen';
import LoginScreen       from './src/screens/LoginScreen';
import ChildJoinScreen   from './src/screens/ChildJoinScreen';
import ParentDashboard   from './src/screens/ParentDashboard';
import HomeScreen        from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

// ─── Auth states ──────────────────────────────────────────────────────────────
// 'loading' → waiting for Firebase to restore session
// 'parent'  → Firebase user is signed in
// 'child'   → no Firebase user, but child session in AsyncStorage
// 'none'    → not authenticated at all

// ─── Navigator (rendered inside AppProvider so it can read context) ───────────
function AppNavigator() {
  const { appStatus, savedChildId } = useApp();

  if (appStatus === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/*
       * React Navigation's conditional-screens pattern:
       * Switching which screens are defined causes the navigator to
       * automatically transition to the first screen of the new group.
       * This drives ALL auth-state-driven navigation (login, logout,
       * child join, child sign-out) without any manual navigation calls.
       */}
      {appStatus === 'parent' ? (
        // ── Parent (signed-in) ───────────────────────────────────────────────
        <>
          <Stack.Screen
            name="ParentDashboard"
            component={ParentDashboard}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="KidHome" component={HomeScreen} />
        </>
      ) : appStatus === 'child' ? (
        // ── Child (logged-in via invite code) ─────────────────────────────────
        // All auth screens are included so "sign out" can navigate to
        // ModeSelect → Login / Signup / ChildJoin without errors.
        <>
          <Stack.Screen
            name="KidHome"
            component={HomeScreen}
            initialParams={{ childId: savedChildId }}
          />
          <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
          <Stack.Screen name="Signup"     component={SignupScreen} />
          <Stack.Screen name="Login"      component={LoginScreen} />
          <Stack.Screen name="ChildJoin"  component={ChildJoinScreen} />
        </>
      ) : (
        // ── Logged-out / mode-select ───────────────────────────────────────────
        <>
          <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
          <Stack.Screen name="Signup"     component={SignupScreen} />
          <Stack.Screen name="Login"      component={LoginScreen} />
          <Stack.Screen name="ChildJoin"  component={ChildJoinScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  return (
    <AppProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
