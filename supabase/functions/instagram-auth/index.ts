import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
        return Response.redirect(`${Deno.env.get('SUPABASE_URL')}/dashboard/instagram?error=${error}`)
    }

    if (code && state) {
        try {
            // 1. Authenticate Supabase User
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: `Bearer ${state}` } } }
            )

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
            if (userError || !user) throw new Error('Invalid authentication state')

            // 2. Exchange Code for Short-Lived Token (Instagram API)
            const clientId = Deno.env.get('INSTAGRAM_APP_ID')
            const clientSecret = Deno.env.get('INSTAGRAM_APP_SECRET')
            const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth/callback`

            const tokenParams = new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code,
            })

            // Note: Instagram API uses api.instagram.com for code exchange
            console.log('Exchanging code for token...')
            const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
                method: 'POST',
                body: tokenParams,
            })

            const tokenData = await tokenRes.json()
            console.log('Token Data:', tokenData) // LOGGING

            if (tokenData.error_message) throw new Error(tokenData.error_message)
            if (!tokenData.access_token) throw new Error('Failed to retrieve access token')

            const shortLivedToken = tokenData.access_token
            const igUserId = tokenData.user_id // We get the user ID immediately here

            // 3. Exchange for Long-Lived Token (Graph API)
            console.log('Exchanging for long-lived token...')
            const longLivedRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`)
            const longLivedData = await longLivedRes.json()
            console.log('Long Lived Data:', longLivedData) // LOGGING

            const accessToken = longLivedData.access_token || shortLivedToken

            // 4. Get User Profile (Username, Picture)
            console.log('Fetching user profile...')
            const profileRes = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`)
            const profileData = await profileRes.json()
            console.log('Profile Data:', profileData) // LOGGING

            // 5. Save to Database
            console.log('Saving to DB for user:', user.id)
            const { error: upsertError } = await supabaseClient
                .from('instagram_integrations')
                .upsert({
                    user_id: user.id,
                    instagram_user_id: igUserId.toString(),
                    instagram_username: profileData.username,
                    access_token: accessToken,
                    profile_picture_url: null, // Basic Display API doesn't always give this easily without more permissions
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (upsertError) {
                console.error('DB Upsert Error:', upsertError)
                throw new Error('Database Save Failed: ' + upsertError.message)
            }

            return Response.redirect('http://localhost:8080/dashboard/instagram?success=true')

        } catch (err) {
            console.error('Auth Error:', err)
            return Response.redirect(`http://localhost:8080/dashboard/instagram?error=${encodeURIComponent(err.message)}`)
        }
    }

    return new Response('Instagram Auth Function Ready', { headers: corsHeaders })
})
