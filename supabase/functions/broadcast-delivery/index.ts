// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/supabase-js@2" />
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
    try {
        // Enforce Authentication via Bearer JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization Header' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
            });
        }
        
        // Use anon key and auth header to securely verify the JWT natively
        const authClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: authData, error: authError } = await authClient.auth.getUser();
        if (authError || !authData.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or Expired JWT' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const payload = await req.json();
        console.log('Push Payload Received:', JSON.stringify(payload));

        const { table, record } = payload;
        if (!record) throw new Error("No record found in payload");

        // Use service role key for full access to profiles (bypasses RLS)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let tokens: string[] = [];
        let title = "";
        let body = "";
        let sound = "emergency_alert.wav";
        const channelId = "emergency-broadcasts-v2";

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
            tokens = staffData ? staffData.map((p: any) => p.push_token).filter(Boolean) : [];
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
            tokens = allProfiles ? allProfiles.map((p: any) => p.push_token).filter(Boolean) : [];
            console.log(`Broadcast targeting ${tokens.length} public users.`);
        }

        if (tokens.length === 0) {
            console.log("No push tokens found to notify");
            return new Response(JSON.stringify({ success: true, sent: 0, total: 0, reason: "No tokens found" }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Build Expo push messages with ALL fields for reliable background delivery
        // Key requirements:
        // 1. title + body must be present (so Android shows notification even with killed app)
        // 2. priority: 'high' ensures FCM delivers immediately
        // 3. channelId must match the channel created in the app
        // 4. data contains the broadcast metadata for in-app processing
        // 5. _contentAvailable: true wakes iOS app in background
        // 6. mutableContent: true allows iOS notification service extension
        const messages = tokens.map(token => ({
            to: token,
            title,
            body,
            subtitle: table === 'sos_alerts' ? 'WATCH COMMAND' : 'Kenya Incident Reporter',
            data: {
                broadcastId: record.id,
                type: table === 'sos_alerts' ? 'emergency' : 'broadcast',
                severity: record.severity || 'extreme',
                title,
                message: body,
                lat: record.lat ?? null,
                lng: record.lng ?? null,
                isBroadcast: table === 'broadcasts',
            },
            sound,
            // Android: HIGH priority = immediate delivery via FCM high-priority
            priority: 'high',
            // Android: Route to the correct notification channel
            channelId,
            // iOS: Wake the app in the background to process data
            _contentAvailable: true,
            // iOS: Allow notification service extension to modify content
            mutableContent: true,
            // Deliver immediately, don't batch
            ttl: 0,
            // Expire after 1 hour
            expiration: Math.floor(Date.now() / 1000) + 3600,
            // iOS: Category for actionable notifications
            categoryId: 'emergency-broadcasts',
        }));

        // Send to Expo in chunks of 100
        const chunkSize = 100;
        let sentCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < messages.length; i += chunkSize) {
            const chunk = messages.slice(i, i + chunkSize);
            try {
                const res = await fetch(EXPO_PUSH_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(chunk),
                });

                const responseText = await res.text();

                if (res.ok) {
                    sentCount += chunk.length;
                    console.log(`Chunk ${Math.floor(i / chunkSize) + 1} sent successfully (${chunk.length} messages)`);

                    // Parse response to check for individual ticket errors
                    try {
                        const responseData = JSON.parse(responseText);
                        if (responseData.data) {
                            const ticketErrors = responseData.data.filter((t: any) => t.status === 'error');
                            if (ticketErrors.length > 0) {
                                console.warn(`${ticketErrors.length} ticket(s) had errors:`, JSON.stringify(ticketErrors.slice(0, 3)));
                            }
                        }
                    } catch (_) { /* ignore parse errors */ }
                } else {
                    const errMsg = `Expo push chunk ${Math.floor(i / chunkSize) + 1} failed: ${responseText}`;
                    console.error(errMsg);
                    errors.push(errMsg);
                }
            } catch (fetchError: any) {
                const errMsg = `Fetch error on chunk ${Math.floor(i / chunkSize) + 1}: ${fetchError.message}`;
                console.error(errMsg);
                errors.push(errMsg);
            }
        }

        console.log(`Push delivery complete: ${sentCount}/${tokens.length} sent`);
        return new Response(JSON.stringify({
            success: errors.length === 0,
            sent: sentCount,
            total: tokens.length,
            errors: errors.length > 0 ? errors : undefined,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Push Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
