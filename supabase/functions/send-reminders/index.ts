import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send reminders for bookings starting in the next hour
const REMINDER_WINDOW_MINUTES = 60;
// Don't send reminders for bookings starting in less than 15 minutes
const MIN_REMINDER_MINUTES = 15;

const handler = async (req: Request): Promise<Response> => {
    console.log("send-reminders function invoked");

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const now = new Date();
        const windowStart = new Date(now.getTime() + MIN_REMINDER_MINUTES * 60 * 1000);
        const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

        // Find upcoming bookings that:
        // 1. Start within the reminder window (15-60 minutes from now)
        // 2. Have status 'confirmed'
        // 3. Haven't been sent a reminder yet (reminder_sent = false or null)
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
        id,
        attendee_name,
        attendee_email,
        attendee_phone,
        attendee_timezone,
        start_time,
        end_time,
        notes,
        meet_link,
        host_id,
        reminder_sent,
        event_type:event_types(id, title, duration, location_type)
      `)
            .eq('status', 'confirmed')
            .gte('start_time', windowStart.toISOString())
            .lte('start_time', windowEnd.toISOString())
            .or('reminder_sent.is.null,reminder_sent.eq.false');

        if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            throw bookingsError;
        }

        if (!bookings || bookings.length === 0) {
            console.log('No bookings found for reminders');
            return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        console.log(`Found ${bookings.length} bookings for reminders`);

        let remindersSent = 0;

        for (const booking of bookings) {
            try {
                // Get host details
                const { data: hostAuth } = await supabase.auth.admin.getUserById(booking.host_id);
                const hostMeta = hostAuth?.user?.user_metadata || {};
                const hostName = hostMeta.full_name || hostMeta.name || hostAuth?.user?.email?.split('@')[0] || 'Host';
                const hostEmail = hostAuth?.user?.email;

                // Get branding settings for host
                const { data: branding } = await supabase
                    .from('branding_settings')
                    .select('brand_name, brand_logo_url, brand_color, is_enabled')
                    .eq('user_id', booking.host_id)
                    .maybeSingle();

                // Send reminder email to attendee
                const emailResult = await supabase.functions.invoke('send-booking-email', {
                    body: {
                        type: 'reminder',
                        bookingId: booking.id,
                        recipientEmail: booking.attendee_email,
                        recipientName: booking.attendee_name,
                        hostName: hostName,
                        hostEmail: hostEmail,
                        eventTitle: booking.event_type?.title || 'Meeting',
                        startTime: booking.start_time,
                        endTime: booking.end_time,
                        timezone: booking.attendee_timezone,
                        meetingLink: booking.meet_link,
                        notes: booking.notes,
                        siteUrl: PUBLIC_SITE_URL,
                        hostId: booking.host_id,
                        branding: branding ? {
                            brandName: branding.brand_name,
                            brandLogoUrl: branding.brand_logo_url,
                            brandColor: branding.brand_color,
                            isEnabled: branding.is_enabled,
                        } : undefined,
                    },
                });

                if (emailResult.error) {
                    console.error(`Failed to send reminder email for booking ${booking.id}:`, emailResult.error);
                } else {
                    console.log(`Sent reminder email for booking ${booking.id}`);
                }

                // Get host profile for phone and push token
                const { data: hostProfile } = await supabase
                    .from('profiles')
                    .select('phone, push_token')
                    .eq('user_id', booking.host_id)
                    .maybeSingle();

                // Trigger Push Notification if token exists
                if (hostProfile?.push_token) {
                    console.log(`[PUSH] Triggering notification for host ${booking.host_id} for booking ${booking.id}`);
                    // In a production app, you would call FCM or OneSignal here
                    /*
                    await fetch('https://fcm.googleapis.com/fcm/send', {
                        method: 'POST',
                        headers: { 'Authorization': `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: hostProfile.push_token,
                            notification: {
                                title: 'New Reminder',
                                body: `You have a booking with ${booking.attendee_name} in 60 minutes.`
                            }
                        })
                    });
                    */
                }

                // Send WhatsApp reminder to attendee if phone is available
                if (booking.attendee_phone) {
                    const { data: whatsappSettings } = await supabase
                        .from('whatsapp_settings')
                        .select('*')
                        .eq('user_id', booking.host_id)
                        .eq('is_enabled', true)
                        .maybeSingle();

                    if (whatsappSettings && whatsappSettings.api_key && whatsappSettings.phone_number_id) {
                        // Send to Customer
                        await supabase.functions.invoke('send-whatsapp-message', {
                            body: {
                                type: 'reminder',
                                recipient_phone: booking.attendee_phone,
                                settings: whatsappSettings,
                                booking: {
                                    ...booking,
                                    host: { name: hostName },
                                },
                            },
                        });
                        console.log(`Sent reminder WhatsApp to customer for booking ${booking.id}`);

                        // Send to Instructor if phone is available
                        if (hostProfile?.phone) {
                            await supabase.functions.invoke('send-whatsapp-message', {
                                body: {
                                    type: 'reminder_instructor',
                                    recipient_phone: hostProfile.phone,
                                    settings: whatsappSettings,
                                    booking: {
                                        ...booking,
                                        host: { name: hostName },
                                    },
                                },
                            });
                            console.log(`Sent reminder WhatsApp to instructor for booking ${booking.id}`);
                        }
                    }
                }

                // Mark booking as reminder sent
                await supabase
                    .from('bookings')
                    .update({ reminder_sent: true })
                    .eq('id', booking.id);

                remindersSent++;
            } catch (bookingError) {
                console.error(`Error processing reminder for booking ${booking.id}:`, bookingError);
            }
        }

        console.log(`Successfully sent ${remindersSent} reminders`);

        return new Response(JSON.stringify({ success: true, reminders_sent: remindersSent }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
};

serve(handler);
