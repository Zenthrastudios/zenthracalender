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
  const bg = tone === "primary" ? "#000000" : tone === "danger" ? "#DC2626" : "#FFFFFF";
  const color = tone === "neutral" ? "#111827" : "#FFFFFF";
  const border = tone === "neutral" ? "1px solid #E5E7EB" : "0";
  return `
    <a href="${href}" style="display:inline-block;text-decoration:none;background:${bg};color:${color};padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,0.05);${border ? `border:${border};` : ""}">
      ${escapeHtml(label)}
    </a>
  `;
};

const buildSecondaryLink = (label: string, href: string) => {
  return `
    <a href="${href}" style="color:#6B7280;text-decoration:underline;font-size:14px;font-weight:500;">
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
  const accent = opts.accent || "#000000";

  // Use user's accent color for the button if primary, but here we just pass it to the badge or headers if needed
  // For this design, we keep the main UI clean (White/Gray).

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6; }
    </style>
  </head>
  <body style="background-color:#F3F4F6;padding:40px 0;">
    <div style="max-width:560px;margin:0 auto;padding:0 16px;">
      
      <!-- Main Card -->
      <div style="background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px -10px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.02);">
        
        <!-- Header -->
        <div style="padding:32px 40px 0;text-align:center;">
          ${opts.brandLogoUrl
      ? `<img src="${opts.brandLogoUrl}" alt="${escapeHtml(opts.brandName)}" style="height:40px;width:auto;object-fit:contain;margin-bottom:24px;">`
      : `<div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:24px;">${escapeHtml(opts.brandName)}</div>`
    }
          
          ${opts.badgeText ? `
          <div style="display:inline-block;background:${accent}15;color:${accent};font-size:12px;font-weight:700;padding:6px 16px;border-radius:999px;margin-bottom:24px;letter-spacing:0.5px;text-transform:uppercase;">
            ${escapeHtml(opts.badgeText)}
          </div>` : ""}

          <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2;">
            ${escapeHtml(opts.title)}
          </h1>
          
          ${opts.subtitle ? `<p style="margin:0;font-size:16px;line-height:1.6;color:#6B7280;">${escapeHtml(opts.subtitle)}</p>` : ""}
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          ${opts.bodyHtml}
          
          ${opts.footerHtml ? `
          <div style="margin-top:32px;padding-top:24px;border-top:1px dashed #E5E7EB;text-align:center;">
            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">${opts.footerHtml}</p>
          </div>` : ""}
        </div>

      </div>

      <!-- Footer -->
      <div style="text-align:center;margin-top:24px;">
        <p style="font-size:13px;color:#9CA3AF;margin:0;">
          Powered by <span style="font-weight:600;color:#6B7280;">${escapeHtml(opts.brandName)}</span>
        </p>
      </div>

    </div>
  </body>
  </html>
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

  /* Details Card */
  const detailsCard = `
    <div style="background:#F9FAFB;border:1px solid #F3F4F6;border-radius:16px;padding:24px;margin-bottom:32px;">
      <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:20px;">${escapeHtml(data.eventTitle)}</div>
      
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-bottom:16px;width:24px;vertical-align:top;">
            <div style="height:8px;width:8px;border-radius:50%;background:#3B82F6;margin-top:6px;"></div>
          </td>
          <td style="padding-bottom:16px;padding-right:24px;vertical-align:top;">
            <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">When</div>
            <div style="font-size:15px;color:#111827;font-weight:500;">
              ${escapeHtml(startFormatted)} - ${escapeHtml(endFormatted.split(',')[1] || endFormatted)}
              <div style="color:#6B7280;font-weight:400;margin-top:2px;">${escapeHtml(data.timezone)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:16px;width:24px;vertical-align:top;">
            <div style="height:8px;width:8px;border-radius:50%;background:#8B5CF6;margin-top:6px;"></div>
          </td>
          <td style="padding-bottom:16px;vertical-align:top;">
            <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">With</div>
            <div style="font-size:15px;color:#111827;font-weight:500;">${escapeHtml(data.hostName)}</div>
          </td>
        </tr>
        ${data.meetingLink ? `
        <tr>
          <td style="width:24px;vertical-align:top;">
            <div style="height:8px;width:8px;border-radius:50%;background:#10B981;margin-top:6px;"></div>
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Where</div>
            <div style="font-size:15px;color:#111827;font-weight:500;">
              <a href="${data.meetingLink}" style="color:#2563EB;text-decoration:none;">Join Meeting</a>
            </div>
          </td>
        </tr>
        ` : ""}
      </table>

      ${data.notes ? `
        <div style="margin-top:20px;padding-top:20px;border-top:1px dashed #E5E7EB;">
          <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Notes</div>
          <div style="font-size:14px;color:#4B5563;line-height:1.6;font-style:italic;">"${escapeHtml(data.notes)}"</div>
        </div>
      ` : ""}
    </div>
  `;

  const actions = `
    <div style="display:flex;flex-direction:column;gap:12px;align-items:center;">
      ${joinUrl ? buildPrimaryButton("Join Meeting", joinUrl, "primary") : ""}
      <div style="display:flex;gap:20px;margin-top:8px;">
        ${myBookingsUrl ? buildSecondaryLink("View Details", myBookingsUrl) : ""}
        ${rescheduleUrl ? buildSecondaryLink("Reschedule", rescheduleUrl) : ""}
        ${cancelUrl ? buildSecondaryLink("Cancel", cancelUrl) : ""}
      </div>
    </div>
  `;

  const nextSteps = ``; // Removed next steps text to keep it cleaner, as the card is self-explanatory

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
    <div style="background:#F9FAFB;border:1px solid #F3F4F6;border-radius:16px;padding:24px;margin-bottom:32px;">
      <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:20px;">${escapeHtml(data.eventTitle)}</div>
      
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-bottom:16px;width:24px;vertical-align:top;">
            <div style="height:8px;width:8px;border-radius:50%;background:#3B82F6;margin-top:6px;"></div>
          </td>
          <td style="padding-bottom:16px;padding-right:24px;vertical-align:top;">
            <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">When</div>
            <div style="font-size:15px;color:#111827;font-weight:500;">
              ${escapeHtml(startFormatted)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:16px;width:24px;vertical-align:top;">
            <div style="height:8px;width:8px;border-radius:50%;background:#8B5CF6;margin-top:6px;"></div>
          </td>
          <td style="padding-bottom:16px;vertical-align:top;">
            <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Attendee</div>
            <div style="font-size:15px;color:#111827;font-weight:500;">${escapeHtml(attendee.name)}</div>
            <div style="font-size:14px;color:#6B7280;">${escapeHtml(attendee.email)}</div>
          </td>
        </tr>
      </table>

      ${data.notes ? `
        <div style="margin-top:20px;padding-top:20px;border-top:1px dashed #E5E7EB;">
          <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Attendee Notes</div>
          <div style="font-size:14px;color:#4B5563;line-height:1.6;font-style:italic;">"${escapeHtml(data.notes)}"</div>
        </div>
      ` : ""}
    </div>
  `;

  const actions = links.joinUrl
    ? `<div style="text-align:center;margin-top:24px;">${buildPrimaryButton('Join meeting', links.joinUrl, 'primary')}</div>`
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

const getHostDetails = async (supabase: ReturnType<typeof createClient>, hostId: string) => {
  const { data, error } = await supabase.auth.admin.getUserById(hostId);
  if (error) {
    console.error('Failed to load host auth user:', error);
    return null;
  }
  const meta = data.user?.user_metadata || {};
  // Try to find a name in metadata, fallback to profile name if we could fetch it (but we don't have access to profile table easily here without potentially circular ref deps if not careful, so stick to auth meta or email)
  // Actually, we can try to query the public.profiles table too if auth meta is empty, but auth meta is usually reliable for name if synced.
  // Let's stick to auth meta > email username > 'Host'
  const name = meta.full_name || meta.name || meta.display_name || data.user?.email?.split('@')[0] || 'Host';

  return {
    email: data.user?.email || null,
    name: name
  };
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
    let resolvedHostName = data.hostName;
    let resolvedHostEmail = data.hostEmail?.trim();

    // Fetch branding settings if not provided
    if (!data.branding && requestedHostId) {
      const { data: brandData } = await supabase
        .from('branding_settings')
        .select('brand_name, brand_logo_url, brand_color, is_enabled')
        .eq('user_id', requestedHostId)
        .maybeSingle();

      if (brandData) {
        data.branding = {
          brandName: brandData.brand_name, // If brand name is available, we *could* use it as host name if truly missing, but let's prefer personal name first.
          brandLogoUrl: brandData.brand_logo_url,
          brandColor: brandData.brand_color,
          isEnabled: brandData.is_enabled,
        };
      }
    }

    // Attempt to resolve real host name if generic "Host" or missing
    if (requestedHostId && (!resolvedHostName || resolvedHostName === 'Host' || !resolvedHostEmail)) {
      const details = await getHostDetails(supabase, requestedHostId);
      if (details) {
        if (!resolvedHostName || resolvedHostName === 'Host') {
          resolvedHostName = details.name;
        }
        if (!resolvedHostEmail) {
          resolvedHostEmail = details.email || undefined;
        }
      }
    }

    // Update data object with resolved name for consistency in templates
    data.hostName = resolvedHostName;
    data.hostEmail = resolvedHostEmail;

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
      // resolvedHostEmail is already resolved above if possible
      if (resolvedHostEmail) {
        const hostContent = getHostEmailContent(
          data,
          { name: resolvedHostName, email: resolvedHostEmail },
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