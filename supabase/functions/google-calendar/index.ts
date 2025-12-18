import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error}`);
  }
  return data.access_token;
}

async function getValidAccessToken(userId: string, supabase: any): Promise<string> {
  const { data: integration, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !integration) {
    throw new Error('Google integration not found');
  }

  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Refreshing expired token');
    const newToken = await refreshAccessToken(integration.refresh_token);
    
    // Update token in database
    await supabase
      .from('user_integrations')
      .update({
        access_token: newToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      })
      .eq('id', integration.id);

    return newToken;
  }

  return integration.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, eventData } = await req.json();
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const accessToken = await getValidAccessToken(userId, supabase);

    let result;

    switch (action) {
      case 'list-calendars': {
        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await response.json();
        break;
      }

      case 'list-events': {
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await response.json();
        break;
      }

      case 'create-event': {
        // Create event with Google Meet link
        const event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime,
            timeZone: eventData.timezone || 'UTC',
          },
          end: {
            dateTime: eventData.endTime,
            timeZone: eventData.timezone || 'UTC',
          },
          attendees: eventData.attendees?.map((email: string) => ({ email })) || [],
          conferenceData: eventData.createMeet ? {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          } : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );
        const createdEvent = await response.json();
        
        console.log('Created calendar event:', createdEvent.id);
        if (createdEvent.hangoutLink) {
          console.log('Meet link:', createdEvent.hangoutLink);
        }
        result = { event: createdEvent };
        break;
      }

      case 'delete-event': {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventData.eventId}?sendUpdates=all`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        result = { success: response.ok };
        break;
      }

      case 'check-availability': {
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/freeBusy',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin: eventData.startTime,
              timeMax: eventData.endTime,
              items: [{ id: 'primary' }],
            }),
          }
        );
        const freeBusyResult = await response.json();
        
        // Transform response to return busy slots array
        const busySlots = freeBusyResult.calendars?.primary?.busy || [];
        result = { 
          busySlots: busySlots.map((slot: { start: string; end: string }) => ({
            start: slot.start,
            end: slot.end,
          }))
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in google-calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
