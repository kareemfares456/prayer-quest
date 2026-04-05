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

// ─── Initial route resolver ───────────────────────────────────────────────────
async function resolveInitialRoute() {
  const mode = await AsyncStorage.getItem('@pq/mode');
  if (mode === 'child') {
    const childId = await AsyncStorage.getItem('@pq/childId');
    return childId ? { route: 'KidHome', params: { childId } } : { route: 'ChildJoin' };
  }
  if (mode === 'parent') {
    const user = auth.currentUser;
    return user ? { route: 'ParentDashboard' } : { route: 'Login' };
  }
  return { route: 'ModeSelect' };
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    // Wait for Firebase Auth to restore session, then decide initial route
    const unsubscribe = onAuthStateChanged(auth, async () => {
      const dest = await resolveInitialRoute();
      setInitialRoute(dest);
    });
    return unsubscribe;
  }, []);

  if (!fontsLoaded || !initialRoute) {
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
          <Stack.Navigator
            initialRouteName={initialRoute.route}
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="ModeSelect"      component={ModeSelectScreen} />
            <Stack.Screen name="Signup"          component={SignupScreen} />
            <Stack.Screen name="Login"           component={LoginScreen} />
            <Stack.Screen name="ChildJoin"       component={ChildJoinScreen} />
            <Stack.Screen
              name="ParentDashboard"
              component={ParentDashboard}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="KidHome"
              component={HomeScreen}
              initialParams={initialRoute.route === 'KidHome' ? initialRoute.params : undefined}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
