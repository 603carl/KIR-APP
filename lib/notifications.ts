import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Skip registration in Expo Go or Simulator/Emulator to avoid crashes/warnings
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isDevice = Device.isDevice;

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    if (isExpoGo || !isDevice) {
        console.log('Push notification registration skipped: Running in Expo Go or non-physical device.');
        return null;
    }

    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId: '2ba9174f-05c8-4a7c-a227-86485c2803cd',
        })).data;
    } catch (error) {
        console.log('Error getting push token:', error);
    }

    return token;
}

export async function savePushToken(userId: string, token: string) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) {
            console.error('Error saving push token:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Exception saving push token:', e);
        return false;
    }
}

export async function sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Emergency Alert Test 🚨",
            body: "This is a critical system notification from the Kenya Incident Report system.",
            data: { type: 'test' },
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2,
        },
    });
}
