import { supabase } from '@/lib/supabase';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface NotificationBroadcastData {
    broadcastId?: string;
    title?: string;
    message?: string;
    severity?: 'extreme' | 'severe' | 'amber';
    isBroadcast?: boolean;
}

export function usePushNotifications(onBroadcastReceived?: (data: NotificationBroadcastData) => void) {
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
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
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
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

        // Listen for auth state changes to re-sync (crucial after login/signup)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                syncToken();
            }
        });

        const handleNotificationData = (notification: Notifications.Notification) => {
            const data = notification.request.content.data as NotificationBroadcastData;
            // Detect if this is a broadcast alert
            if (data && (data.broadcastId || data.severity || data.isBroadcast)) {
                console.log('Detected emergency signal in notification data:', data);
                onBroadcastReceived?.({
                    ...data,
                    title: data.title || notification.request.content.title || undefined,
                    message: data.message || notification.request.content.body || undefined,
                });
            }
        };

        // Listen for incoming notifications while the app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification Received:', notification);
            handleNotificationData(notification);
        });

        // Listen for when a user taps on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification Tapped:', response);
            handleNotificationData(response.notification);
        });

        return () => {
            authSubscription.unsubscribe();
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [onBroadcastReceived]);

    return { registerForPushNotificationsAsync };
}
