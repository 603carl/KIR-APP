import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// FAIL CLOSED: If env vars are missing, the EAS build is misconfigured.
// A silent console.error would allow the app to initialize a non-functional
// Supabase client, causing every screen to hang in an infinite loading state.
// Throwing here produces an immediate, visible red screen in development
// and a native crash report in production — both are vastly preferable to
// silent data failure.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '[Supabase] CRITICAL: Environment variables are not defined.\n' +
        'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n' +
        'For EAS builds: ensure these are configured via `npx eas env:create production`.\n' +
        'For local dev: ensure your .env file exists and contains both variables.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 15000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 200, 5000),
    },
});

const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
let sessionReadInFlight: ReturnType<typeof supabase.auth.getSession> | null = null;

function isInvalidRefreshToken(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '');
    return message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found');
}

export async function getSessionSafely() {
    if (!sessionReadInFlight) {
        sessionReadInFlight = (async () => {
            const result = await supabase.auth.getSession();
            if (!result.error || !isInvalidRefreshToken(result.error)) {
                return result;
            }

            // A revoked token is device-local state. Clear it without revoking
            // any valid sessions held on other devices.
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
            await AsyncStorage.removeItem(authStorageKey).catch(() => undefined);
            return { data: { session: null }, error: null };
        })().finally(() => {
            sessionReadInFlight = null;
        });
    }

    return sessionReadInFlight;
}

