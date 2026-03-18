import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const payload = await req.json();
        const token = payload.token;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Missing token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
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

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        
        // Find the valid request
        const { data: requestRecord, error: fetchError } = await adminClient
            .from('account_deletion_requests')
            .select('*')
            .eq('user_id', user.id)
            .eq('token', token)
            .single();

        if (fetchError || !requestRecord) {
             return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // Check expiration
        if (new Date(requestRecord.expires_at) < new Date()) {
             return new Response(JSON.stringify({ error: 'Verification code has expired' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        console.log('Valid deletion request. Deleting user: ' + user.id);

        // Delete the user from Auth (GoTrue). This will cascade to public schemas.
        const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deletionError) {
             throw new Error('Supabase GoTrue User Deletion Failed: ' + deletionError.message);
        }

        // We do not need to manually delete the record because it should cascade when auth.users is deleted.
        // But just to be meticulously clean, if cascade takes a ms, we return early:

        return new Response(JSON.stringify({ message: 'Account permanently deleted' }), {
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
