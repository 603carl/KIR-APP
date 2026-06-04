import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as IntentLauncher from 'expo-intent-launcher';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { EmergencyBroadcastOverlay, type BroadcastAlert } from '@/components/broadcast/EmergencyBroadcastOverlay';
import { useColorScheme } from '@/components/useColorScheme';
import {
    canUseAndroidFullScreenIntent,
    openAndroidFullScreenIntentSettings,
    usePushNotifications,
} from '@/hooks/usePushNotifications';
import { getStartupItem, setStartupItem } from '@/lib/startupStorage';
import { getSessionSafely, supabase } from '@/lib/supabase';
import { ProfileProvider } from '@/context/ProfileContext';
import { useAssets } from 'expo-asset';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useRef, useState } from 'react';
import { Alert, AppState, Linking, LogBox, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Conditionally import expo-notifications (not available in Expo Go)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: any = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) { }
}

// Ignore specific warnings if necessary
LogBox.ignoreLogs([
    'Reading the project root',
    'NativeEventEmitter',
    'SafeAreaView has been deprecated',
]);


// Configure Sentry User Context
supabase.auth.onAuthStateChange((event, session) => {
    // Sentry user context removed
});


export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
    // Ensure that reloading on `/modal` keeps a back button present.
    initialRouteName: 'onboarding',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global Font Scaling Prevention
if ((Text as any).defaultProps) {
    (Text as any).defaultProps.allowFontScaling = false;
} else {
    (Text as any).defaultProps = { allowFontScaling: false };
}

if ((TouchableOpacity as any).defaultProps) {
    (TouchableOpacity as any).defaultProps.allowFontScaling = false;
} else {
    (TouchableOpacity as any).defaultProps = { allowFontScaling: false };
}


export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
    });

    // Preload EAS sound asset
    const [assets] = useAssets([
        require('../assets/sounds/eas-alert-sound-fx.mp3'),
    ]);

    const colorScheme = useColorScheme();
    const segments = useSegments();
    const router = useRouter();

    const [isNavigationReady, setIsNavigationReady] = useState(false);
    const [initialRouteDetermined, setInitialRouteDetermined] = useState(false);
    const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
    const rootNavState = useRootNavigationState();
    const [activeBroadcast, setActiveBroadcast] = useState<BroadcastAlert | null>(null);
    const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
    const userRoleRef = useRef<string | null>(null);
    const appState = useRef(AppState.currentState);
    const lastBackgroundTime = useRef<number | null>(null);
    const autoSignOutTimeout = useRef<number>(1800); // 30 minutes for production stability
    const criticalAlertsEnabled = useRef(true);
    const biometricLockEnabled = useRef(false);
    const [privacyLocked, setPrivacyLocked] = useState(false);

    // ─── Bug #2 Fix: Segments ref ─────────────────────────────────────
    // The auth listener is registered once inside a useEffect. Without a ref,
    // it closes over the segments value at mount time and never sees updates.
    // Reading segmentsRef.current always gives the live segment value.
    const segmentsRef = useRef(segments);
    useEffect(() => { segmentsRef.current = segments; }, [segments]);

    const unlockWithBiometrics = useCallback(async () => {
        if (!biometricLockEnabled.current) {
            setPrivacyLocked(false);
            return true;
        }

        setPrivacyLocked(true);
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Kenya Incident Report',
            fallbackLabel: 'Use Passcode',
            disableDeviceFallback: false,
        });
        if (result.success) {
            setPrivacyLocked(false);
            return true;
        }
        return false;
    }, []);

    const loadUserControls = useCallback(async (userId: string, requireUnlock: boolean) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('privacy_settings, notification_prefs')
            .eq('id', userId)
            .single();
        if (error) {
            console.warn('[Privacy] Unable to load controls:', error.message);
            return;
        }

        const privacySettings = (data?.privacy_settings || {}) as Record<string, any>;
        const notificationPrefs = (data?.notification_prefs || {}) as Record<string, any>;
        const storedTimeout = privacySettings.auto_sign_out_timeout;
        autoSignOutTimeout.current = typeof storedTimeout === 'number' ? storedTimeout : 1800;
        biometricLockEnabled.current = privacySettings.biometric_lock === true;
        criticalAlertsEnabled.current = notificationPrefs.emergency !== false;

        if (requireUnlock) {
            await unlockWithBiometrics();
        }
    }, [unlockWithBiometrics]);

    // ─── Push Notification Handler (SINGLE instance) ─────────────────
    // When a broadcast push is received or tapped, this triggers the overlay
    const handleBroadcastReceived = useCallback((data: any) => {
        if (!data) return;
        if (!criticalAlertsEnabled.current) return;
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
                // ─── Bug #4 Fix: withTimeout utility ──────────────────────────
                // On Android 8–11, SecureStore uses the Android Keystore which can
                // block indefinitely in "Direct Boot" state (phone restarted but
                // not yet unlocked). Without a timeout, the entire UI stays null
                // (blank white screen) with no feedback. A 5s timeout for the
                // network call and 3s for local storage are safe, generous bounds.
                function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
                    return Promise.race([
                        promise,
                        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
                    ]);
                }

                // 1. Determine Initial Route & Data in Parallel
                const [sessionRes, hasSeenOnboarding, installDate, lastAppVersion] = await Promise.all([
                    withTimeout(getSessionSafely(), 5000, { data: { session: null }, error: null }),
                    withTimeout(getStartupItem('hasSeenOnboarding'), 3000, null),
                    withTimeout(getStartupItem('install_date'), 3000, null),
                    withTimeout(getStartupItem('app_version'), 3000, null)
                ]);

                const session = sessionRes.data.session;
                const currentVersion = Constants.expoConfig?.version || '1.0.0';

                // 2. Set Install Date if missing
                if (!installDate) {
                    const now = new Date().toISOString();
                    await setStartupItem('install_date', now);
                    await setStartupItem('app_version', currentVersion);
                }

                // 3. Update Force-Logout Check: If version changed and not new install, clear session
                if (lastAppVersion && lastAppVersion !== currentVersion && hasSeenOnboarding) {
                    console.log(`[Update] Version mismatch (${lastAppVersion} -> ${currentVersion}). Clearing session.`);
                    // Only attempt signOut if we actually have a session
                    if (session) {
                        try {
                            await supabase.auth.signOut({ scope: 'local' });
                        } catch (signOutError) {
                            console.warn('[Update] Initial signOut failed (likely expired), proceeding with local clear.', signOutError);
                        }
                    }
                    await setStartupItem('app_version', currentVersion);
                    setPendingRedirect('/auth/login');
                    return;
                }

                // 4. Routing Logic
                const inAuthGroup = segments[0] === 'auth';
                const inOnboarding = segments[0] === 'onboarding';

                if (!hasSeenOnboarding && !inOnboarding) {
                    setPendingRedirect('/onboarding');
                } else if (!session && !inAuthGroup && !inOnboarding) {
                    setPendingRedirect('/auth/login');
                } else if (session && (inAuthGroup || inOnboarding)) {
                    setPendingRedirect('/(tabs)');
                }

                // 5. Biometric Lock
                if (session?.user) {
                    await loadUserControls(session.user.id, true);
                }

                // Android 14+: full-screen broadcast access is a device emergency
                // readiness setting and must not depend on citizen sign-in state.
                if (!isExpoGo && Platform.OS === 'android' && Platform.Version >= 34) {
                    void promptForFSIPermission();
                }

            } catch (e) {
                // ─── Bug #3 Fix: Fail Closed ───────────────────────────────────
                // Any exception during init (network error, SecureStore timeout,
                // etc.) must NOT leave the app rendering an unprotected screen.
                // We always redirect to login on error — the user can re-auth if
                // they had a valid session; this is far safer than granting access.
                console.error('[Layout] Init Error — failing closed to /auth/login:', e);
                setPendingRedirect('/auth/login');
            } finally {
                setInitialRouteDetermined(true);
                setIsNavigationReady(true);
                setTimeout(async () => {
                    await SplashScreen.hideAsync().catch(() => { });

                    // ─── Cold Start Broadcast Check ──────────────────
                    if (Notifications) {
                        try {
                            const lastResponse = await Notifications.getLastNotificationResponseAsync();
                            if (lastResponse) {
                                const data = lastResponse.notification?.request?.content?.data;
                                if (criticalAlertsEnabled.current && data && (data.broadcastId || data.isBroadcast)) {
                                    console.log('[Layout] Cold start broadcast detected:', JSON.stringify(data));
                                    setActiveBroadcast({
                                        id: data.broadcastId || 'coldstart-' + Date.now(),
                                        title: data.title || lastResponse.notification?.request?.content?.title || 'Emergency Alert',
                                        message: data.message || lastResponse.notification?.request?.content?.body || '',
                                        severity: data.severity || 'extreme',
                                        created_at: new Date().toISOString()
                                    });
                                }
                            }
                        } catch (coldStartErr) {
                            console.log('[Layout] Cold start check error:', coldStartErr);
                        }
                    }
                }, 100);
            }
        }

        initAndCheckNavigation();
    }, [loaded, loadUserControls]); // Removed segments from potential loop dependencies

    // Perform the redirect securely once rotation/layout is mounted
    useEffect(() => {
        if (!rootNavState?.key || !initialRouteDetermined || !loaded || !pendingRedirect) return;
        router.replace(pendingRedirect as any);
        setPendingRedirect(null);
    }, [rootNavState?.key, initialRouteDetermined, loaded, pendingRedirect, router]);

    useEffect(() => {
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
                if (!criticalAlertsEnabled.current) return;
                const newBroadcast = payload.new as BroadcastAlert;
                console.log('[Realtime] New broadcast received:', newBroadcast.title);
                setActiveBroadcast(newBroadcast);
            })
            .subscribe();

        // ─── Auth State Listener ────────────────────────────────────────
        // Bug #2 Fix: Use segmentsRef.current (NOT the segments variable) so
        // we always read the LIVE segment. The segments variable captured in
        // this closure is stale — it reflects the value at the time this
        // useEffect ran, not when the auth event fires.
        //
        // TOKEN_REFRESHED is deliberately NOT handled here. Supabase fires
        // this every ~55 minutes. Routing on it would cause repeated
        // router.replace() calls that remount all tab components, triggering
        // new auth calls, creating an exponential crash cascade.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[Auth] Event: ${event}`);
            if (event === 'SIGNED_OUT') {
                router.replace('/auth/login');
            } else if (event === 'SIGNED_IN') {
                // Guard: only redirect if NOT already inside the tabs navigator.
                // Using the ref prevents stale-closure reads.
                if (segmentsRef.current[0] !== '(tabs)') {
                    router.replace('/(tabs)');
                }
            }
            // Deliberately no handler for TOKEN_REFRESHED — it must never
            // trigger a navigation redirect.
        });


        // ─── App State Listener for Auto Sign-Out ────────────────────
        const handleAppStateChange = async (nextAppState: any) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                let signedOut = false;
                if (lastBackgroundTime.current && autoSignOutTimeout.current !== -1) {
                    const elapsedSeconds = (Date.now() - lastBackgroundTime.current) / 1000;
                    // ─── Bug #8 Fix: Upper bound guard ────────────────────────
                    // Without the 86400s (24h) upper bound, a stale
                    // lastBackgroundTime.current (e.g., from an OEM that fires
                    // background→active on cold boot with a recycled ref value)
                    // produces a massive elapsed value, triggering immediate
                    // sign-out the moment the user opens the app. The upper bound
                    // catches any value that is clearly a stale/garbage timestamp.
                    const isWithinValidRange = elapsedSeconds > autoSignOutTimeout.current && elapsedSeconds < 86400;
                    if (isWithinValidRange) {
                        console.log(`[Auth] Auto sign-out: ${Math.round(elapsedSeconds)}s elapsed (limit: ${autoSignOutTimeout.current}s, max: 86400s)`);
                        await supabase.auth.signOut({ scope: 'local' });
                        signedOut = true;
                    }
                }
                if (!signedOut) {
                    const { data: { session } } = await getSessionSafely();
                    if (session?.user) {
                        await loadUserControls(session.user.id, true);
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
    }, [loaded, loadUserControls, router]);

    if (!loaded || !initialRouteDetermined) return null;

    return (
        <SafeAreaProvider>
            <ProfileProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="auth/login" />
                        <Stack.Screen name="auth/signup" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="incident/[id]" options={{ presentation: 'card' }} />
                        <Stack.Screen name="police-report/new" options={{ presentation: 'card' }} />
                        <Stack.Screen name="police-report/index" options={{ presentation: 'card' }} />
                        <Stack.Screen name="police-report/[id]" options={{ presentation: 'card' }} />
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
                    {privacyLocked && (
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundColor: '#071c18',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 28,
                            zIndex: 1000,
                        }}>
                            <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 10 }}>
                                App Locked
                            </Text>
                            <Text style={{ color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 26 }}>
                                Authenticate to access your reports and personal information.
                            </Text>
                            <TouchableOpacity
                                style={{ backgroundColor: '#0f766e', borderRadius: 14, paddingHorizontal: 26, paddingVertical: 14, marginBottom: 14 }}
                                onPress={unlockWithBiometrics}
                            >
                                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Unlock</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => supabase.auth.signOut({ scope: 'local' })}>
                                <Text style={{ color: '#fca5a5', fontSize: 14, fontWeight: '600' }}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ThemeProvider>
            </ProfileProvider>
        </SafeAreaProvider>
    );
}

// ─── Android 14+ FSI Permission Prompt ──────────────────────────────
// On Android 14+, USE_FULL_SCREEN_INTENT is a special permission.
// We guide the user to enable it in Settings if not already enabled.
async function promptForFSIPermission() {
    const canUseFullScreen = await canUseAndroidFullScreenIntent();
    if (canUseFullScreen) return;

    const lastPrompt = await SecureStore.getItemAsync('fsi_permission_prompted_at');
    const lastPromptTime = lastPrompt ? Number(lastPrompt) : 0;
    const promptCooldownMs = 24 * 60 * 60 * 1000;
    if (lastPromptTime && Date.now() - lastPromptTime < promptCooldownMs) return;

    Alert.alert(
        'Emergency Alert Permission',
        'Android requires full-screen notification access before this app can show broadcast alerts over the lock screen like a phone call. Enable "Full screen notifications" for the strongest emergency visibility. Alarm sound notifications will still be used if this access is unavailable.',
        [
            {
                text: 'Later',
                style: 'cancel',
                onPress: () => SecureStore.setItemAsync('fsi_permission_prompted_at', String(Date.now())),
            },
            {
                text: 'Open Settings',
                onPress: async () => {
                    await SecureStore.setItemAsync('fsi_permission_prompted_at', String(Date.now()));
                    const openedNativeSettings = await openAndroidFullScreenIntentSettings();
                    if (openedNativeSettings) return;

                    try {
                        await IntentLauncher.startActivityAsync('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT', {
                            data: `package:${Constants.expoConfig?.android?.package || 'com.publickenyaapp.kenyaincidentreport'}`
                        });
                    } catch {
                        await Linking.openSettings();
                    }
                }
            },
        ]
    );
}
