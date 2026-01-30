import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle Webhook Verification (GET request)
    if (req.method === 'GET') {
        const url = new URL(req.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        // You should set this in your database or env vars
        const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || 'zenthra_secure_webhook_123'

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED')
            return new Response(challenge, { status: 200 })
        } else {
            return new Response('Forbidden', { status: 403 })
        }
    }

    // 2. Handle Event Notifications (POST request)
    if (req.method === 'POST') {
        try {
            const payload = await req.json()

            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Process each entry in the batch
            for (const entry of payload.entry) {
                // We only care about Instagram messaging/comments events
                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        await processEvent(event, supabaseClient)
                    }
                } else if (entry.changes) {
                    // Handle comments/other changes
                    for (const change of entry.changes) {
                        await processChange(change, supabaseClient, entry.id) // entry.id is usually the IG Business Account ID
                    }
                }
            }

            return new Response('EVENT_RECEIVED', { status: 200 })

        } catch (error) {
            console.error(error)
            return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        }
    }

    return new Response('Method Not Allowed', { status: 405 })
})

async function processChange(change: any, supabase: any, businessAccountId: string) {
    // Handle Comments
    if (change.field === 'comments') {
        const value = change.value;
        // Check if it's a new comment on a media object
        // We need to look up the user who owns this business account
        const { data: integration } = await supabase
            .from('instagram_integrations')
            .select('*')
            .eq('instagram_user_id', businessAccountId)
            .single();

        if (!integration) return;

        // Log the event
        await supabase.from('instagram_automation_logs').insert({
            user_id: integration.user_id,
            event_type: 'comment_received',
            trigger_content: value.text,
            status: 'success'
        })

        // Find matching rules
        const { data: rules } = await supabase
            .from('instagram_automation_rules')
            .select('*')
            .eq('user_id', integration.user_id)
            .eq('is_active', true)
            .eq('trigger_type', 'comment');

        if (!rules || rules.length === 0) return;

        for (const rule of rules) {
            // Check keywords
            if (rule.trigger_keywords && rule.trigger_keywords.length > 0) {
                const text = value.text.toLowerCase();
                const matches = rule.trigger_keywords.some((k: string) => text.includes(k.toLowerCase()));
                if (!matches) continue;
            }

            // Execute Response
            if (rule.response_type === 'comment_reply') {
                await replyToComment(
                    integration.access_token,
                    value.id,
                    rule.response_message
                );

                await supabase.from('instagram_automation_logs').insert({
                    user_id: integration.user_id,
                    event_type: 'comment_reply_sent',
                    response_sent: rule.response_message,
                    status: 'success'
                })
            }
        }
    }
}

async function processEvent(event: any, supabase: any) {
    // Handle DMs
    if (event.message) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id; // This is our page/IG account

        const { data: integration } = await supabase
            .from('instagram_integrations')
            .select('*')
            .eq('instagram_user_id', recipientId) // OR query by page ID if needed
            .maybeSingle(); // Use maybeSingle to avoid errors if not found directly

        // Strategy: recipientId in webhook is usually the Page ID or IG ID. 
        // We might need a more robust lookup. For now assuming it matches.
        if (!integration) return;

        // Log DM
        await supabase.from('instagram_automation_logs').insert({
            user_id: integration.user_id,
            event_type: 'dm_received',
            trigger_content: event.message.text,
            status: 'success'
        })

        // Find DM rules
        // ... (Similar logic to comments, but calling sendDM function)
    }
}

async function replyToComment(accessToken: string, commentId: string, message: string) {
    const res = await fetch(`https://graph.facebook.com/v18.0/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            access_token: accessToken
        })
    });
    return res.json();
}
