import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { EmergencyBroadcastOverlay, type BroadcastAlert } from '@/components/broadcast/EmergencyBroadcastOverlay';
import { useColorScheme } from '@/components/useColorScheme';
import { COLORS } from '@/constants/Theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import { useAssets } from 'expo-asset';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';


export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
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
    const userRoleRef = useRef<string | null>(null);
    const appState = useRef(AppState.currentState);
    const lastBackgroundTime = useRef<number | null>(null);
    const autoSignOutTimeout = useRef<number>(30); // Default 30s

    // ─── Push Notification Handler (SINGLE instance) ─────────────────
    // When a broadcast push is received or tapped, this triggers the overlay
    const handleBroadcastReceived = useCallback((data: any) => {
        if (!data) return;
        console.log('[Layout] Broadcast received from push:', JSON.stringify(data));
        setActiveBroadcast({
            id: data.broadcastId || 'push-' + Date.now(),
            title: data.title || 'Emergency Alert',
            message: data.message || '',
            severity: data.severity || 'extreme',
            created_at: new Date().toISOString()
        });
    }, []);

    // Single hook call — the ONLY place usePushNotifications is called
    usePushNotifications(handleBroadcastReceived);

    // ─── Keep Screen Awake During Emergency ──────────────────────────
    useEffect(() => {
        if (activeBroadcast) {
            activateKeepAwakeAsync('emergency-broadcast').catch(() => { });
        } else {
            deactivateKeepAwake('emergency-broadcast');
        }
    }, [activeBroadcast]);

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
                    const now = new Date().toISOString();
                    await SecureStore.setItemAsync('install_date', now);
                }

                // 3. Routing Logic
                const inAuthGroup = segments[0] === 'auth';
                const inOnboarding = segments[0] === 'onboarding';

                if (!hasSeenOnboarding && !inOnboarding) {
                    router.replace('/onboarding');
                } else if (hasSeenOnboarding && !session && !inAuthGroup && !inOnboarding) {
                    router.replace('/auth/login');
                } else if (session && (inAuthGroup || inOnboarding)) {
                    router.replace('/(tabs)');
                }

                // 4. Profile, Biometric Lock & Role Check
                if (session?.user) {
                    setTimeout(async () => {
                        try {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('role, privacy_settings')
                                .eq('id', session.user.id)
                                .single();

                            if (profile) {
                                userRoleRef.current = profile.role || 'reporter';

                                if (profile.privacy_settings?.biometric_lock) {
                                    setIsLocked(true);
                                    const result = await LocalAuthentication.authenticateAsync({
                                        promptMessage: 'Authenticate to Kenya Incident Hub',
                                        fallbackLabel: 'Use Passcode',
                                    });
                                    if (result.success) setIsLocked(false);
                                }

                                if (profile.privacy_settings?.auto_sign_out_timeout !== undefined) {
                                    autoSignOutTimeout.current = profile.privacy_settings.auto_sign_out_timeout;
                                }
                            }

                            // Android 14+: Check FSI permission and prompt if needed
                            if (Platform.OS === 'android' && Platform.Version >= 34) {
                                promptForFSIPermission();
                            }
                        } catch (bioError) {
                            console.log('Biometric error:', bioError);
                        }
                    }, 500);
                }

            } catch (e) {
                console.error('Init Error:', e);
            } finally {
                setIsNavigationReady(true);
                setTimeout(async () => {
                    await SplashScreen.hideAsync().catch(() => { });
                }, 100);
            }
        }

        initAndCheckNavigation();

        // ─── Global Broadcast Listener (Real-time from DB) ───────────
        const loadAcknowledgedIds = async () => {
            try {
                const stored = await SecureStore.getItemAsync('acknowledged_broadcasts');
                if (stored) setAcknowledgedIds(JSON.parse(stored));
            } catch (e) { }
        };
        loadAcknowledgedIds();

        const broadcastSubscription = supabase
            .channel('global:emergency_sync')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
                // Broadcast from Watch Command → triggers phone takeover for ALL users
                const newBroadcast = payload.new as BroadcastAlert;
                console.log('[Realtime] New broadcast received:', newBroadcast.title);
                setActiveBroadcast(newBroadcast);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
                // SOS: Only Watch Command staff see the overlay
                const sos = payload.new;
                const isStaff = ['admin', 'responder', 'staff'].includes(userRoleRef.current || '');

                if (sos.status === 'active' && isStaff) {
                    setActiveBroadcast({
                        id: sos.id,
                        title: '🚨 NEARBY SOS EMERGENCY',
                        message: `Emergency signal detected at ${sos.location_name || 'unknown location'}. WATCH COMMAND ALERT.`,
                        severity: 'extreme',
                        created_at: sos.created_at
                    });
                }
            })
            .subscribe();

        // ─── Auth State Listener ─────────────────────────────────────
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                router.replace('/(tabs)');
                if (session?.user) {
                    supabase.from('profiles')
                        .select('role, privacy_settings')
                        .eq('id', session.user.id)
                        .single()
                        .then(({ data }) => {
                            if (data) {
                                userRoleRef.current = data.role || 'reporter';
                                if (data.privacy_settings?.auto_sign_out_timeout !== undefined) {
                                    autoSignOutTimeout.current = data.privacy_settings.auto_sign_out_timeout;
                                }
                            }
                        });
                }
            } else if (event === 'SIGNED_OUT') {
                router.replace('/auth/login');
            }
        });

        // ─── App State Listener for Auto Sign-Out ────────────────────
        const handleAppStateChange = async (nextAppState: any) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                if (lastBackgroundTime.current && autoSignOutTimeout.current !== -1) {
                    const elapsedSeconds = (Date.now() - lastBackgroundTime.current) / 1000;
                    if (elapsedSeconds > autoSignOutTimeout.current) {
                        console.log(`Auto sign-out triggered: ${elapsedSeconds}s elapsed (Limit: ${autoSignOutTimeout.current}s)`);
                        await supabase.auth.signOut();
                    }
                }
                lastBackgroundTime.current = null;
            }

            if (nextAppState.match(/inactive|background/)) {
                lastBackgroundTime.current = Date.now();
            }

            appState.current = nextAppState;
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(broadcastSubscription);
            appStateSubscription.remove();
        };
    }, [loaded]);

    if (!loaded) return null;

    if (isLocked) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#ffffff" />
                <TouchableOpacity
                    onPress={() => setIsNavigationReady(false)}
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

// ─── Android 14+ FSI Permission Prompt ──────────────────────────────
// On Android 14+, USE_FULL_SCREEN_INTENT is a special permission.
// We guide the user to enable it in Settings if not already enabled.
function promptForFSIPermission() {
    // Check if we've already prompted
    SecureStore.getItemAsync('fsi_permission_prompted').then((prompted) => {
        if (prompted) return; // Already prompted once

        Alert.alert(
            'Emergency Alert Permission',
            'To receive critical emergency broadcasts that can wake your phone, please enable "Full Screen Notifications" for this app in your device Settings.\n\nThis is essential for your safety.',
            [
                { text: 'Later', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => {
                        Linking.openSettings();
                        SecureStore.setItemAsync('fsi_permission_prompted', 'true');
                    }
                },
            ]
        );
    });
}
