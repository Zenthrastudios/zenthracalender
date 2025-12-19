import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getHostEmail = async (supabase: ReturnType<typeof createClient>, hostId: string) => {
  const { data, error } = await supabase.auth.admin.getUserById(hostId);
  if (error) {
    console.error('Failed to load host auth user:', error);
    return null;
  }
  return data.user?.email || null;
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

const escapeHtml = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildPrimaryButton = (label: string, href: string, tone: "primary" | "neutral" | "danger" = "primary") => {
  const bg = tone === "primary" ? "#111827" : tone === "danger" ? "#DC2626" : "#F3F4F6";
  const color = tone === "neutral" ? "#111827" : "#FFFFFF";
  const border = tone === "neutral" ? "1px solid #E5E7EB" : "0";
  return `
    <a href="${href}" style="display:inline-block;text-decoration:none;background:${bg};color:${color};padding:12px 16px;border-radius:12px;font-weight:700;font-size:14px;${border ? `border:${border};` : ""}">
      ${escapeHtml(label)}
    </a>
  `;
};

const buildSecondaryLink = (label: string, href: string) => {
  return `
    <a href="${href}" style="color:#2563EB;text-decoration:none;font-weight:600;font-size:14px;">
      ${escapeHtml(label)}
    </a>
  `;
};

const wrapEmail = (opts: { title: string; subtitle?: string; badgeText?: string; accent?: string; bodyHtml: string; footerHtml?: string }) => {
  const accent = opts.accent || "#111827";
  return `
  <div style="background:#0B1220;padding:24px 0;">
    <div style="max-width:640px;margin:0 auto;padding:0 16px;">
      <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <div style="padding:22px 20px;background:linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0));">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-weight:800;font-size:16px;">CalSchedule</div>
            ${opts.badgeText ? `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-size:12px;font-weight:700;background:${accent};padding:6px 10px;border-radius:999px;">${escapeHtml(opts.badgeText)}</div>` : ""}
          </div>
          <div style="margin-top:14px;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#FFFFFF;font-weight:900;font-size:24px;line-height:1.2;">${escapeHtml(opts.title)}</div>
            ${opts.subtitle ? `<div style="margin-top:6px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#9CA3AF;font-size:14px;line-height:1.5;">${escapeHtml(opts.subtitle)}</div>` : ""}
          </div>
        </div>
        <div style="padding:22px 20px;background:#0F172A;">
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-size:14px;line-height:1.6;">${opts.bodyHtml}</div>
          ${opts.footerHtml ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#9CA3AF;font-size:12px;line-height:1.6;">${opts.footerHtml}</div>` : ""}
        </div>
      </div>
      <div style="text-align:center;margin-top:14px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#64748B;font-size:12px;">Powered by CalSchedule</div>
    </div>
  </div>
  `;
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

        const hostEmail = await getHostEmail(supabase, booking.host_id);

        const startFormatted = formatDateTime(booking.start_time, booking.attendee_timezone);

        const siteUrl = PUBLIC_SITE_URL?.trim() || "";
        const joinUrl = booking.meet_link || undefined;
        const myBookingsUrl = siteUrl ? `${siteUrl}/my-bookings` : undefined;
        const rescheduleUrl = siteUrl && booking.reschedule_token ? `${siteUrl}/reschedule/${booking.reschedule_token}` : undefined;
        const cancelUrl = siteUrl && booking.cancel_token ? `${siteUrl}/cancel/${booking.cancel_token}` : undefined;

        const detailsCard = `
          <div style="margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.03);">
            <div style="font-weight:800;color:#FFFFFF;font-size:16px;">${escapeHtml(booking.event_type?.title || "Meeting")}</div>
            <div style="margin-top:10px;">
              <div style="color:#CBD5E1;"><span style="color:#94A3B8;">When:</span> ${escapeHtml(startFormatted)}</div>
              <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Duration:</span> ${escapeHtml(String(booking.event_type?.duration || 30))} minutes</div>
              <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Timezone:</span> ${escapeHtml(booking.attendee_timezone)}</div>
              <div style="color:#CBD5E1;"><span style="color:#94A3B8;">With:</span> ${escapeHtml(hostProfile?.name || "Host")}</div>
            </div>
            ${booking.meet_link ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Meeting link:</span> <a href="${booking.meet_link}" style="color:#60A5FA;text-decoration:none;">${escapeHtml(booking.meet_link)}</a></div>` : ""}
          </div>
        `;

        const actions = `
          <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;">
            ${joinUrl ? buildPrimaryButton("Join meeting", joinUrl, "primary") : ""}
            ${myBookingsUrl ? buildPrimaryButton("View booking details", myBookingsUrl, "neutral") : ""}
            ${rescheduleUrl ? buildSecondaryLink("Reschedule", rescheduleUrl) : ""}
            ${cancelUrl ? `<span style="color:#475569;">•</span>${buildSecondaryLink("Cancel", cancelUrl)}` : ""}
          </div>
        `;

        // Send reminder email
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CalSchedule <noreply@intimatecare.in>",
            to: [booking.attendee_email],
            subject: `Reminder: ${booking.event_type?.title || "Meeting"} Tomorrow with ${hostProfile?.name || "Host"}`,
            html: wrapEmail({
              title: "Reminder",
              subtitle: `Hi ${booking.attendee_name}, your meeting with ${hostProfile?.name || "your host"} is coming up soon.`,
              badgeText: "REMINDER",
              accent: "#3B82F6",
              bodyHtml: `${detailsCard}${actions}<div style="margin-top:14px;color:#CBD5E1;">Tip: join 2–3 minutes early so you can start on time.</div>`,
              footerHtml: myBookingsUrl
                ? `You can always view all your appointments at <a href="${myBookingsUrl}" style="color:#60A5FA;text-decoration:none;">My Bookings</a>.`
                : undefined,
            }),
          }),
        });

        const emailResult = await res.json();
        console.log(`Email sent to ${booking.attendee_email}:`, emailResult);

        // Send separate host reminder email
        if (hostEmail) {
          const hostDetailsCard = `
            <div style="margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.03);">
              <div style="font-weight:800;color:#FFFFFF;font-size:16px;">${escapeHtml(booking.event_type?.title || "Meeting")}</div>
              <div style="margin-top:10px;">
                <div style="color:#CBD5E1;"><span style="color:#94A3B8;">When:</span> ${escapeHtml(startFormatted)}</div>
                <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Duration:</span> ${escapeHtml(String(booking.event_type?.duration || 30))} minutes</div>
                <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Timezone:</span> ${escapeHtml(booking.attendee_timezone)}</div>
                <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Attendee:</span> ${escapeHtml(booking.attendee_name)} (${escapeHtml(booking.attendee_email)})</div>
              </div>
              ${booking.meet_link ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Meeting link:</span> <a href="${booking.meet_link}" style="color:#60A5FA;text-decoration:none;">${escapeHtml(booking.meet_link)}</a></div>` : ""}
            </div>
          `;

          const hostActions = `
            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;">
              ${joinUrl ? buildPrimaryButton("Join meeting", joinUrl, "primary") : ""}
            </div>
          `;

          const hostRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "CalSchedule <noreply@intimatecare.in>",
              to: [hostEmail],
              subject: `Reminder: ${booking.event_type?.title || "Meeting"} with ${booking.attendee_name}`,
              html: wrapEmail({
                title: "Reminder",
                subtitle: `Hi ${hostProfile?.name || "Host"}, your meeting is coming up soon.`,
                badgeText: "REMINDER",
                accent: "#3B82F6",
                bodyHtml: `${hostDetailsCard}${hostActions}<div style="margin-top:14px;color:#CBD5E1;">Tip: join 2–3 minutes early so you can start on time.</div>`,
              }),
            }),
          });

          const hostEmailResult = await hostRes.json();
          console.log(`Host reminder email sent to ${hostEmail}:`, hostEmailResult);
        } else {
          console.warn('Host email not available, skipping host reminder email');
        }

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
      } catch (emailError: unknown) {
        console.error(`Error sending reminder for booking ${booking.id}:`, emailError);
        const message = emailError instanceof Error ? emailError.message : 'Failed to send reminder';
        results.push({ bookingId: booking.id, success: false, error: message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);