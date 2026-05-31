import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface CacheEnvelope<T> {
    savedAt: number;
    value: T;
}

const CACHE_PREFIX = '@kir-cache:v1:';

function secureStoreKey(key: string): string {
    // Expo SecureStore rejects AsyncStorage-style separators such as "@" and ":".
    return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export const cacheKeys = {
    displayProfile: (userId: string) => `${CACHE_PREFIX}display-profile:${userId}`,
    communityFeed: (userId: string) => `${CACHE_PREFIX}community-feed:${userId}`,
    communityStats: (userId: string) => `${CACHE_PREFIX}community-stats:${userId}`,
};

export async function readCache<T>(key: string, maxAgeMs: number): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const envelope = JSON.parse(raw) as CacheEnvelope<T>;
        if (!envelope.savedAt || Date.now() - envelope.savedAt > maxAgeMs) {
            await AsyncStorage.removeItem(key);
            return null;
        }

        return envelope.value;
    } catch {
        await AsyncStorage.removeItem(key).catch(() => undefined);
        return null;
    }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
    const envelope: CacheEnvelope<T> = {
        savedAt: Date.now(),
        value,
    };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

export async function removeCache(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
}

export async function readSecureCache<T>(key: string, maxAgeMs: number): Promise<T | null> {
    const storageKey = secureStoreKey(key);
    try {
        const raw = await SecureStore.getItemAsync(storageKey);
        if (!raw) return null;

        const envelope = JSON.parse(raw) as CacheEnvelope<T>;
        if (!envelope.savedAt || Date.now() - envelope.savedAt > maxAgeMs) {
            await SecureStore.deleteItemAsync(storageKey);
            return null;
        }

        return envelope.value;
    } catch {
        await SecureStore.deleteItemAsync(storageKey).catch(() => undefined);
        return null;
    }
}

export async function writeSecureCache<T>(key: string, value: T): Promise<void> {
    const envelope: CacheEnvelope<T> = {
        savedAt: Date.now(),
        value,
    };
    await SecureStore.setItemAsync(secureStoreKey(key), JSON.stringify(envelope));
}

export async function removeSecureCache(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(secureStoreKey(key));
}
