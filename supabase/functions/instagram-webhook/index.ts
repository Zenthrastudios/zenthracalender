import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`Incoming request: ${req.method} ${req.url}`)

    // 1. Handle Webhook Verification (GET request)
    if (req.method === 'GET') {
        const url = new URL(req.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        console.log(`Verification request: mode=${mode}, token=${token}`)

        // You should set this in your database or env vars
        const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || 'zenthra_secure_webhook_123'

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED')
            return new Response(challenge, { status: 200 })
        } else {
            console.error('WEBHOOK_VERIFICATION_FAILED: Token mismatch')
            return new Response('Forbidden', { status: 403 })
        }
    }

    // 2. Handle Event Notifications (POST request)
    if (req.method === 'POST') {
        try {
            const payload = await req.json()
            console.log('WEBHOOK_POST_PAYLOAD:', JSON.stringify(payload, null, 2))

            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Process each entry in the batch
            if (payload.entry && Array.isArray(payload.entry)) {
                for (const entry of payload.entry) {
                    console.log(`Processing entry ID: ${entry.id}`)

                    // We only care about Instagram messaging/comments events
                    if (entry.messaging) {
                        console.log(`Met messaging events in entry: ${entry.messaging.length}`)
                        for (const event of entry.messaging) {
                            await processEvent(event, supabaseClient)
                        }
                    } else if (entry.changes) {
                        console.log(`Met changes in entry: ${entry.changes.length}`)
                        // Handle comments/other changes
                        for (const change of entry.changes) {
                            await processChange(change, supabaseClient, entry.id)
                        }
                    } else {
                        console.log('Entry contains no recognized events (messaging/changes)')
                    }
                }
            } else {
                console.warn('Payload contains no entries')
            }

            return new Response('EVENT_RECEIVED', { status: 200 })

        } catch (error) {
            console.error('WEBHOOK_POST_ERROR:', error)
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
    // Handle DMs and Story Interactions
    if (event.message) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id; // Usually the Page ID or IG ID
        const text = event.message.text;

        // Find the integration. We try to match by instagram_user_id
        // NOTE: In some webhook configurations, recipientId is the Page ID. 
        // We might need to store the page_id in the database to be 100% sure.
        const { data: integration } = await supabase
            .from('instagram_integrations')
            .select('*')
            .eq('instagram_user_id', recipientId)
            .maybeSingle();

        if (!integration) {
            console.warn('No integration found for recipient:', recipientId);
            return;
        }

        const isStoryReply = !!event.message.reply_to;
        const eventType = isStoryReply ? 'story_reply' : 'dm_received';

        // Log the received message
        await supabase.from('instagram_automation_logs').insert({
            user_id: integration.user_id,
            integration_id: integration.id,
            event_type: eventType,
            trigger_content: text,
            status: 'success'
        })

        // Find matching rules for DM or Story Reply
        const { data: rules } = await supabase
            .from('instagram_automation_rules')
            .select('*')
            .eq('user_id', integration.user_id)
            .eq('is_active', true)
            .in('trigger_type', isStoryReply ? ['story_reply', 'dm'] : ['dm']);

        if (!rules || rules.length === 0) return;

        for (const rule of rules) {
            // Check keywords if present
            if (rule.trigger_keywords && rule.trigger_keywords.length > 0) {
                if (!text) continue;
                const matches = rule.trigger_keywords.some((k: string) => text.toLowerCase().includes(k.toLowerCase()));
                if (!matches) continue;
            }

            // Execute Response (Always DM for these triggers)
            const res = await sendDM(
                integration.access_token,
                senderId,
                rule.response_message
            );

            if (res.error) {
                console.error('Error sending response:', res.error);
                await supabase.from('instagram_automation_logs').insert({
                    user_id: integration.user_id,
                    integration_id: integration.id,
                    event_type: 'error',
                    error_message: JSON.stringify(res.error),
                    status: 'failed'
                })
            } else {
                await supabase.from('instagram_automation_logs').insert({
                    user_id: integration.user_id,
                    integration_id: integration.id,
                    event_type: 'dm_sent',
                    response_sent: rule.response_message,
                    recipient_instagram_id: senderId,
                    status: 'success'
                })
            }
        }
    }
}

async function sendDM(accessToken: string, recipientId: string, message: string) {
    const res = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
            access_token: accessToken
        })
    });
    return res.json();
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
