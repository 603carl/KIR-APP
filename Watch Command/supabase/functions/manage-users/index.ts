import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore: Deno namespace is available at runtime
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
// @ts-ignore: Deno namespace is available at runtime
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
        )

        // Verify the caller is an admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) throw new Error('Invalid token')

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { action, email, password, full_name, role, user_id, department, county, phone, employee_id } = await req.json()

        const logAudit = async (action: string, target: string, details: any) => {
            await supabaseClient.from('staff_audit_logs').insert({
                actor_id: user.id,
                action,
                target_resource: target,
                details
            })
        }

        if (action === 'create') {
            const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role }
            })

            if (createError) throw createError

            // Update employee record with extra details
            await supabaseClient.from('employees').update({
                role,
                full_name,
                employee_id,
                department,
                county,
                phone
            }).eq('id', newUser.user.id)

            await logAudit('create_user', newUser.user.id, { email, role, full_name, employee_id, department, county })

            return new Response(
                JSON.stringify({ user: newUser.user, message: 'User created successfully' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'disable') {
            if (!user_id) throw new Error('User ID required')

            const { error } = await supabaseClient.auth.admin.updateUserById(
                user_id,
                { ban_duration: '876000h' } // ~100 years
            )

            if (error) throw error

            await logAudit('disable_user', user_id, {})

            return new Response(
                JSON.stringify({ message: 'User disabled successfully' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'delete') {
            if (!user_id) throw new Error('User ID required')

            const { error } = await supabaseClient.auth.admin.deleteUser(user_id)

            if (error) throw error

            await logAudit('delete_user', user_id, {})

            return new Response(
                JSON.stringify({ message: 'User deleted successfully' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error(`Unknown action: ${action}`)

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
