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

        const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || 'zenthra_secure_webhook_123'

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return new Response(challenge, { status: 200 })
        } else {
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

            if (payload.entry && Array.isArray(payload.entry)) {
                for (const entry of payload.entry) {
                    // Messaging Events (DMs)
                    if (entry.messaging) {
                        for (const event of entry.messaging) {
                            event.entry_id = entry.id;
                            await processEvent(event, supabaseClient)
                        }
                    }
                    // Changes (Comments)
                    else if (entry.changes) {
                        for (const change of entry.changes) {
                            await processChange(change, supabaseClient, entry.id)
                        }
                    }
                }
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
    if (change.field !== 'comments') return;

    const value = change.value;
    const commentId = value.id;
    const text = value.text;

    console.log(`[processChange] New comment: ${commentId}, Text: "${text}"`);

    // Integration Lookup
    let integration = null;
    const { data: userMatch } = await supabase
        .from('instagram_integrations')
        .select('*')
        .eq('instagram_user_id', businessAccountId)
        .maybeSingle();

    if (userMatch) {
        integration = userMatch;
    } else {
        const { data: accountMatch } = await supabase
            .from('instagram_integrations')
            .select('*')
            .eq('instagram_account_id', businessAccountId)
            .maybeSingle();
        if (accountMatch) integration = accountMatch;
    }

    if (!integration) {
        console.error(`[processChange] No integration found for BusinessID: ${businessAccountId}`);
        return;
    }

    // Fetch Rules
    const { data: rules } = await supabase
        .from('instagram_automation_rules')
        .select('*')
        .eq('user_id', integration.user_id)
        .eq('is_active', true)
        .eq('trigger_type', 'comment');

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
        // Keyword Check
        if (rule.trigger_keywords && rule.trigger_keywords.length > 0) {
            const lowerText = text.toLowerCase();
            const hasMatch = rule.trigger_keywords.some((k: string) => lowerText.includes(k.toLowerCase()));
            if (!hasMatch) continue;
        }

        console.log(`[processChange] Executing Rule: ${rule.name}`);

        try {
            // 1. Reply to Comment (Always allowed)
            await replyToComment(integration.access_token, commentId, rule.response_message);

            await supabase.from('instagram_automation_logs').insert({
                user_id: integration.user_id,
                integration_id: integration.id,
                event_type: 'comment_reply_sent',
                response_sent: rule.response_message,
                status: 'success'
            });

            // 2. Private Reply (Text Only - Bridge to DM)
            if (rule.response_type === 'comment_reply_and_dm') {
                const dmMessage = rule.dm_response_message || "Thanks! Reply with 'START' to get options.";

                // IMPORTANT: Private replies via Comment ID allow TEXT ONLY.
                // We append the button URL as text if present, just in case, but real templates won't work here.
                const finalMessage = rule.response_button_url ? `${dmMessage}\n${rule.response_button_url}` : dmMessage;

                await sendPrivateReply(integration.access_token, commentId, finalMessage);

                await supabase.from('instagram_automation_logs').insert({
                    user_id: integration.user_id,
                    integration_id: integration.id,
                    event_type: 'dm_sent',
                    response_sent: finalMessage,
                    recipient_instagram_id: 'comment:' + commentId,
                    status: 'success'
                });
            }
        } catch (err: any) {
            console.error(`[processChange] Rule execution failed:`, err);
        }
    }
}

async function processEvent(event: any, supabase: any) {
    if (!event.message || event.message.is_echo) return;

    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    const text = event.message.text || 'Attachment/Media';

    console.log(`[processEvent] DM from ${senderId}: "${text}"`);

    // Integration Lookup (Simplified for brevity/reliability)
    let integration = null;
    const { data: match } = await supabase
        .from('instagram_integrations')
        .select('*')
        .or(`instagram_account_id.eq.${recipientId},instagram_user_id.eq.${recipientId}`)
        .eq('is_active', true)
        .maybeSingle();

    if (!match && event.entry_id) {
        const { data: matchEntry } = await supabase
            .from('instagram_integrations')
            .select('*')
            .or(`instagram_account_id.eq.${event.entry_id},instagram_user_id.eq.${event.entry_id}`)
            .eq('is_active', true)
            .maybeSingle();
        integration = matchEntry;
    } else {
        integration = match;
    }

    if (!integration) {
        console.error(`[processEvent] No integration found.`);
        return;
    }

    const isStoryReply = !!event.message.reply_to;
    const triggerTypes = isStoryReply ? ['story_reply', 'dm'] : ['dm'];

    const { data: rules } = await supabase
        .from('instagram_automation_rules')
        .select('*')
        .eq('user_id', integration.user_id)
        .eq('is_active', true)
        .in('trigger_type', triggerTypes);

    if (!rules) return;

    for (const rule of rules) {
        if (rule.trigger_keywords?.length > 0) {
            const lowerText = text.toLowerCase();
            const hasMatch = rule.trigger_keywords.some((k: string) => lowerText.includes(k.toLowerCase()));
            if (!hasMatch) continue;
        }

        console.log(`[processEvent] Executing Rule: ${rule.name}`);

        // HERE IS THE RICH MESSAGE!
        // User has replied (DM/Story), so we are in a message window.
        // We can use Generic Templates (Image + Buttons).
        await sendRichDM(
            integration.access_token,
            senderId,
            rule.response_message,
            rule.response_image_url,
            rule.response_button_text,
            rule.response_button_url
        );

        await supabase.from('instagram_automation_logs').insert({
            user_id: integration.user_id,
            integration_id: integration.id,
            event_type: 'dm_sent',
            response_sent: rule.response_message,
            recipient_instagram_id: senderId,
            status: 'success'
        });
    }
}

// --- API FUNCTIONS ---

const IG_HOST = 'graph.instagram.com';
const VERSION = 'v21.0';

async function replyToComment(token: string, commentId: string, message: string) {
    await fetch(`https://${IG_HOST}/${VERSION}/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
}

// Private Reply (Text Only) - Bridge to DM
async function sendPrivateReply(token: string, commentId: string, message: string) {
    // Determine my ID to send from
    const meRes = await fetch(`https://${IG_HOST}/${VERSION}/me?fields=id&access_token=${token}`);
    const me = await meRes.json();
    if (!me.id) return { error: 'No ID' };

    const res = await fetch(`https://${IG_HOST}/${VERSION}/${me.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { comment_id: commentId },
            message: { text: message }
        })
    });
    return res.json();
}

// Rich DM (Templates) - For active threads
async function sendRichDM(token: string, recipientId: string, text: string, imgUrl?: string, btnText?: string, btnUrl?: string) {
    const meRes = await fetch(`https://${IG_HOST}/${VERSION}/me?fields=id&access_token=${token}`);
    const me = await meRes.json();
    if (!me.id) return { error: 'No ID' };

    const url = `https://${IG_HOST}/${VERSION}/${me.id}/messages`;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Generic Template (Image + Text + Link Button)
    if (imgUrl && btnUrl) {
        // Truncate title/subtitle to meet API limits (80 chars)
        const title = text.length > 80 ? text.substring(0, 77) + '...' : text;
        const subtitle = text.length > 80 ? text.substring(0, 80) : '';

        const body = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [{
                            title: title,
                            subtitle: subtitle,
                            image_url: imgUrl,
                            buttons: [{
                                type: "web_url",
                                url: btnUrl,
                                title: btnText || "Open Link"
                            }]
                        }]
                    }
                }
            }
        };
        console.log('[sendRichDM] Sending Generic Template:', JSON.stringify(body, null, 2));
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        return res.json();
    }

    // 2. Button Template (Text + Link Button)
    if (btnUrl) {
        // Button Template text max 640 chars
        const safeText = text.length > 600 ? text.substring(0, 600) + '...' : text;
        const body = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: safeText,
                        buttons: [{
                            type: "web_url",
                            url: btnUrl,
                            title: btnText || "Open Link"
                        }]
                    }
                }
            }
        };
        console.log('[sendRichDM] Sending Button Template:', JSON.stringify(body, null, 2));
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        return res.json();
    }

    // 3. Fallback: Text (+ Image if present)
    await fetch(url, {
        method: 'POST', headers, body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: text }
        })
    });

    if (imgUrl) {
        await fetch(url, {
            method: 'POST', headers, body: JSON.stringify({
                recipient: { id: recipientId },
                message: { attachment: { type: 'image', payload: { url: imgUrl } } }
            })
        });
    }

    return { success: true };
}
