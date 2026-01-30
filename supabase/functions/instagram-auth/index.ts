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
        const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:8080'
        return Response.redirect(`${siteUrl}/dashboard/instagram?error=${error}`)
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
            const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth`

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

            // 4. Get the Instagram Business Account ID
            console.log('Fetching linked business accounts...')
            const accountsRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=name,access_token,instagram_business_account&access_token=${accessToken}`)
            const accountsData = await accountsRes.json()
            console.log('Accounts Data Response:', JSON.stringify(accountsData))

            let finalIgUserId = igUserId // Fallback to current IG ID
            let profilePicture = null
            let username = 'Instagram User'

            // Look for Business Account link
            if (accountsData.data && accountsData.data.length > 0) {
                const pageWithIg = accountsData.data.find((p: any) => p.instagram_business_account);
                if (pageWithIg) {
                    finalIgUserId = pageWithIg.instagram_business_account.id;
                    console.log('Found Instagram Business Account ID:', finalIgUserId);
                }
            }

            // 5. Get Detailed User Profile (Try multiple sources)
            console.log('Fetching profile for ID:', finalIgUserId)
            try {
                // Try Instagram Graph API first
                const profileRes = await fetch(`https://graph.facebook.com/v18.0/${finalIgUserId}?fields=username,profile_picture_url&access_token=${accessToken}`)
                const profileData = await profileRes.json()
                console.log('Profile Data (Graph):', JSON.stringify(profileData))

                if (profileData.username) {
                    username = profileData.username
                    profilePicture = profileData.profile_picture_url
                } else {
                    // Try Basic Display fallback
                    const basicRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`)
                    const basicData = await basicRes.json()
                    console.log('Profile Data (Basic):', JSON.stringify(basicData))
                    if (basicData.username) username = basicData.username
                }
            } catch (pErr) {
                console.error('Profile fetch error:', pErr)
            }

            // 6. Save to Database
            console.log('Final DB Save - Username:', username, 'ID:', finalIgUserId)
            const { error: upsertError } = await supabaseClient
                .from('instagram_integrations')
                .upsert({
                    user_id: user.id,
                    instagram_user_id: finalIgUserId.toString(),
                    instagram_username: username,
                    access_token: accessToken,
                    profile_picture_url: profilePicture,
                    is_active: true, // ALWAYS set to true on success
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (upsertError) {
                console.error('DB Upsert Error:', upsertError)
                throw new Error('Database Save Failed: ' + upsertError.message)
            }

            // 6. Subscribe to Webhooks (Messages, Comments, Mentions)
            // This is crucial for webhooks to be sent to our endpoint
            console.log('Subscribing to webhooks for account:', igUserId)
            try {
                // For Instagram Login for Business / Graph API, we subscribe via the /me/subscribed_apps endpoint
                // Note: We use the Graph API v18.0 (compatible with FB App v18+)
                const subscribeRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/subscribed_apps`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: accessToken,
                        subscribed_fields: 'messages,messaging_postbacks,comments,mentions,story_insights'
                    })
                })
                const subscribeData = await subscribeRes.json()
                console.log('Subscription Status:', subscribeData)

                if (subscribeData.error) {
                    console.warn('Webhook Subscription Warning:', subscribeData.error)
                    // We don't throw here as the integration might still work for some features, 
                    // but most automations will fail.
                }
            } catch (subErr) {
                console.error('Subscription error:', subErr)
            }

            // Note: Use the project's site URL for the final redirect
            const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:8080'
            return Response.redirect(`${siteUrl}/dashboard/instagram?success=true`)

        } catch (err) {
            console.error('Auth Error:', err)
            const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:8080'
            return Response.redirect(`${siteUrl}/dashboard/instagram?error=${encodeURIComponent(err.message)}`)
        }
    }

    return new Response('Instagram Auth Function Ready', { headers: corsHeaders })
})
