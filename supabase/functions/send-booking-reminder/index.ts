import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatDateTime = (dateStr: string, timezone: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-reminder function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get bookings that:
    // 1. Are confirmed
    // 2. Haven't had a reminder sent
    // 3. Start within the next 24-25 hours (to account for cron timing)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log("Looking for bookings between:", in24Hours.toISOString(), "and", in25Hours.toISOString());

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        event_type:event_types(title, duration, location_type)
      `)
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("start_time", in24Hours.toISOString())
      .lte("start_time", in25Hours.toISOString());

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings needing reminders`);

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const results = [];

    for (const booking of bookings) {
      try {
        // Get host profile
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", booking.host_id)
          .single();

        const startFormatted = formatDateTime(booking.start_time, booking.attendee_timezone);

        // Send reminder email
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CalSchedule <onboarding@resend.dev>",
            to: [booking.attendee_email],
            subject: `Reminder: ${booking.event_type?.title || "Meeting"} Tomorrow with ${hostProfile?.name || "Host"}`,
            html: `
              <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3B82F6, #1D4ED8); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 24px;">🔔</span>
                  </div>
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Meeting Reminder</h1>
                </div>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${booking.attendee_name},</p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">This is a friendly reminder about your upcoming meeting with ${hostProfile?.name || "your host"}.</p>
                
                <div style="background: #F0F7FF; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #3B82F6;">
                  <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">${booking.event_type?.title || "Meeting"}</h2>
                  <p style="color: #666; margin: 8px 0;"><strong>When:</strong> ${startFormatted}</p>
                  <p style="color: #666; margin: 8px 0;"><strong>Duration:</strong> ${booking.event_type?.duration || 30} minutes</p>
                  <p style="color: #666; margin: 8px 0;"><strong>Timezone:</strong> ${booking.attendee_timezone}</p>
                  ${booking.meet_link ? `<p style="color: #666; margin: 8px 0;"><strong>Meeting Link:</strong> <a href="${booking.meet_link}" style="color: #3B82F6;">${booking.meet_link}</a></p>` : ""}
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px;">💡 Make sure to join a few minutes early to ensure a smooth start!</p>
                
                <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Powered by CalSchedule</p>
              </div>
            `,
          }),
        });

        const emailResult = await res.json();
        console.log(`Email sent to ${booking.attendee_email}:`, emailResult);

        if (res.ok) {
          // Mark reminder as sent
          await supabase
            .from("bookings")
            .update({ reminder_sent: true })
            .eq("id", booking.id);

          results.push({ bookingId: booking.id, success: true });
        } else {
          results.push({ bookingId: booking.id, success: false, error: emailResult });
        }
      } catch (emailError: any) {
        console.error(`Error sending reminder for booking ${booking.id}:`, emailError);
        results.push({ bookingId: booking.id, success: false, error: emailError.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);