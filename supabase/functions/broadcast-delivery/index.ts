// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/supabase-js@2" />
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
    try {
        const payload = await req.json();
        console.log('Push Payload Received:', JSON.stringify(payload));

        const { table, record } = payload;
        if (!record) throw new Error("No record found in payload");

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let tokens: string[] = [];
        let title = "";
        let body = "";
        let sound = "emergency_alert.wav";
        const channelId = "emergency-broadcasts";

        if (table === 'sos_alerts') {
            // SOS: Staff/Watch Command ONLY — citizens never receive this
            title = "🚨 EMERGENCY SOS";
            body = `SOS Signal: ${record.location_name || 'Emergency location'}. WATCH COMMAND ONLY ALERT.`;

            const { data: staffData, error: staffError } = await supabase
                .from('profiles')
                .select('push_token')
                .in('role', ['admin', 'responder', 'staff'])
                .not('push_token', 'is', null);

            if (staffError) throw staffError;
            tokens = staffData ? staffData.map((p: any) => p.push_token) : [];
            console.log(`SOS targeting restricted to ${tokens.length} staff members.`);

        } else {
            // BROADCAST: All users — this triggers phone takeover on the app
            title = `📢 ${record.title || 'Official Broadcast'}`;
            body = record.message || '';
            sound = record.severity === 'extreme' ? 'emergency_alert.wav' : 'default';

            const { data: allProfiles, error: profileError } = await supabase
                .from('profiles')
                .select('push_token')
                .not('push_token', 'is', null);

            if (profileError) throw profileError;
            tokens = allProfiles ? allProfiles.map((p: any) => p.push_token) : [];
            console.log(`Broadcast targeting ${tokens.length} public users.`);
        }

        if (tokens.length === 0) {
            console.log("No push tokens found to notify");
            return new Response("No tokens found", { status: 200 });
        }

        // Build Expo push messages with all fields for phone takeover
        const messages = tokens.map(token => ({
            to: token,
            title,
            body,
            data: {
                broadcastId: record.id,
                type: table === 'sos_alerts' ? 'emergency' : 'broadcast',
                severity: record.severity || 'extreme',
                title,
                message: body,
                lat: record.lat,
                lng: record.lng,
                isBroadcast: table === 'broadcasts',
            },
            sound,
            priority: 'high',
            channelId,
            // iOS: wake app in background to process
            _contentAvailable: true,
            // Deliver immediately
            ttl: 0,
            expiration: Math.floor(Date.now() / 1000) + 3600,
            categoryId: 'emergency-broadcasts',
        }));

        // Send to Expo in chunks of 100
        const chunkSize = 100;
        let sentCount = 0;
        for (let i = 0; i < messages.length; i += chunkSize) {
            const chunk = messages.slice(i, i + chunkSize);
            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(chunk),
            });
            if (res.ok) sentCount += chunk.length;
            else console.error('Expo push chunk failed:', await res.text());
        }

        console.log(`Push delivery complete: ${sentCount}/${tokens.length} sent`);
        return new Response(JSON.stringify({ success: true, sent: sentCount, total: tokens.length }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Push Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
