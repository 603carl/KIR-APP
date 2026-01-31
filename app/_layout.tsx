import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { BroadcastAlert, EmergencyBroadcastOverlay } from '@/components/broadcast/EmergencyBroadcastOverlay';
import { useColorScheme } from '@/components/useColorScheme';
import { COLORS } from '@/constants/Theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import { useAssets } from 'expo-asset';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Preload EAS sound asset
  const [assets] = useAssets([
    require('../assets/sounds/emergency_alert.mp3'),
  ]);

  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  const [isLocked, setIsLocked] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastAlert | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  // Register for push notifications
  usePushNotifications();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function initAndCheckNavigation() {
      if (!loaded) return;

      try {
        // 1. Determine Initial Route & Data in Parallel
        const [sessionRes, hasSeenOnboarding, installDate] = await Promise.all([
          supabase.auth.getSession(),
          SecureStore.getItemAsync('hasSeenOnboarding'),
          SecureStore.getItemAsync('install_date')
        ]);

        const session = sessionRes.data.session;

        // 2. Set Install Date if missing
        if (!installDate) {
          await SecureStore.setItemAsync('install_date', new Date().toISOString());
        }

        // 3. Routing Logic (Instant)
        const inAuthGroup = segments[0] === 'auth';
        const inOnboarding = segments[0] === 'onboarding';

        if (!hasSeenOnboarding && !inOnboarding) {
          router.replace('/onboarding');
        } else if (hasSeenOnboarding && !session && !inAuthGroup && !inOnboarding) {
          router.replace('/auth/login');
        } else if (session && (inAuthGroup || inOnboarding)) {
          router.replace('/(tabs)');
        }

        // 4. Biometric Lock Check (Non-blocking for render)
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('privacy_settings')
            .eq('id', session.user.id)
            .single();

          if (profile?.privacy_settings?.biometric_lock) {
            setIsLocked(true);
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to Kenya Incident Hub',
              fallbackLabel: 'Use Passcode',
            });
            if (result.success) setIsLocked(false);
          }
        }

      } catch (e) {
        console.error('Init Error:', e);
      } finally {
        setIsNavigationReady(true);
        // CRITICAL: Hide splash only AFTER initial route is determined
        await SplashScreen.hideAsync();
      }
    }

    initAndCheckNavigation();

    // Global Broadcast Listener
    const loadAcknowledgedIds = async () => {
      try {
        const stored = await SecureStore.getItemAsync('acknowledged_broadcasts');
        if (stored) setAcknowledgedIds(JSON.parse(stored));
      } catch (e) { }
    };
    loadAcknowledgedIds();

    const broadcastSubscription = supabase
      .channel('global:broadcasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
        const newBroadcast = payload.new as BroadcastAlert;
        // Check local acknowledgedIds ref or fresh fetch if needed, 
        // but since it's a new INSERT, we just show it if it's not in our current state
        setActiveBroadcast(newBroadcast);
      })
      .subscribe();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [loaded]);

  if (!loaded) return null;

  if (isLocked) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <TouchableOpacity
          onPress={() => setIsNavigationReady(false)} // Force re-run logic
          style={{ marginTop: 20, padding: 10 }}
        >
          <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Tap to Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="incident/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: true }} />
        <Stack.Screen name="help" options={{ presentation: 'card', headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <EmergencyBroadcastOverlay
        alert={activeBroadcast}
        onAcknowledge={async (id) => {
          const updatedIds = [...acknowledgedIds, id];
          setAcknowledgedIds(updatedIds);
          await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(updatedIds));
          setActiveBroadcast(null);
        }}
      />
    </ThemeProvider>
  );
}
