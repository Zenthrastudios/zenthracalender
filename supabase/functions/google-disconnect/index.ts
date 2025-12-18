import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, provider } = await req.json();
    
    if (!userId || !provider) {
      throw new Error('User ID and provider are required');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the integration to revoke the token
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (integration?.access_token) {
      // Revoke the token with Google
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, {
          method: 'POST',
        });
        console.log('Revoked Google token');
      } catch (e) {
        console.log('Token revocation failed (may already be invalid):', e);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      throw error;
    }

    console.log('Disconnected integration:', provider, 'for user:', userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in google-disconnect:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
