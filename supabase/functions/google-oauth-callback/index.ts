import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/?error=oauth_denied' },
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // Decode state to get user ID and redirect URL
    const { userId, redirectUrl } = JSON.parse(atob(state));

    if (!userId) {
      throw new Error('Invalid state: missing user ID');
    }

    const callbackUrl = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      throw new Error(tokens.error_description || tokens.error);
    }

    console.log('Successfully exchanged code for tokens');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    console.log('Got Google user info:', userInfo.email);

    // Store tokens in database using service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokens.scope?.split(' ') || [],
        provider_user_id: userInfo.id,
        provider_email: userInfo.email,
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw new Error('Failed to save integration');
    }

    console.log('Successfully saved Google integration for user:', userId);

    // Redirect back to app
    const finalRedirect = redirectUrl || '/dashboard/apps?connected=google';
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': finalRedirect },
    });
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/dashboard/apps?error=oauth_failed' },
    });
  }
});
