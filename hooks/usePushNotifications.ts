import { supabase } from '@/lib/supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { ForegroundOptionsModel } from 'react-native-full-screen-notification-incoming-call';

// ─── Constants ───────────────────────────────────────────────────────
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_EMERGENCY_NOTIFICATION';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
// It's the key to "phone takeover" — we trigger the native FSI from here.
if (!isExpoGo && Notifications) {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) {
            console.error('[BG Task] Error:', error);
            return;
        }

        const notificationData = (data as any)?.notification?.data;
        if (!notificationData) return;

        console.log('[BG Task] Background notification received:', JSON.stringify(notificationData));

        // Only trigger FSI for broadcast alerts (not SOS — SOS goes to Watch Command app)
        if (notificationData.isBroadcast && Platform.OS === 'android') {
            triggerFullScreenAlert(notificationData);
        }
    });

    // Register the background task
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err: any) => {
        console.log('[BG Task] Registration (may already be registered):', err?.message);
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
            channelId: 'emergency-broadcasts',
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

    async function registerForPushNotificationsAsync() {
        if (isExpoGo) {
            console.log('Skipping push token registration in Expo Go');
            return null;
        }

        let token;

        if (Platform.OS === 'android') {
            // Create high-priority notification channel for emergency broadcasts
            await Notifications.setNotificationChannelAsync('emergency-broadcasts', {
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
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                        allowCriticalAlerts: true,  // iOS: Request critical alert permission
                    },
                });
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.warn('Failed to get push token for push notification!');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: '2ba9174f-05c8-4a7c-a227-86485c2803cd',
            })).data;

            console.log('Push Token:', token);
        } else {
            console.warn('Must use physical device for Push Notifications');
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
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.rpc('sync_user_profile_data', {
                        p_lat: location?.coords.latitude || null,
                        p_lng: location?.coords.longitude || null,
                        p_push_token: token || null
                    });
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

        return () => {
            authSubscription.unsubscribe();
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
