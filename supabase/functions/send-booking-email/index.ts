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
  const accent = opts.accent || "#FF9124";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0B0F; color: #FFFFFF; }
      @media screen and (max-width: 600px) {
        .container { padding: 20px 10px !important; }
        .card { padding: 24px 20px !important; }
        .section-grid { display: block !important; }
        .section-item { margin-bottom: 24px !important; width: 100% !important; }
      }
    </style>
  </head>
  <body style="background-color:#0B0B0F;padding:40px 0;color:#FFFFFF;">
    <div class="container" style="max-width:600px;margin:0 auto;padding:0 20px;">
      
      <!-- Top Icon -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg, \${accent}, #FF5C00);border-radius:50%;line-height:64px;text-align:center;box-shadow: 0 10px 20px -5px \${accent}40;">
          <span style="font-size:32px;">✓</span>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:40px;">
        <h1 style="margin:0 0 12px;font-size:32px;font-weight:800;letter-spacing:-1px;color:#FFFFFF;">\${escapeHtml(opts.title)}</h1>
        \${opts.subtitle ? `< p style = "margin:12px auto 0;font-size:16px;line-height:1.6;color:#94A3B8;max-width:400px;" >\${ escapeHtml(opts.subtitle) } </p>` : ""
}
</div>

  < !--Main Card-- >
    <div class="card" style = "background:#1C1C1E;border-radius:24px;padding:40px;border:1px solid rgba(255,255,255,0.05);margin-bottom:32px;" >

      <!--Host Simple Box-- >
        <div style="display:flex;align-items:center;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);" >
          <div style="width:48px;height:48px;background:#4F46E5;border-radius:12px;margin-right:16px;display:inline-block;vertical-align:middle;text-align:center;line-height:48px;" >
\${
  opts.brandLogoUrl
  ? `<img src="\${opts.brandLogoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
  : `<span style="color:white;font-weight:bold;font-size:20px;">\${opts.brandName.charAt(0)}</span>`
}
</div>
  < div style = "display:inline-block;vertical-align:middle;" >
    <div style="font-weight:700;font-size:18px;color:#FFFFFF;" >\${ escapeHtml(opts.brandName) } </div>
      < div style = "font-size:14px;color:#636366;" > @\${ escapeHtml(opts.brandName.toLowerCase().replace(/\\s+/g, '')) } </div>
        </div>
        </div>

\${ opts.bodyHtml }

</div>

  < !--Actions -->
    <div style="text-align:center;margin-top:20px;" >
\${ opts.footerHtml || "" }

<p style="margin-top:40px;font-size:12px;color:#48484A;letter-spacing:1px;text-transform:uppercase;" >
  POWERED BY < strong style = "color:#636366;" > CalSchedule </strong>
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

  const uid = `\${ data.bookingId } @calschedule`;
  const now = formatToICS(new Date());
  const start = formatToICS(startDate);
  const end = formatToICS(endDate);

  const location = data.meetingLink || '';
  const description = `Meeting with \${ data.hostName } \${ data.notes ? `\\\\n\\\\nNotes: \${data.notes}` : '' } \${ data.meetingLink ? `\\\\n\\\\nJoin: \${data.meetingLink}` : '' } `;

  return `BEGIN: VCALENDAR
VERSION: 2.0
PRODID: -//CalSchedule//EN
  CALSCALE: GREGORIAN
METHOD: \${ isCancellation ? 'CANCEL' : 'REQUEST' }
BEGIN: VEVENT
UID: \${ uid }
DTSTAMP: \${ now }
DTSTART: \${ start }
DTEND: \${ end }
SUMMARY: \${ data.eventTitle } with \${ data.hostName }
DESCRIPTION: \${ description }
LOCATION: \${ location }
STATUS: \${ isCancellation ? 'CANCELLED' : 'CONFIRMED' }
ORGANIZER; CN =\${ data.hostName }: mailto: \${ data.hostEmail || 'noreply@calschedule.com' }
ATTENDEE; CN =\${ data.recipientName }; RSVP = TRUE: mailto: \${ data.recipientEmail }
SEQUENCE: \${ isCancellation ? '1' : '0' }
END: VEVENT
END: VCALENDAR`;
};

const getEmailContent = (data: EmailRequest, links: { joinUrl?: string; myBookingsUrl?: string; rescheduleUrl?: string; cancelUrl?: string }) => {
  const startFormatted = formatDateTime(data.startTime, data.timezone);
  const endFormatted = formatDateTime(data.endTime, data.timezone);
  const joinUrl = links.joinUrl;
  const myBookingsUrl = links.myBookingsUrl;
  const rescheduleUrl = links.rescheduleUrl;
  const cancelUrl = links.cancelUrl;

  const accent = data.branding?.isEnabled ? data.branding.brandColor : "#FF9124";
  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'Host') || 'Host';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;

  const contentHtml = `
  < !--Details Grid-- >
    <div class="section-grid" style = "display:table;width:100%;margin-bottom:32px;" >
      <!--WHAT Row-- >
        <div style="display:table-row;" >
          <div class="section-item" style = "display:table-cell;width:50%;padding-bottom:32px;padding-right:16px;vertical-align:top;" >
            <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;" >
              <span style="margin-right:4px;" >📹</span> WHAT
                </div>
                < div style = "font-size:18px;font-weight:700;color:#FFFFFF;margin-bottom:4px;" >\${ escapeHtml(data.eventTitle) } </div>
                  < div style = "font-size:14px;color:#8E8E93;" > Google Meet </div>
                    </div>
                    < div class="section-item" style = "display:table-cell;width:50%;padding-bottom:32px;vertical-align:top;" >
                      <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;" >
                        <span style="margin-right:4px;" >👤</span> WHO
                          </div>
                          < div style = "font-size:18px;font-weight:700;color:#FFFFFF;margin-bottom:4px;" >\${ escapeHtml(data.recipientName) } </div>
                            < div style = "font-size:14px;color:#8E8E93;" >\${ escapeHtml(data.recipientEmail) } </div>
                              </div>
                              </div>
                              </div>

                              < !--WHEN section full width-- >
                                <div style="margin-bottom:32px;padding-top:32px;border-top:1px dashed rgba(255,255,255,0.08);" >
                                  <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;" >
                                    <span style="margin-right:4px;" >🕒</span> WHEN
                                      </div>
                                      < div style = "font-size:18px;color:#FFFFFF;font-weight:600;line-height:1.4;" >
\${ escapeHtml(startFormatted.split('at')[0]) } <span style="color:\${accent};" > at </span> \${escapeHtml(startFormatted.split('at')[1])} - \${escapeHtml(endFormatted.split('at')[1])}
  < span style = "color:#636366;font-size:16px;" > (\${ escapeHtml(data.timezone.split('/').pop() || data.timezone) })</span>
    </div>
    </div>

    < !--Join Button inside card-- >
\${
  joinUrl ? `
    <div style="margin-top:40px;text-align:center;">
       <a href="\${joinUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:linear-gradient(135deg, \${accent}, #FF5C00);color:#000000;padding:18px 32px;border-radius:18px;font-weight:800;font-size:17px;text-decoration:none;box-shadow: 0 10px 20px -5px \${accent}60;">
         📹 Join Meeting
       </a>
    </div>
    ` : ""
}
`;

  const footerActions = `
  < div style = "text-align:center;" >
    <div style="margin-bottom:24px;" >
      <a href="\${myBookingsUrl || '#'}" style = "color:\${accent};text-decoration:none;font-size:15px;font-weight:600;display:inline-flex;align-items:center;" >
        <span style="margin-right:8px;" >📅</span> Add to Calendar
          </a>
          </div>

          < div style = "display:block;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);" >
            <span style="color:#636366;margin:0 12px;" >
              <a href="\${rescheduleUrl || '#'}" style = "color:#94A3B8;text-decoration:none;font-size:14px;font-weight:500;" >🔄 Reschedule </a>
                </span>
                < span style = "color:rgba(255,255,255,0.1);" >| </span>
                  < span style = "color:#636366;margin:0 12px;" >
                    <a href="\${cancelUrl || '#'}" style = "color:#EF4444;text-decoration:none;font-size:14px;font-weight:500;" >❌ Cancel </a>
                      </span>
                      </div>

                      < div style = "margin-top:32px;" >
                        <a href="\${myBookingsUrl || '#'}" style = "color:#636366;text-decoration:none;font-weight:500;font-size:13px;" > View all your bookings →</a>
                          </div>
                          </div>
                            `;

  switch (data.type) {
    case "confirmation":
      return {
        subject: `Booking Confirmed: \${ data.eventTitle } `,
        html: wrapEmail({
          title: "Booking confirmed!",
          subtitle: `You are scheduled with the host.A calendar invitation has been sent to your email address.`,
          accent,
          bodyHtml: contentHtml,
          footerHtml: footerActions,
          brandName,
          brandLogoUrl,
        }),
      };
    case "reschedule":
      return {
        subject: `Booking Rescheduled: \${ data.eventTitle } `,
        html: wrapEmail({
          title: "Booking rescheduled!",
          subtitle: `Your meeting time has been updated.A new calendar invitation has been sent.`,
          accent,
          bodyHtml: contentHtml,
          footerHtml: footerActions,
          brandName,
          brandLogoUrl,
        }),
      };
    case "reminder":
      return {
        subject: `Reminder: \${ data.eventTitle } starts soon`,
        html: wrapEmail({
          title: "Meeting starting soon!",
          subtitle: `This is a reminder for your upcoming session.We're looking forward to seeing you.`,
accent,
  bodyHtml: contentHtml,
    footerHtml: footerActions,
      brandName,
      brandLogoUrl,
        }),
      };
    case "cancellation":
return {
  subject: `Booking Cancelled: \${data.eventTitle}`,
  html: wrapEmail({
    title: "Booking cancelled",
    subtitle: `This meeting has been cancelled. A calendar update has been sent to your email.`,
    accent: "#EF4444",
    bodyHtml: contentHtml,
    footerHtml: `
            <div style="margin-top:20px;text-align:center;">
               <a href="\${myBookingsUrl || '#'}" style="color:#636366;text-decoration:none;font-weight:500;font-size:13px;">View all your bookings →</a>
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
  const startFormatted = formatDateTime(data.startTime, data.timezone);
  const endFormatted = formatDateTime(data.endTime, data.timezone);
  const joinUrl = links.joinUrl;

  const accent = data.branding?.isEnabled ? data.branding.brandColor : "#FF9124";
  const brandName = (data.branding?.isEnabled ? data.branding.brandName : 'Host') || 'Host';
  const brandLogoUrl = data.branding?.isEnabled ? data.branding.brandLogoUrl : undefined;

  const contentHtml = `
    <!-- Details Grid -->
    <div class="section-grid" style="display:table;width:100%;margin-bottom:32px;">
      <!-- WHAT Row -->
      <div style="display:table-row;">
        <div class="section-item" style="display:table-cell;width:50%;padding-bottom:32px;padding-right:16px;vertical-align:top;">
          <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
            <span style="margin-right:4px;">📹</span> WHAT
          </div>
          <div style="font-size:18px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">\${escapeHtml(data.eventTitle)}</div>
          <div style="font-size:14px;color:#8E8E93;">Google Meet</div>
        </div>
        <div class="section-item" style="display:table-cell;width:50%;padding-bottom:32px;vertical-align:top;">
          <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
            <span style="margin-right:4px;">👤</span> ATTENDEE
          </div>
          <div style="font-size:18px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">\${escapeHtml(attendee.name)}</div>
          <div style="font-size:14px;color:#8E8E93;">\${escapeHtml(attendee.email)}</div>
        </div>
      </div>
    </div>

    <!-- WHEN section full width -->
    <div style="margin-bottom:32px;padding-top:32px;border-top:1px dashed rgba(255,255,255,0.08);">
       <div style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
         <span style="margin-right:4px;">🕒</span> WHEN
       </div>
       <div style="font-size:18px;color:#FFFFFF;font-weight:600;line-height:1.4;">
         \${escapeHtml(startFormatted.split('at')[0])} <span style="color:\${accent};">at</span> \${escapeHtml(startFormatted.split('at')[1])} - \${escapeHtml(endFormatted.split('at')[1])}
       </div>
    </div>

    <!-- Join Button inside card -->
    \${joinUrl ? `
    < div style = "margin-top:40px;text-align:center;" >
      <a href="\${joinUrl}" style = "display:inline-block;width:100%;box-sizing:border-box;background:linear-gradient(135deg, \${accent}, #FF5C00);color:#000000;padding:18px 32px;border-radius:18px;font-weight:800;font-size:17px;text-decoration:none;box-shadow: 0 10px 20px -5px \${accent}60;" >
         📹 Join Meeting
  </a>
  </div>
    ` : ""}
  `;

return {
  subject: `New booking: \${data.eventTitle}`,
  html: wrapEmail({
    title: "New booking!",
    subtitle: `You have a new session scheduled with \${attendee.name}.`,
    accent,
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
        if (!data.siteUrl && brandData.site_url) {
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

    const siteUrl = getSiteUrl(data);
    const joinUrl = data.meetingLink;
    const myBookingsUrl = siteUrl ? `\${siteUrl}/my-bookings` : undefined;
    const rescheduleUrl = siteUrl && bookingRow?.reschedule_token ? `\${siteUrl}/reschedule/\${bookingRow.reschedule_token}` : undefined;
    const cancelUrl = siteUrl && bookingRow?.cancel_token ? `\${siteUrl}/cancel/\${bookingRow.cancel_token}` : undefined;

    const { subject, html } = getEmailContent(data, { joinUrl, myBookingsUrl, rescheduleUrl, cancelUrl });

    const isCancellation = data.type === "cancellation";
    const icsContent = generateICSContent(data, isCancellation);
    const icsBase64 = btoa(icsContent);

    const emailFromTitle = data.branding?.isEnabled ? (data.branding.brandName || "CalSchedule") : "CalSchedule";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer \${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `\${emailFromTitle} <noreply@intimatecare.in>`,
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
          Authorization: `Bearer \${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `\${emailFromTitle} <noreply@intimatecare.in>`,
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