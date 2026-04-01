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

        const { table, record, type } = payload;
        if (!record) throw new Error("No record found in payload");

        // Use service role key for full access to profiles (bypasses RLS)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let title = "";
        let body = "";
        let sound = "emergency_alert.wav";
        const channelId = "emergency-broadcasts-v2";

        if (table === 'sos_alerts') {
            if (type === 'UPDATE') {
                if (record.status === 'acknowledged') {
                    title = "🛡️ COMMAND INTERVENTION";
                    body = "Watch Command has acknowledged your signal. Help is being dispatched.";
                    sound = "default";
                } else if (record.status === 'resolved') {
                    title = "✅ CASE RESOLVED";
                    body = "Command Center has marked this rescue operation as finalized.";
                    sound = "default";
                } else {
                    return new Response(JSON.stringify({ success: true, reason: "Status update ignored" }));
                }
            } else {
                title = "🚨 EMERGENCY SOS";
                body = `SOS Signal: ${record.location_name || 'Emergency location'}. WATCH COMMAND ONLY ALERT.`;
            }
        } else {
            title = `📢 ${record.title || 'Official Broadcast'}`;
            body = record.message || '';
            sound = record.severity === 'extreme' ? 'emergency_alert.wav' : 'default';
        }

        const pageSize = 10000;
        let start = 0;
        let hasMore = true;
        let totalSentCount = 0;
        let totalTokensFound = 0;
        const errors: string[] = [];

        while (hasMore) {
            let tokens: string[] = [];
            const end = start + pageSize - 1;

            if (table === 'sos_alerts') {
                const { data: staffData, error: staffError } = await supabase
                    .from('profiles')
                    .select('push_token')
                    .in('role', ['admin', 'responder', 'staff'])
                    .not('push_token', 'is', null)
                    .range(start, end);

                if (staffError) throw staffError;
                tokens = staffData ? staffData.map((p: any) => p.push_token).filter(Boolean) : [];
            } else {
                const { data: allProfiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('push_token')
                    .not('push_token', 'is', null)
                    .range(start, end);

                if (profileError) throw profileError;
                tokens = allProfiles ? allProfiles.map((p: any) => p.push_token).filter(Boolean) : [];
            }

            if (tokens.length === 0) {
                hasMore = false;
                break;
            }

            totalTokensFound += tokens.length;
            console.log(`Processing DB batch ${start} to ${end}. Found ${tokens.length} tokens.`);

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
                priority: 'high',
                channelId,
                _contentAvailable: true,
                mutableContent: true,
                ttl: 0,
                expiration: Math.floor(Date.now() / 1000) + 3600,
                categoryId: 'emergency-broadcasts',
            }));

            // Send to Expo in chunks of 100
            const chunkSize = 100;
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
                        totalSentCount += chunk.length;
                    } else {
                        const errMsg = `Expo push chunk failed: ${responseText}`;
                        console.error(errMsg);
                        errors.push(errMsg);
                    }
                } catch (fetchError: any) {
                    const errMsg = `Fetch error on chunk: ${fetchError.message}`;
                    console.error(errMsg);
                    errors.push(errMsg);
                }
            }

            if (tokens.length < pageSize) {
                hasMore = false;
            } else {
                start += pageSize;
            }
        }

        if (totalTokensFound === 0) {
            console.log("No push tokens found to notify");
            return new Response(JSON.stringify({ success: true, sent: 0, total: 0, reason: "No tokens found" }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log(`Push delivery complete: ${totalSentCount}/${totalTokensFound} sent`);
        return new Response(JSON.stringify({
            success: errors.length === 0,
            sent: totalSentCount,
            total: totalTokensFound,
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
