// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/supabase-js@2" />
/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization Header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid JWT' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins TTL

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        
        // Delete any existing requests for this user
        await adminClient.from('account_deletion_requests').delete().eq('user_id', user.id);

        // Store the new OTP
        const { error: insertError } = await adminClient.from('account_deletion_requests').insert({
            user_id: user.id,
            token: otp,
            expires_at: expiresAt.toISOString(),
        });

        if (insertError) {
            throw new Error('Failed to create request: ' + insertError.message);
        }

        // Send email via Resend if configured, otherwise mock for dev
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
            const resData = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + resendApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Watch Command <security@watchcommand.co.ke>',
                    to: [user.email],
                    subject: 'Kenya Incident Reporter: Account Deletion Request',
                    html: '<h2>Account Deletion Request</h2><p>We received a request to permanently delete your account.</p><p>Your 6-digit confirmation code is: <strong>' + otp + '</strong></p><p>This code expires in 15 minutes. If you did not request this, please secure your account immediately.</p>'
                })
            });
            if (!resData.ok) {
                 console.error('Failed to send email:', await resData.text());
            }
        } else {
            console.log('[MOCK EMAIL SENT] To: ' + user.email + ', OTP: ' + otp);
        }

        return new Response(JSON.stringify({ 
             message: 'Deletion request initiated. Check your email.', 
             mockOtpIfNoResend: !resendApiKey ? otp : undefined 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
