import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Nunito_600SemiBold, Nunito_700Bold,
  Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';

import { AppProvider } from './src/context/AppContext';
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

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  const [status, setStatus] = useState('loading');
  const [savedChildId, setSavedChildId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ── Parent signed in ─────────────────────────────────────────────────
        // Always persist mode so app restarts land on ParentDashboard
        await AsyncStorage.setItem('@pq/mode', 'parent');
        setStatus('parent');
      } else {
        // ── No Firebase user — check for persisted child session ─────────────
        const [mode, childId] = await Promise.all([
          AsyncStorage.getItem('@pq/mode'),
          AsyncStorage.getItem('@pq/childId'),
        ]);

        if (mode === 'child' && childId) {
          setSavedChildId(childId);
          setStatus('child');
        } else {
          // Clear any stale parent mode flag left from a previous session
          if (mode === 'parent') await AsyncStorage.removeItem('@pq/mode');
          setStatus('none');
        }
      }
    });
    return unsubscribe;
  }, []);

  // ── Splash / loading ────────────────────────────────────────────────────────
  if (!fontsLoaded || status === 'loading') {
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

          {/*
           * React Navigation's conditional-screens pattern:
           * Switching which screens are defined causes the navigator to
           * automatically transition to the first screen of the new group.
           * This drives ALL auth-state-driven navigation (login, logout,
           * child join, child sign-out) without any manual navigation calls.
           */}
          <Stack.Navigator
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            {status === 'parent' ? (
              // ── Parent (signed-in) ─────────────────────────────────────────
              <>
                <Stack.Screen
                  name="ParentDashboard"
                  component={ParentDashboard}
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen name="KidHome" component={HomeScreen} />
              </>
            ) : status === 'child' ? (
              // ── Child (logged-in via invite code) ──────────────────────────
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
              // ── Logged-out / mode-select ───────────────────────────────────
              <>
                <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
                <Stack.Screen name="Signup"     component={SignupScreen} />
                <Stack.Screen name="Login"      component={LoginScreen} />
                <Stack.Screen name="ChildJoin"  component={ChildJoinScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
