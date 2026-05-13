import { supabase } from '@/lib/supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { Platform, AppState } from 'react-native';
import type { ForegroundOptionsModel } from 'react-native-full-screen-notification-incoming-call';

// ─── Constants ───────────────────────────────────────────────────────
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_EMERGENCY_NOTIFICATION';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ─── Versioned Channel ID ────────────────────────────────────────────
// Android caches notification channel settings at creation time.
// If you change sound/importance/vibration, you MUST bump the version
// so Android creates a fresh channel with the new settings.
const EMERGENCY_CHANNEL_ID = 'emergency-broadcasts-v2';

let Notifications: any = null;
let RNIncomingCall: any = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) { }

    try {
        RNIncomingCall = require('react-native-full-screen-notification-incoming-call').default;
    } catch (e) { }
}

// ─── Notification Handler (Foreground) ───────────────────────────────
// SINGLE source of truth for foreground notification handling.
// Do NOT add another setNotificationHandler elsewhere (e.g. lib/notifications.ts).
if (Notifications) {
    Notifications.setNotificationHandler({
        handleNotification: async (notification: any) => {
            const data = notification.request.content.data as any;

            // If it's a broadcast, trigger FSI on Android for maximum visibility
            if (Platform.OS === 'android' && data?.isBroadcast) {
                triggerFullScreenAlert(data);
            }

            return {
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            };
        },
    });
}

// ─── Background Notification Task ────────────────────────────────────
// This fires when a push arrives while the app is killed or in background.
// On Android, this is invoked by the system when a data-bearing notification
// is received. We trigger the native FSI from here for "phone takeover".
if (!isExpoGo && Notifications) {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) {
            console.error('[BG Task] Error:', error);
            return;
        }

        const notificationData = (data as any)?.notification?.data;
        if (!notificationData) return;

        console.log('[BG Task] Background notification received:', JSON.stringify(notificationData));

        // Trigger FSI for broadcast alerts (not SOS — SOS goes to Watch Command app)
        if (notificationData.isBroadcast && Platform.OS === 'android') {
            try {
                triggerFullScreenAlert(notificationData);
            } catch (fsiErr) {
                // The native module bridge may not be fully initialized in background.
                // In this case, the standard notification in the tray will still appear
                // (because the push payload has title+body), and tapping it will open the app.
                console.warn('[BG Task] FSI trigger failed (expected if app was killed):', fsiErr);
            }
        }
    });

    // Register the background task — this tells expo-notifications to invoke
    // our task when a remote notification arrives while the app is not in foreground.
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err: any) => {
        // This will log "already registered" on subsequent mounts — that's normal.
        console.log('[BG Task] Registration:', err?.message || 'success');
    });
}

// ─── Full-Screen Alert Trigger (Android Native) ──────────────────────
// This uses the native Android FSI library to wake the screen,
// play alarm, and show a full-screen UI even when locked
function triggerFullScreenAlert(data: any) {
    if (isExpoGo) return; // Native FSI not available in Expo Go
    try {
        const title = data.title || '📢 Emergency Broadcast';
        const message = data.message || 'An emergency broadcast has been issued.';
        const uuid = data.broadcastId || `broadcast-${Date.now()}`;

        console.log('[FSI] Triggering full-screen emergency alert:', uuid);

        const foregroundOptions: ForegroundOptionsModel = {
            channelId: EMERGENCY_CHANNEL_ID,
            channelName: 'Emergency Broadcasts',
            notificationIcon: 'ic_notification', // Android mipmap icon
            notificationTitle: title,
            notificationBody: message,
            answerText: 'VIEW ALERT',
            declineText: 'DISMISS',
            notificationColor: '#FF0000',
            notificationSound: 'emergency_alert', // raw sound resource name
            payload: JSON.stringify(data),
        };

        if (RNIncomingCall) {
            RNIncomingCall.displayNotification(
                uuid,       // unique call ID
                null,       // avatar URI (null = use default icon)
                30000,      // timeout in ms (30s — then it drops to heads-up)
                foregroundOptions,
            );
        }
    } catch (err) {
        console.error('[FSI] Failed to trigger full-screen alert:', err);
    }
}

// ─── Interface ───────────────────────────────────────────────────────
export interface NotificationBroadcastData {
    broadcastId?: string;
    title?: string;
    message?: string;
    severity?: 'extreme' | 'severe' | 'amber';
    isBroadcast?: boolean;
    type?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────
export function usePushNotifications(onBroadcastReceived?: (data: NotificationBroadcastData) => void) {
    const notificationListener = useRef<any | null>(null);
    const responseListener = useRef<any | null>(null);
    const coldStartChecked = useRef(false);

    async function registerForPushNotificationsAsync() {
        if (isExpoGo) {
            console.log('Skipping push token registration in Expo Go');
            return null;
        }

        let token;

        if (Platform.OS === 'android') {
            // Create versioned emergency broadcast channel
            // The v2 suffix forces Android to create a new channel with correct settings
            // (old channels cache their config and ignore code changes)
            await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
                name: 'Emergency Broadcasts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
                lightColor: '#FF0000',
                sound: 'emergency_alert.wav',
                bypassDnd: true,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                showBadge: true,
                enableVibrate: true,
            });

            // Also create a default channel for non-emergency notifications
            await Notifications.setNotificationChannelAsync('default', {
                name: 'General',
                importance: Notifications.AndroidImportance.HIGH,
                showBadge: true,
            });

            // Clean up old channel to avoid confusion
            try {
                await Notifications.deleteNotificationChannelAsync('emergency-broadcasts');
            } catch (_) { /* old channel may not exist */ }
        }

        if (Device.isDevice) {
            const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted' && canAskAgain) {
                const { status } = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                        allowCriticalAlerts: true,
                    },
                    // Android 13+ requires explicit POST_NOTIFICATIONS permission
                });
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Push notification permission NOT granted. Current status:', finalStatus);
                // On Android 13+, if permission is denied, the app cannot show notifications.
                // We should log this clearly for debugging production issues.
                return null;
            }

            try {
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId: '2ba9174f-05c8-4a7c-a227-86485c2803cd',
                })).data;
                console.log('Push Token successfully acquired:', token);
            } catch (tokenErr) {
                console.error('Error fetching Expo Push Token:', tokenErr);
                return null;
            }
        } else {
            console.warn('Push registration skipped: Not a physical device');
        }

        return token;
    }

    useEffect(() => {
        const syncToken = async () => {
            const token = await registerForPushNotificationsAsync();

            // Get current location for targeted emergency broadcasts
            let location = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
            } catch (e) {
                console.warn('Could not get location for notification sync:', e);
            }

            if (token || location) {
                try {
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                    if (sessionError) {
                        console.warn('[Push] Session error during sync:', sessionError.message);
                        return;
                    }
                    if (session?.user) {
                        const { error: rpcError } = await supabase.rpc('sync_user_profile_data', {
                            p_lat: location?.coords.latitude || null,
                            p_lng: location?.coords.longitude || null,
                            p_push_token: token || null
                        });
                        if (rpcError) console.warn('[Push] RPC Sync error:', rpcError.message);
                    }
                } catch (err) {
                    console.log('[Push] Critical sync failure:', err);
                }
            }

        };

        syncToken();

        // Re-sync on auth state changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                syncToken();
            }
        });

        // ─── Cold Start Handler ──────────────────────────────────────
        // When the app was killed and user taps a notification to open it,
        // the response listener may not fire because it was registered too late.
        // getLastNotificationResponseAsync() captures this scenario.
        if (!coldStartChecked.current && Notifications) {
            coldStartChecked.current = true;
            Notifications.getLastNotificationResponseAsync()
                .then((response: any) => {
                    if (response) {
                        const data = response.notification.request.content.data as NotificationBroadcastData;
                        if (data && (data.broadcastId || data.severity || data.isBroadcast)) {
                            console.log('[Push] Cold start: notification tapped while app was killed:', JSON.stringify(data));
                            onBroadcastReceived?.({
                                ...data,
                                title: data.title || response.notification.request.content.title || undefined,
                                message: data.message || response.notification.request.content.body || undefined,
                            });
                        }
                    }
                })
                .catch((err: any) => {
                    console.log('[Push] Cold start check error:', err);
                });
        }

        // ─── Notification Data Extractor ─────────────────────────────
        const handleNotificationData = (notification: any) => {
            const data = notification.request.content.data as NotificationBroadcastData;
            if (data && (data.broadcastId || data.severity || data.isBroadcast)) {
                console.log('[Push] Emergency signal detected in notification:', JSON.stringify(data));
                onBroadcastReceived?.({
                    ...data,
                    title: data.title || notification.request.content.title || undefined,
                    message: data.message || notification.request.content.body || undefined,
                });
            }
        };

        // ─── Foreground Notification Listener ────────────────────────
        if (Notifications) {
            notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
                console.log('[Push] Notification Received (foreground):', notification.request.content.title);
                handleNotificationData(notification);
            });

            // ─── Notification Tap Listener ───────────────────────────────
            // When user taps a notification — this is key for background/killed scenarios
            responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
                console.log('[Push] Notification Tapped:', response.notification.request.content.title);
                handleNotificationData(response.notification);
            });
        }

        // ─── FSI Library Event Listeners (Android) ───────────────────
        // When user answers/dismisses the native FSI notification
        if (Platform.OS === 'android' && !isExpoGo && RNIncomingCall) {
            RNIncomingCall.addEventListener('answer', (payload: any) => {
                console.log('[FSI] User answered emergency alert:', payload?.callUUID);
                // Dismiss the native FSI — the in-app overlay will take over
                RNIncomingCall.hideNotification();
                // The app is now in foreground; the real-time subscription
                // or the notification data will trigger the EmergencyBroadcastOverlay
            });

            RNIncomingCall.addEventListener('endCall', (payload: any) => {
                console.log('[FSI] User dismissed emergency alert:', payload?.callUUID);
                RNIncomingCall.hideNotification();
            });
        }

        // ─── AppState Listener (Re-sync on return) ──────────────────
        // If user goes to settings to enable notifications, we want to
        // grab the token immediately when they return.
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('[AppState] App returned to foreground, re-syncing token...');
                syncToken();
            }
        });

        return () => {
            authSubscription.unsubscribe();
            appStateSubscription.remove();
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
            if (Platform.OS === 'android' && !isExpoGo && RNIncomingCall) {
                RNIncomingCall.removeEventListener('answer');
                RNIncomingCall.removeEventListener('endCall');
            }
        };
    }, [onBroadcastReceived]);

    return { registerForPushNotificationsAsync };
}
