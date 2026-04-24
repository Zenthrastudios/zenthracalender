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

const formatDate = (dateString: string, timezone: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

const escapeHtml = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const wrapEmail = (opts: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  brandName?: string;
  brandLogoUrl?: string;
  heroImage?: string;
  accentColor?: string;
}) => {
  const accent = opts.accentColor || "#FF9124";
  const brand = opts.brandName || "Intimate Care";
  const bg = "#f3f4f6";
  const cardBg = "#ffffff";
  const textMain = "#111827";
  const textMuted = "#6b7280";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bg}; color: ${textMain}; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
      .header { text-align: center; margin-bottom: 32px; }
      .brand-logo { width: 48px; height: 48px; border-radius: 12px; margin-bottom: 12px; object-fit: cover; }
      .brand-name { color: ${accent}; font-weight: bold; font-size: 24px; text-decoration: none; display: block; }
      .card { background: ${cardBg}; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .content { padding: 40px; }
      .title { margin: 0 0 16px; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${textMain}; }
      .subtitle { color: ${textMuted}; margin-bottom: 32px; font-size: 16px; line-height: 1.6; }
      .btn { display: block; width: 100%; text-align: center; background: ${accent}; color: #ffffff; padding: 16px 0; border-radius: 12px; font-weight: bold; font-size: 16px; text-decoration: none; margin-top: 32px; transition: opacity 0.2s; box-shadow: 0 4px 6px -1px ${accent}33; }
      .btn:hover { opacity: 0.9; }
      .btn-secondary { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; color: ${textMuted}; text-decoration: none; border: 1px solid #e5e7eb; margin: 0 4px; }
      .btn-secondary:hover { background: #f9fafb; color: ${textMain}; }
      .footer { text-align: center; margin-top: 32px; color: ${textMuted}; font-size: 12px; }
      .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; align-items: flex-start; }
      .info-label { color: ${textMuted}; min-width: 80px; }
      .info-value { font-weight: 500; text-align: right; color: ${textMain}; flex: 1; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: rgba(16, 185, 129, 0.1); color: #10B981; margin-bottom: 24px; }
      .status-badge.cancelled { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        ${opts.brandLogoUrl ? `<img src="${opts.brandLogoUrl}" class="brand-logo" alt="Logo" />` : ''}
        <div class="brand-name">${escapeHtml(brand)}</div>
      </div>
      
      <div class="card">
        <div class="content">
          <h1 class="title">${escapeHtml(opts.title)}</h1>
          ${opts.subtitle ? `<p class="subtitle">${opts.subtitle}</p>` : ''}
          
          ${opts.bodyHtml}
        </div>
      </div>

      <div class="footer">
        Powered by ${escapeHtml(brand)}
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

  const uid = `${data.bookingId}@intimatecare`;
  const now = formatToICS(new Date());
  const start = formatToICS(startDate);
  const end = formatToICS(endDate);

  const location = data.meetingLink || '';
  const description = `Meeting with ${data.hostName}${data.notes ? `\\n\\nNotes: ${data.notes}` : ''}${data.meetingLink ? `\\n\\nJoin: ${data.meetingLink}` : ''}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IntimateCare//EN
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
ORGANIZER;CN=${data.hostName}:mailto:${data.hostEmail || 'noreply@intimatecare.in'}
ATTENDEE;CN=${data.recipientName};RSVP=TRUE:mailto:${data.recipientEmail}
SEQUENCE:${isCancellation ? '1' : '0'}
END:VEVENT
END:VCALENDAR`;
};

const getEmailContent = (data: EmailRequest, links: { joinUrl?: string; myBookingsUrl?: string; rescheduleUrl?: string; cancelUrl?: string }) => {
  const startFormatted = formatDate(data.startTime, data.timezone);
  const accent = data.branding?.isEnabled && data.branding.brandColor ? data.branding.brandColor : "#FF9124";
  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'Host') || 'Host';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;

  const contentHtml = `
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">Event</span>
      <span class="info-value">${escapeHtml(data.eventTitle)}</span>
    </div>
    
    <div class="info-row">
      <span class="info-label">With</span>
      <span class="info-value">${escapeHtml(data.hostName)}</span>
    </div>

    <div class="info-row">
      <span class="info-label">When</span>
      <span class="info-value">${startFormatted}</span>
    </div>

    <div class="info-row">
      <span class="info-label">Location</span>
      <span class="info-value">${data.meetingLink ? 'Google Meet' : 'Online'}</span>
    </div>

    ${links.joinUrl ? `<a href="${links.joinUrl}" class="btn">Join Meeting</a>` : ''}

    <div class="divider"></div>
    
    <div style="text-align: center; margin-bottom: 8px;">
        <span style="color: #a1a1aa; font-size: 13px;">Manage this booking:</span>
    </div>
    <div style="text-align: center;">
       ${links.rescheduleUrl ? `<a href="${links.rescheduleUrl}" class="btn-secondary">Reschedule</a>` : ''}
       ${links.cancelUrl ? `<a href="${links.cancelUrl}" class="btn-secondary" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Cancel</a>` : ''}
    </div>
    
    <div style="text-align: center; margin-top: 24px;">
       <a href="${links.myBookingsUrl || '#'}" style="color: #a1a1aa; font-size: 13px; text-decoration: none;">View all my bookings</a>
    </div>
  `;

  switch (data.type) {
    case "confirmation":
      return {
        subject: `Booking Confirmed: ${data.eventTitle}`,
        html: wrapEmail({
          title: "Booking Confirmed! ✅",
          subtitle: `Your meeting with <b>${escapeHtml(data.hostName)}</b> is set. We've added it to your calendar.`,
          accentColor: accent,
          bodyHtml: contentHtml,
          brandName,
          brandLogoUrl,
        }),
      };
    case "reschedule":
      return {
        subject: `Booking Rescheduled: ${data.eventTitle}`,
        html: wrapEmail({
          title: "Booking Updated 🔄",
          subtitle: `Your meeting time with <b>${escapeHtml(data.hostName)}</b> has been changed.`,
          accentColor: accent,
          bodyHtml: contentHtml,
          brandName,
          brandLogoUrl,
        }),
      };
    case "reminder":
      return {
        subject: `Reminder: ${data.eventTitle} starts soon`,
        html: wrapEmail({
          title: "Meeting Reminder 🔔",
          subtitle: `You have a meeting with <b>${escapeHtml(data.hostName)}</b> coming up soon.`,
          accentColor: accent,
          bodyHtml: contentHtml,
          brandName,
          brandLogoUrl,
        }),
      };
    case "cancellation":
      return {
        subject: `Booking Cancelled: ${data.eventTitle}`,
        html: wrapEmail({
          title: "Booking Cancelled ❌",
          subtitle: `This meeting has been cancelled.`,
          accentColor: "#EF4444",
          bodyHtml: `
            <div class="divider"></div>
            <p style="color: #a1a1aa; line-height: 1.6;">Your booking for <b>${escapeHtml(data.eventTitle)}</b> on ${startFormatted} has been cancelled.</p>
            <div style="text-align: center; margin-top: 32px;">
                <a href="${links.myBookingsUrl || '#'}" class="btn" style="background: #27272a; color: white;">View Dashboard</a>
            </div>
          `,
          brandName,
          brandLogoUrl,
        }),
      };
    default:
      return {
        subject: "Booking Update",
        html: wrapEmail({
          title: "Booking Update",
          bodyHtml: contentHtml,
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
  const startFormatted = formatDate(data.startTime, data.timezone);
  const accent = data.branding?.isEnabled && data.branding.brandColor ? data.branding.brandColor : "#FF9124";
  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'Host') || 'Host';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;

  const contentHtml = `
    <div class="divider"></div>
    
    <div class="info-row">
      <span class="info-label">What</span>
      <span class="info-value">${escapeHtml(data.eventTitle)}</span>
    </div>
    
    <div class="info-row">
      <span class="info-label">Who</span>
      <span class="info-value">${escapeHtml(attendee.name)} <br/><span style="font-size:12px; font-weight:normal; color:#a1a1aa;">${escapeHtml(attendee.email)}</span></span>
    </div>

    <div class="info-row">
      <span class="info-label">When</span>
      <span class="info-value">${startFormatted}</span>
    </div>

    ${links.joinUrl ? `<a href="${links.joinUrl}" class="btn">Start Meeting</a>` : ''}
  `;

  return {
    subject: `New booking: ${data.eventTitle}`,
    html: wrapEmail({
      title: "New Booking! 🎉",
      subtitle: `<b>${escapeHtml(attendee.name)}</b> scheduled a session with you.`,
      accentColor: accent,
      bodyHtml: contentHtml,
      brandName,
      brandLogoUrl,
    }),
  };
};

const getHostDetails = async (supabase: ReturnType<typeof createClient>, hostId: string) => {
  const { data, error } = await supabase.auth.admin.getUserById(hostId);
  if (error) {
    console.error('Failed to load host auth user:', error);
    return null;
  }
  const meta = data.user?.user_metadata || {};
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

    if (requestedHostId) {
      const { data: brandData } = await supabase
        .from('branding_settings')
        .select('brand_name, brand_logo_url, brand_color, is_enabled, site_url')
        .eq('user_id', requestedHostId)
        .maybeSingle();

      if (brandData) {
        if (!data.branding) {
          data.branding = {
            brandName: brandData.brand_name,
            brandLogoUrl: brandData.brand_logo_url,
            brandColor: brandData.brand_color,
            isEnabled: brandData.is_enabled,
          };
        }
        if (brandData.site_url) {
          data.siteUrl = brandData.site_url;
        }
      }
    }

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

    data.hostName = resolvedHostName;
    data.hostEmail = resolvedHostEmail;

    const siteUrl = data.siteUrl || PUBLIC_SITE_URL || "";
    const joinUrl = data.meetingLink;
    const myBookingsUrl = siteUrl ? `${siteUrl}/my-bookings` : undefined;
    const rescheduleUrl = siteUrl && bookingRow?.reschedule_token ? `${siteUrl}/reschedule/${bookingRow.reschedule_token}` : undefined;
    const cancelUrl = siteUrl && bookingRow?.cancel_token ? `${siteUrl}/cancel/${bookingRow.cancel_token}` : undefined;

    const { subject, html } = getEmailContent(data, { joinUrl, myBookingsUrl, rescheduleUrl, cancelUrl });

    const isCancellation = data.type === "cancellation";
    const icsContent = generateICSContent(data, isCancellation);
    const icsBase64 = btoa(icsContent);

    const emailFromTitle = data.branding?.isEnabled ? (data.branding.brandName || "Intimate Care") : "Intimate Care";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${emailFromTitle} <noreply@intimatecare.in>`,
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
    if (!res.ok) throw new Error(result.message || "Failed to send email");

    if (requestedHostId && resolvedHostEmail) {
      const hostContent = getHostEmailContent(
        data,
        { name: resolvedHostName, email: resolvedHostEmail },
        { name: data.recipientName, email: data.recipientEmail },
        { joinUrl },
      );

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${emailFromTitle} <noreply@intimatecare.in>`,
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