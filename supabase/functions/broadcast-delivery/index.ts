// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/supabase-js@2" />
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_BATCH_SIZE = 1000;
const EXPO_CHUNK_SIZE = 100;
const EMERGENCY_CHANNEL_ID = 'emergency-broadcasts-v3';
const LEGACY_TRIGGER_SECRET = 'kir_internal_pulse_2026';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, x-internal-secret',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

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
        let lastId: string | null = null;
        let totalSent = 0;
        let totalTokens = 0;
        let totalFailed = 0;

        while (true) {
            let recipients: Array<{ id: string; push_token: string | null }> = [];
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
                    .select('id, push_token')
                    .in('id', staffIds)
                    .not('push_token', 'is', null);
                if (staffProfilesError) throw staffProfilesError;
                recipients = staffProfiles || [];
            } else {
                let citizenQuery = adminClient
                    .from('profiles')
                    .select('id, push_token, notification_prefs')
                    .not('push_token', 'is', null)
                    .order('id', { ascending: true })
                    .limit(TOKEN_BATCH_SIZE);
                if (lastId) citizenQuery = citizenQuery.gt('id', lastId);

                const { data: citizens, error: citizenError } = await citizenQuery;
                if (citizenError) throw citizenError;
                if (!citizens || citizens.length === 0) break;

                lastId = citizens[citizens.length - 1].id;
                pageLength = citizens.length;
                recipients = citizens.filter((citizen: any) => citizen.notification_prefs?.emergency !== false);
            }

            const tokens = recipients.map((recipient: any) => recipient.push_token).filter(Boolean);
            totalTokens += tokens.length;

            for (let index = 0; index < tokens.length; index += EXPO_CHUNK_SIZE) {
                const chunkTokens = tokens.slice(index, index + EXPO_CHUNK_SIZE);
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
                        .from('profiles')
                        .update({ push_token: null })
                        .in('push_token', invalidTokens);
                }

                totalFailed += failedInChunk;
                totalSent += chunk.length - failedInChunk;
            }

            if (pageLength < TOKEN_BATCH_SIZE) break;
        }

        return json({ success: true, sent: totalSent, failed: totalFailed, total: totalTokens, target: isSos ? 'staff' : 'citizens' });
    } catch (error: any) {
        console.error('Push delivery error:', error.message);
        return json({ error: 'Push delivery failed' }, 500);
    }
});
