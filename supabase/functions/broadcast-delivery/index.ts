// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/supabase-js@2" />
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_BATCH_SIZE = 1000;
const EXPO_CHUNK_SIZE = 100;
const FCM_CHUNK_SIZE = 50;
const BROADCAST_DEVICE_STALE_DAYS = 365;
const EMERGENCY_CHANNEL_ID = 'emergency-broadcasts-v4';
const VISIBLE_FALLBACK_CHANNEL_ID = 'emergency-broadcasts-v3';
const LEGACY_TRIGGER_SECRET = 'kir_internal_pulse_2026';
const FUNCTION_VERSION = '15-native-fcm-visible-fallback';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, x-internal-secret',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

type FcmCredentials = {
    client_email: string;
    private_key: string;
    project_id: string;
};

let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

const textEncoder = new TextEncoder();

const base64UrlEncode = (value: string | ArrayBuffer) => {
    const bytes = typeof value === 'string' ? textEncoder.encode(value) : new Uint8Array(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const pemToArrayBuffer = (pem: string) => {
    const base64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
};

const getFcmCredentials = (): FcmCredentials | null => {
    const raw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') || Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as FcmCredentials;
        if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
        return {
            ...parsed,
            private_key: parsed.private_key.replace(/\\n/g, '\n'),
        };
    } catch (error) {
        console.error('Invalid FCM service account JSON:', error);
        return null;
    }
};

const getFcmAccessToken = async (credentials: FcmCredentials) => {
    const now = Math.floor(Date.now() / 1000);
    if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt - 60 > now) {
        return cachedFcmAccessToken.token;
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
        iss: credentials.client_email,
        scope: FCM_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
    };
    const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
    const key = await crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(credentials.private_key),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, textEncoder.encode(unsignedJwt));
    const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    });
    if (!response.ok) throw new Error(`FCM auth failed: ${await response.text()}`);
    const result = await response.json();
    cachedFcmAccessToken = {
        token: result.access_token,
        expiresAt: now + Number(result.expires_in || 3600),
    };
    return cachedFcmAccessToken.token;
};

const isInvalidFcmTokenError = (status: number, body: string) => (
    status === 404 ||
    body.includes('UNREGISTERED') ||
    body.includes('registration token is not a valid') ||
    body.includes('Requested entity was not found')
);

const sendNativeFcmBroadcasts = async (
    credentials: FcmCredentials,
    tokens: string[],
    data: Record<string, string>,
    ttlSeconds: number,
) => {
    if (tokens.length === 0) return { sent: 0, failed: 0, failedTokens: [] as string[], invalidTokens: [] as string[] };
    const accessToken = await getFcmAccessToken(credentials);
    let sent = 0;
    let failed = 0;
    const failedTokens: string[] = [];
    const invalidTokens: string[] = [];

    for (let index = 0; index < tokens.length; index += FCM_CHUNK_SIZE) {
        const chunk = tokens.slice(index, index + FCM_CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (token) => {
            const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        token,
                        data,
                        android: {
                            priority: 'HIGH',
                            ttl: `${ttlSeconds}s`,
                            collapse_key: data.broadcastId || undefined,
                            direct_boot_ok: true,
                        },
                    },
                }),
            });
            if (response.ok) {
                const fallbackResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: {
                            token,
                            notification: {
                                title: data.title || 'Emergency Broadcast',
                                body: data.message || 'An official emergency alert has been issued.',
                            },
                            data: {
                                ...data,
                                kir_visible_fallback: 'true',
                            },
                            android: {
                                priority: 'HIGH',
                                ttl: `${ttlSeconds}s`,
                                collapse_key: `${data.broadcastId || 'broadcast'}-visible`,
                                direct_boot_ok: true,
                                notification: {
                                    channel_id: VISIBLE_FALLBACK_CHANNEL_ID,
                                    notification_priority: 'PRIORITY_MAX',
                                    visibility: 'PUBLIC',
                                    sound: 'emergency_alert',
                                    tag: data.broadcastId || undefined,
                                    color: '#FF0000',
                                    sticky: true,
                                    default_vibrate_timings: false,
                                },
                            },
                        },
                    }),
                });
                if (!fallbackResponse.ok) {
                    console.warn('FCM visible fallback failed:', await fallbackResponse.text());
                }
                return { ok: true, token };
            }
            const body = await response.text();
            return { ok: false, token, invalid: isInvalidFcmTokenError(response.status, body), body };
        }));

        for (const result of results) {
            if (result.ok) {
                sent += 1;
            } else {
                failed += 1;
                failedTokens.push(result.token);
                if (result.invalid) invalidTokens.push(result.token);
                console.warn('FCM delivery failed:', result.body);
            }
        }
    }

    return { sent, failed, failedTokens, invalidTokens };
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    try {
        // This endpoint is invoked by persisted-row database triggers only.
        // Remove LEGACY_TRIGGER_SECRET after the database trigger and Edge secret are rotated together.
        const expectedSecret = Deno.env.get('INTERNAL_BROADCAST_SECRET') || LEGACY_TRIGGER_SECRET;
        if (req.headers.get('x-internal-secret') !== expectedSecret) {
            return json({ error: 'Unauthorized trigger request' }, 401);
        }

        const payload = await req.json();
        const table = payload?.table;
        const recordId = payload?.record?.id;
        if (!recordId || (table !== 'broadcasts' && table !== 'sos_alerts')) {
            return json({ error: 'Unsupported delivery event' }, 400);
        }

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const recordFields = table === 'broadcasts'
            ? 'id, title, message, severity, expires_at'
            : 'id, location_name, status';
        const { data: record, error: recordError } = await adminClient
            .from(table)
            .select(recordFields)
            .eq('id', recordId)
            .single();
        if (recordError || !record) return json({ error: 'Persisted alert record was not found' }, 404);

        const isSos = table === 'sos_alerts';
        const title = isSos ? 'EMERGENCY SOS' : `Emergency Alert: ${record.title || 'Official Broadcast'}`;
        const body = isSos
            ? `SOS Signal: ${record.location_name || 'Emergency location'}`
            : record.message || '';
        const severity = isSos ? 'extreme' : record.severity || 'extreme';
        const sound = !isSos || severity === 'extreme' ? 'emergency_alert.wav' : 'default';
        const nowSeconds = Math.floor(Date.now() / 1000);
        const defaultLifetimeSeconds = isSos ? 5 * 60 : 24 * 60 * 60;
        const expiration = !isSos && record.expires_at
            ? Math.floor(new Date(record.expires_at).getTime() / 1000)
            : nowSeconds + defaultLifetimeSeconds;
        if (expiration <= nowSeconds) {
            return json({ success: true, sent: 0, total: 0, target: isSos ? 'staff' : 'citizens', expired: true });
        }
        const ttl = Math.max(60, Math.min(defaultLifetimeSeconds, expiration - nowSeconds));
        const fcmCredentials = !isSos ? getFcmCredentials() : null;
        let lastId: string | null = null;
        let totalSent = 0;
        let totalTokens = 0;
        let totalFailed = 0;
        let totalDevices = 0;
        let totalNativeAttempted = 0;
        let totalNativeSent = 0;
        let totalNativeFailed = 0;
        let totalExpoAttempted = 0;
        let totalExpoSent = 0;
        let totalExpoFailed = 0;
        let totalInvalidTokensRemoved = 0;

        while (true) {
            let recipients: Array<{
                id?: string;
                installation_id?: string;
                push_token?: string | null;
                expo_push_token?: string | null;
                fcm_push_token?: string | null;
            }> = [];
            let pageLength = 0;

            if (isSos) {
                let staffQuery = adminClient
                    .from('employees')
                    .select('id')
                    .not('id', 'is', null)
                    .order('id', { ascending: true })
                    .limit(TOKEN_BATCH_SIZE);
                if (lastId) staffQuery = staffQuery.gt('id', lastId);

                const { data: staff, error: staffError } = await staffQuery;
                if (staffError) throw staffError;
                if (!staff || staff.length === 0) break;

                lastId = staff[staff.length - 1].id;
                pageLength = staff.length;
                const staffIds = staff.map((employee: { id: string }) => employee.id);
                const { data: staffProfiles, error: staffProfilesError } = await adminClient
                    .from('profiles')
                    .select('id, push_token, fcm_push_token')
                    .in('id', staffIds)
                    .or('push_token.not.is.null,fcm_push_token.not.is.null');
                if (staffProfilesError) throw staffProfilesError;
                recipients = staffProfiles || [];
            } else {
                let citizenQuery = adminClient
                    .from('device_push_registrations')
                    .select('installation_id, expo_push_token, fcm_push_token, notification_permission, full_screen_intent_allowed')
                    .eq('opted_out_emergency', false)
                    .gt('last_seen_at', new Date(Date.now() - BROADCAST_DEVICE_STALE_DAYS * 24 * 60 * 60 * 1000).toISOString())
                    .or('expo_push_token.not.is.null,fcm_push_token.not.is.null')
                    .order('installation_id', { ascending: true })
                    .limit(TOKEN_BATCH_SIZE);
                if (lastId) citizenQuery = citizenQuery.gt('installation_id', lastId);

                const { data: devices, error: deviceError } = await citizenQuery;
                if (deviceError) throw deviceError;
                if (!devices || devices.length === 0) break;

                lastId = devices[devices.length - 1].installation_id;
                pageLength = devices.length;
                recipients = devices || [];
            }

            totalDevices += recipients.length;
            const nativeRecipients = fcmCredentials
                ? recipients.filter((recipient: any) => recipient.fcm_push_token)
                : [];
            const nativeTokens = nativeRecipients.map((recipient: any) => recipient.fcm_push_token).filter(Boolean);
            let expoTokens = recipients
                .filter((recipient: any) => !fcmCredentials || !recipient.fcm_push_token)
                .map((recipient: any) => isSos ? recipient.push_token : recipient.expo_push_token)
                .filter(Boolean);
            totalTokens += nativeTokens.length + expoTokens.length;
            totalNativeAttempted += nativeTokens.length;
            const addExpoFallbackTokens = (tokens: string[]) => {
                const tokenSet = new Set(expoTokens);
                for (const token of tokens) {
                    if (token && !tokenSet.has(token)) {
                        tokenSet.add(token);
                        expoTokens.push(token);
                    }
                }
            };

            if (fcmCredentials && nativeTokens.length > 0) {
                const nativePayload = {
                    kir_native_fullscreen: 'true',
                    broadcastId: String(record.id),
                    type: 'broadcast',
                    severity: String(severity),
                    title: String(title),
                    message: String(body),
                    isBroadcast: 'true',
                };
                try {
                    const nativeResult = await sendNativeFcmBroadcasts(fcmCredentials, nativeTokens, nativePayload, ttl);
                    totalNativeSent += nativeResult.sent;
                    totalSent += nativeResult.sent;
                    totalFailed += nativeResult.failed;
                    totalNativeFailed += nativeResult.failed;

                    if (nativeResult.failedTokens.length > 0) {
                        const fallbackTokens = nativeRecipients
                            .filter((recipient: any) => nativeResult.failedTokens.includes(recipient.fcm_push_token))
                            .map((recipient: any) => isSos ? recipient.push_token : recipient.expo_push_token)
                            .filter(Boolean);
                        addExpoFallbackTokens(fallbackTokens);
                    }

                    if (nativeResult.invalidTokens.length > 0) {
                        await adminClient
                            .from(isSos ? 'profiles' : 'device_push_registrations')
                            .update({ fcm_push_token: null })
                            .in('fcm_push_token', nativeResult.invalidTokens);
                        totalInvalidTokensRemoved += nativeResult.invalidTokens.length;
                    }
                } catch (nativeError: any) {
                    console.error('Native FCM delivery failed; falling back to Expo push:', nativeError?.message || nativeError);
                    totalFailed += nativeTokens.length;
                    totalNativeFailed += nativeTokens.length;
                    addExpoFallbackTokens(nativeRecipients
                        .map((recipient: any) => isSos ? recipient.push_token : recipient.expo_push_token)
                        .filter(Boolean));
                }
            }

            for (let index = 0; index < expoTokens.length; index += EXPO_CHUNK_SIZE) {
                const chunkTokens = expoTokens.slice(index, index + EXPO_CHUNK_SIZE);
                totalExpoAttempted += chunkTokens.length;
                const chunk = chunkTokens.map((token: string) => ({
                    to: token,
                    title,
                    body,
                    subtitle: 'Kenya Incident Reporter',
                    data: {
                        broadcastId: record.id,
                        type: isSos ? 'emergency' : 'broadcast',
                        severity,
                        title,
                        message: body,
                        isBroadcast: !isSos,
                    },
                    sound,
                    priority: 'high',
                    channelId: EMERGENCY_CHANNEL_ID,
                    _contentAvailable: true,
                    mutableContent: true,
                    ttl,
                    expiration,
                    categoryId: 'emergency-broadcasts',
                }));

                const response = await fetch(EXPO_PUSH_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(chunk),
                });
                if (!response.ok) throw new Error(`Expo push delivery failed: ${await response.text()}`);
                const result = await response.json();
                const tickets = Array.isArray(result?.data) ? result.data : [];
                const invalidTokens: string[] = [];
                let failedInChunk = 0;

                tickets.forEach((ticket: any, ticketIndex: number) => {
                    if (ticket?.status === 'error') {
                        failedInChunk += 1;
                        if (ticket?.details?.error === 'DeviceNotRegistered' && chunkTokens[ticketIndex]) {
                            invalidTokens.push(chunkTokens[ticketIndex]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    await adminClient
                        .from(isSos ? 'profiles' : 'device_push_registrations')
                        .update(isSos ? { push_token: null } : { expo_push_token: null })
                        .in(isSos ? 'push_token' : 'expo_push_token', invalidTokens);
                    totalInvalidTokensRemoved += invalidTokens.length;
                }

                totalFailed += failedInChunk;
                totalExpoFailed += failedInChunk;
                totalSent += chunk.length - failedInChunk;
                totalExpoSent += chunk.length - failedInChunk;
            }

            if (pageLength < TOKEN_BATCH_SIZE) break;
        }

        if (!isSos) {
            await adminClient
                .from('broadcast_delivery_attempts')
                .insert({
                    broadcast_id: record.id,
                    target: 'citizens',
                    native_fcm_configured: Boolean(fcmCredentials),
                    total_devices: totalDevices,
                    total_tokens: totalTokens,
                    native_attempted: totalNativeAttempted,
                    native_sent: totalNativeSent,
                    native_failed: totalNativeFailed,
                    expo_attempted: totalExpoAttempted,
                    expo_sent: totalExpoSent,
                    expo_failed: totalExpoFailed,
                    invalid_tokens_removed: totalInvalidTokensRemoved,
                    function_version: FUNCTION_VERSION,
                    error_summary: !fcmCredentials
                        ? 'Native FCM service account secret is not configured; Expo fallback only.'
                        : null,
                });
        }

        return json({
            success: true,
            sent: totalSent,
            nativeSent: totalNativeSent,
            expoSent: totalExpoSent,
            failed: totalFailed,
            total: totalTokens,
            target: isSos ? 'staff' : 'citizens',
            nativeFcmConfigured: Boolean(fcmCredentials),
        });
    } catch (error: any) {
        console.error('Push delivery error:', error.message);
        return json({ error: 'Push delivery failed' }, 500);
    }
});
