import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const FAST_PREFIX = '@kir-startup:';

// These values control navigation only and do not contain credentials or PII.
// AsyncStorage avoids a keystore round trip during normal cold starts.
export async function getStartupItem(key: string): Promise<string | null> {
    const fastKey = `${FAST_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(fastKey);
    if (cached !== null) return cached;

    const legacy = await SecureStore.getItemAsync(key);
    if (legacy !== null) {
        await AsyncStorage.setItem(fastKey, legacy);
    }
    return legacy;
}

export async function setStartupItem(key: string, value: string): Promise<void> {
    await Promise.all([
        AsyncStorage.setItem(`${FAST_PREFIX}${key}`, value),
        SecureStore.setItemAsync(key, value),
    ]);
}
