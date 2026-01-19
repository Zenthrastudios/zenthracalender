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

interface EmailRequest {
  type: "confirmation" | "cancellation" | "reschedule" | "reminder";
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  hostName: string;
  hostEmail?: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink?: string;
  notes?: string;
  siteUrl?: string;
  hostId?: string;
  branding?: {
    brandName?: string;
    brandLogoUrl?: string;
    brandColor?: string;
    isEnabled: boolean;
  };
}

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

const getSiteUrl = (data: EmailRequest) => {
  const fromReq = data.siteUrl?.trim();
  if (fromReq) return fromReq;

  const fromEnv = PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv;

  return "";
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

const wrapEmail = (opts: {
  title: string;
  subtitle?: string;
  badgeText?: string;
  accent?: string;
  bodyHtml: string;
  footerHtml?: string;
  brandName: string;
  brandLogoUrl?: string;
}) => {
  const accent = opts.accent || "#111827";
  return `
  <div style="background:#0B1220;padding:24px 0;">
    <div style="max-width:640px;margin:0 auto;padding:0 16px;">
      <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <div style="padding:22px 20px;background:linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0));">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;">
              ${opts.brandLogoUrl ? `<img src="${opts.brandLogoUrl}" alt="" style="height:24px;width:auto;object-contain:contain;"/>` : ""}
              ${escapeHtml(opts.brandName)}
            </div>
            ${opts.badgeText ? `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-size:12px;font-weight:700;background:${accent};padding:6px 10px;border-radius:999px;">${escapeHtml(opts.badgeText)}</div>` : ""}
          </div>
          <div style="margin-top:14px;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#FFFFFF;font-weight:900;font-size:24px;line-height:1.2;">${escapeHtml(opts.title)}</div>
            ${opts.subtitle ? `<div style="margin-top:6px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#9CA3AF;font-size:14px;line-height:1.5;">${escapeHtml(opts.subtitle)}</div>` : ""}
          </div>
        </div>
        <div style="padding:22px 20px;background:#0F172A;">
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#E5E7EB;font-size:14px;line-height:1.6;">
            ${opts.bodyHtml}
          </div>
          ${opts.footerHtml ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#9CA3AF;font-size:12px;line-height:1.6;">${opts.footerHtml}</div>` : ""}
        </div>
      </div>
      <div style="text-align:center;margin-top:14px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;color:#64748B;font-size:12px;">
        Powered by ${escapeHtml(opts.brandName)}
      </div>
    </div>
  </div>
  `;
};

// Generate ICS calendar file content
const generateICSContent = (data: EmailRequest, isCancellation = false): string => {
  const startDate = new Date(data.startTime);
  const endDate = new Date(data.endTime);

  // Format date to ICS format (YYYYMMDDTHHMMSSZ)
  const formatToICS = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${data.bookingId}@calschedule`;
  const now = formatToICS(new Date());
  const start = formatToICS(startDate);
  const end = formatToICS(endDate);

  const location = data.meetingLink || '';
  const description = `Meeting with ${data.hostName}${data.notes ? `\\n\\nNotes: ${data.notes}` : ''}${data.meetingLink ? `\\n\\nJoin: ${data.meetingLink}` : ''}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CalSchedule//EN
CALSCALE:GREGORIAN
METHOD:${isCancellation ? 'CANCEL' : 'REQUEST'}
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${data.eventTitle} with ${data.hostName}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${isCancellation ? 'CANCELLED' : 'CONFIRMED'}
ORGANIZER;CN=${data.hostName}:mailto:${data.hostEmail || 'noreply@calschedule.com'}
ATTENDEE;CN=${data.recipientName};RSVP=TRUE:mailto:${data.recipientEmail}
SEQUENCE:${isCancellation ? '1' : '0'}
END:VEVENT
END:VCALENDAR`;
};

const getEmailContent = (data: EmailRequest, links: { joinUrl?: string; myBookingsUrl?: string; rescheduleUrl?: string; cancelUrl?: string }) => {
  const startFormatted = formatDateTime(data.startTime, data.timezone);
  const endFormatted = formatDateTime(data.endTime, data.timezone);
  const joinUrl = links.joinUrl;
  const myBookingsUrl = links.myBookingsUrl;
  const rescheduleUrl = links.rescheduleUrl;
  const cancelUrl = links.cancelUrl;

  const detailsCard = `
    <div style="margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.03);">
      <div style="font-weight:800;color:#FFFFFF;font-size:16px;">${escapeHtml(data.eventTitle)}</div>
      <div style="margin-top:10px;">
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">When:</span> ${escapeHtml(startFormatted)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Ends:</span> ${escapeHtml(endFormatted)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Timezone:</span> ${escapeHtml(data.timezone)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">With:</span> ${escapeHtml(data.hostName)}</div>
      </div>
      ${data.meetingLink ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Meeting link:</span> <a href="${data.meetingLink}" style="color:#60A5FA;text-decoration:none;">${escapeHtml(data.meetingLink)}</a></div>` : ""}
      ${data.notes ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Notes:</span> ${escapeHtml(data.notes)}</div>` : ""}
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

  const nextSteps = `
    <div style="margin-top:16px;">
      <div style="font-weight:800;color:#FFFFFF;">What to do next</div>
      <ol style="margin:8px 0 0 18px;padding:0;color:#CBD5E1;">
        <li style="margin:6px 0;">Add the attached calendar invite to your calendar.</li>
        <li style="margin:6px 0;">Join a few minutes early to test audio/video.</li>
        <li style="margin:6px 0;">Use the links above if you need to reschedule or cancel.</li>
      </ol>
    </div>
  `;

  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'CalSchedule') || 'CalSchedule';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;
  const brandAccent = data.branding?.isEnabled ? data.branding.brandColor : undefined;

  switch (data.type) {
    case "confirmation":
      return {
        subject: `Booking Confirmed: ${data.eventTitle} with ${data.hostName}`,
        html: wrapEmail({
          title: "Booking confirmed",
          subtitle: `Hi ${data.recipientName}, your meeting is scheduled with ${data.hostName}.`,
          badgeText: "CONFIRMED",
          accent: brandAccent || "#22C55E",
          bodyHtml: `${detailsCard}${actions}${nextSteps}`,
          footerHtml: `If you can’t find this email later, use ${myBookingsUrl ? `<a href="${myBookingsUrl}" style="color:#60A5FA;text-decoration:none;">My Bookings</a>` : "the My Bookings page"} to view your appointment details.`,
          brandName,
          brandLogoUrl,
        }),
      };

    case "cancellation":
      return {
        subject: `Booking Cancelled: ${data.eventTitle}`,
        html: wrapEmail({
          title: "Booking cancelled",
          subtitle: `Hi ${data.recipientName}, this meeting has been cancelled.`,
          badgeText: "CANCELLED",
          accent: brandAccent || "#EF4444",
          bodyHtml: `${detailsCard}${myBookingsUrl ? `<div style="margin-top:14px;">${buildPrimaryButton("View booking details", myBookingsUrl, "neutral")}</div>` : ""}`,
          footerHtml: "A calendar update is attached to remove this event from your calendar.",
          brandName,
          brandLogoUrl,
        }),
      };

    case "reminder":
      return {
        subject: `Reminder: ${data.eventTitle} with ${data.hostName}`,
        html: wrapEmail({
          title: "Reminder",
          subtitle: `Hi ${data.recipientName}, your meeting with ${data.hostName} is coming up soon.`,
          badgeText: "REMINDER",
          accent: brandAccent || "#3B82F6",
          bodyHtml: `${detailsCard}${actions}<div style="margin-top:14px;color:#CBD5E1;">Tip: join 2–3 minutes early so you can start on time.</div>`,
          brandName,
          brandLogoUrl,
        }),
      };

    case "reschedule":
      return {
        subject: `Rescheduled: ${data.eventTitle} with ${data.hostName}`,
        html: wrapEmail({
          title: "Booking rescheduled",
          subtitle: `Hi ${data.recipientName}, your meeting time has been updated.`,
          badgeText: "RESCHEDULED",
          accent: brandAccent || "#F59E0B",
          bodyHtml: `${detailsCard}${actions}${nextSteps}`,
          footerHtml: "Your updated calendar invite is attached. Please replace the old one if needed.",
          brandName,
          brandLogoUrl,
        }),
      };

    default:
      return {
        subject: `Update: ${data.eventTitle}`,
        html: wrapEmail({
          title: "Booking update",
          subtitle: `Update for ${data.eventTitle}.`,
          bodyHtml: `${detailsCard}${actions}`,
          brandName,
          brandLogoUrl,
        }),
      };
  }
};

const getHostEmailContent = (
  data: EmailRequest,
  host: { name: string; email: string },
  attendee: { name: string; email: string },
  links: { joinUrl?: string },
) => {
  const startFormatted = formatDateTime(data.startTime, data.timezone);
  const endFormatted = formatDateTime(data.endTime, data.timezone);

  const detailsCard = `
    <div style="margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.03);">
      <div style="font-weight:800;color:#FFFFFF;font-size:16px;">${escapeHtml(data.eventTitle)}</div>
      <div style="margin-top:10px;">
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">When:</span> ${escapeHtml(startFormatted)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Ends:</span> ${escapeHtml(endFormatted)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Timezone:</span> ${escapeHtml(data.timezone)}</div>
        <div style="color:#CBD5E1;"><span style="color:#94A3B8;">Attendee:</span> ${escapeHtml(attendee.name)} (${escapeHtml(attendee.email)})</div>
      </div>
      ${data.meetingLink ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Meeting link:</span> <a href="${data.meetingLink}" style="color:#60A5FA;text-decoration:none;">${escapeHtml(data.meetingLink)}</a></div>` : ""}
      ${data.notes ? `<div style="margin-top:10px;color:#CBD5E1;"><span style="color:#94A3B8;">Attendee notes:</span> ${escapeHtml(data.notes)}</div>` : ""}
    </div>
  `;

  const actions = links.joinUrl
    ? `<div style="margin-top:14px;">${buildPrimaryButton('Join meeting', links.joinUrl, 'primary')}</div>`
    : '';

  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'CalSchedule') || 'CalSchedule';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;
  const brandAccent = data.branding?.isEnabled ? data.branding.brandColor : undefined;

  switch (data.type) {
    case 'confirmation':
      return {
        subject: `New booking: ${data.eventTitle} with ${attendee.name}`,
        html: wrapEmail({
          title: 'New booking',
          subtitle: `Hi ${host.name}, you have a new booking.`,
          badgeText: 'NEW BOOKING',
          accent: brandAccent || '#22C55E',
          bodyHtml: `${detailsCard}${actions}`,
          brandName,
          brandLogoUrl,
        }),
      };
    case 'cancellation':
      return {
        subject: `Cancelled: ${data.eventTitle} with ${attendee.name}`,
        html: wrapEmail({
          title: 'Booking cancelled',
          subtitle: `Hi ${host.name}, this booking has been cancelled.`,
          badgeText: 'CANCELLED',
          accent: brandAccent || '#EF4444',
          bodyHtml: `${detailsCard}${actions}`,
          brandName,
          brandLogoUrl,
        }),
      };
    case 'reschedule':
      return {
        subject: `Rescheduled: ${data.eventTitle} with ${attendee.name}`,
        html: wrapEmail({
          title: 'Booking rescheduled',
          subtitle: `Hi ${host.name}, the booking time has been updated.`,
          badgeText: 'RESCHEDULED',
          accent: brandAccent || '#F59E0B',
          bodyHtml: `${detailsCard}${actions}`,
          brandName,
          brandLogoUrl,
        }),
      };
    case 'reminder':
      return {
        subject: `Reminder: ${data.eventTitle} with ${attendee.name}`,
        html: wrapEmail({
          title: 'Reminder',
          subtitle: `Hi ${host.name}, your meeting is coming up soon.`,
          badgeText: 'REMINDER',
          accent: brandAccent || '#3B82F6',
          bodyHtml: `${detailsCard}${actions}<div style="margin-top:14px;color:#CBD5E1;">Tip: join 2–3 minutes early so you can start on time.</div>`,
          brandName,
          brandLogoUrl,
        }),
      };
    default:
      return {
        subject: `Update: ${data.eventTitle} with ${attendee.name}`,
        html: wrapEmail({
          title: 'Booking update',
          subtitle: `Update for ${data.eventTitle}.`,
          bodyHtml: `${detailsCard}${actions}`,
          brandName,
          brandLogoUrl,
        }),
      };
  }
};

const getHostEmail = async (supabase: ReturnType<typeof createClient>, hostId: string) => {
  const { data, error } = await supabase.auth.admin.getUserById(hostId);
  if (error) {
    console.error('Failed to load host auth user:', error);
    return null;
  }
  return data.user?.email || null;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log("Email request:", { type: data.type, to: data.recipientEmail });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: bookingRow } = await supabase
      .from('bookings')
      .select('cancel_token, reschedule_token, host_id')
      .eq('id', data.bookingId)
      .maybeSingle();

    const requestedHostId = bookingRow?.host_id || data.hostId;

    // Fetch branding settings if not provided
    if (!data.branding && requestedHostId) {
      const { data: brandData } = await supabase
        .from('branding_settings')
        .select('brand_name, brand_logo_url, brand_color, is_enabled')
        .eq('user_id', requestedHostId)
        .maybeSingle();

      if (brandData) {
        data.branding = {
          brandName: brandData.brand_name,
          brandLogoUrl: brandData.brand_logo_url,
          brandColor: brandData.brand_color,
          isEnabled: brandData.is_enabled,
        };
      }
    }

    const siteUrl = getSiteUrl(data);
    const joinUrl = data.meetingLink;
    const myBookingsUrl = siteUrl ? `${siteUrl}/my-bookings` : undefined;
    const rescheduleUrl = siteUrl && bookingRow?.reschedule_token ? `${siteUrl}/reschedule/${bookingRow.reschedule_token}` : undefined;
    const cancelUrl = siteUrl && bookingRow?.cancel_token ? `${siteUrl}/cancel/${bookingRow.cancel_token}` : undefined;

    const { subject, html } = getEmailContent(data, { joinUrl, myBookingsUrl, rescheduleUrl, cancelUrl });

    // Generate ICS calendar content
    const isCancellation = data.type === "cancellation";
    const icsContent = generateICSContent(data, isCancellation);
    const icsBase64 = btoa(icsContent);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CalSchedule <noreply@intimatecare.in>",
        to: [data.recipientEmail],
        subject,
        html,
        attachments: [
          {
            filename: isCancellation ? "cancellation.ics" : "invite.ics",
            content: icsBase64,
            content_type: "text/calendar; method=" + (isCancellation ? "CANCEL" : "REQUEST"),
          },
        ],
      }),
    });

    const result = await res.json();
    console.log("Email sent:", result);

    if (!res.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    // Send separate host notification email
    if (requestedHostId) {
      const resolvedHostEmail = data.hostEmail?.trim() || (await getHostEmail(supabase, requestedHostId));
      if (resolvedHostEmail) {
        const hostContent = getHostEmailContent(
          data,
          { name: data.hostName, email: resolvedHostEmail },
          { name: data.recipientName, email: data.recipientEmail },
          { joinUrl },
        );

        const hostRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CalSchedule <noreply@intimatecare.in>",
            to: [resolvedHostEmail],
            subject: hostContent.subject,
            html: hostContent.html,
            attachments: [
              {
                filename: isCancellation ? "cancellation.ics" : "invite.ics",
                content: icsBase64,
                content_type: "text/calendar; method=" + (isCancellation ? "CANCEL" : "REQUEST"),
              },
            ],
          }),
        });

        const hostResult = await hostRes.json();
        console.log("Host email sent:", { to: resolvedHostEmail, result: hostResult });
      } else {
        console.warn('Host email not available, skipping host notification');
      }
    } else {
      console.warn('Host id not available for booking, skipping host notification');
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
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