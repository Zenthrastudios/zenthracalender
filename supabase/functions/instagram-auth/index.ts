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
        const siteUrl = Deno.env.get('SITE_URL') || 'https://cal.zenthrashop.in'
        return Response.redirect(`${siteUrl}/dashboard/instagram?error=${error}`)
    }

    if (code && state) {
        try {
            // 1. Authenticate Supabase User using the 'state' token
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: `Bearer ${state}` } } }
            )

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
            if (userError || !user) throw new Error('Invalid authentication state')

            const clientId = Deno.env.get('INSTAGRAM_APP_ID')
            const clientSecret = Deno.env.get('INSTAGRAM_APP_SECRET')
            const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth`

            // --- Step 2. Exchange the Code For a Token ---
            // POST https://api.instagram.com/oauth/access_token
            console.log('Exchanging code for short-lived token...')
            const formData = new FormData()
            formData.append('client_id', clientId!)
            formData.append('client_secret', clientSecret!)
            formData.append('grant_type', 'authorization_code')
            formData.append('redirect_uri', redirectUri)
            formData.append('code', code.replace(/#_$/, '')) // Strip #_ if present

            const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
                method: 'POST',
                body: formData,
            })

            const tokenData = await tokenRes.json()
            console.log('Short-lived Token Response:', JSON.stringify(tokenData))

            if (tokenData.error_message || tokenData.error) {
                console.error('Step 2 Error:', tokenData.error_message || tokenData.error)
                throw new Error(tokenData.error_message || 'Failed to exchange code')
            }

            // Instagram Business Login returns data in a 'data' array
            const tokenInfo = tokenData.data?.[0] || tokenData
            let accessToken = tokenInfo.access_token
            let instagramUserId = tokenInfo.user_id

            if (!accessToken) {
                throw new Error('No access token received from Instagram')
            }

            // --- Step 3. Get a long-lived access token ---
            console.log('Exchanging for long-lived token...')
            const longLivedRes = await fetch(
                `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${accessToken}`
            )
            const longLivedData = await longLivedRes.json()
            console.log('Long-lived Token Response Received')

            if (longLivedData.access_token) {
                accessToken = longLivedData.access_token
            }

            // --- Step 4. Get Instagram Profile Info ---
            console.log('--- Fetching Instagram Profile ---')
            let username = 'Instagram User'
            let finalIgId = instagramUserId // Use the Instagram-scoped user ID
            let finalToken = accessToken

            try {
                // Get Instagram profile info (username only - ig_id not available with Business Login)
                const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`)
                const meData = await meRes.json()
                console.log('Instagram Profile Response:', JSON.stringify(meData))
                
                if (meData.username) {
                    username = meData.username
                    console.log('✓ Username retrieved:', username)
                }
                
                if (meData.id) {
                    finalIgId = meData.id.toString()
                    console.log('✓ Instagram Business Account ID:', finalIgId)
                }
            } catch (err) {
                console.warn('Profile fetch error:', err)
                // Continue with fallback values
            }

            // 5. Save to Database
            // Note: Webhook subscriptions for Instagram Business Login must be configured
            // manually in the Meta App Dashboard under "Configure webhooks"
            console.log('Final Choice -> IGID:', finalIgId, 'User:', username)
            const { error: upsertError } = await supabaseClient
                .from('instagram_integrations')
                .upsert({
                    user_id: user.id,
                    instagram_user_id: finalIgId?.toString(),
                    instagram_account_id: finalIgId?.toString(), // Store Business Account ID for webhook matching
                    instagram_username: username,
                    access_token: finalToken,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (upsertError) throw upsertError

            const siteUrl = Deno.env.get('SITE_URL') || 'https://cal.zenthrashop.in'
            return Response.redirect(`${siteUrl}/dashboard/instagram?success=true`)

        } catch (err: any) {
            console.error('Auth Error:', err)
            const siteUrl = Deno.env.get('SITE_URL') || 'https://cal.zenthrashop.in'
            const errorParam = encodeURIComponent(err.message || 'Unknown Error')
            return Response.redirect(`${siteUrl}/dashboard/instagram?error=${errorParam}`)
        }
    }

    return new Response('Auth handler active', { headers: corsHeaders })
})
