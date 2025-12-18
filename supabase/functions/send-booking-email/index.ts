import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

const getEmailContent = (data: EmailRequest) => {
  const startFormatted = formatDateTime(data.startTime, data.timezone);

  switch (data.type) {
    case "confirmation":
      return {
        subject: `Booking Confirmed: ${data.eventTitle} with ${data.hostName}`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #F5A623, #E8941E); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">✓</span>
              </div>
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Booking Confirmed!</h1>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${data.recipientName},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Your meeting has been scheduled with ${data.hostName}.</p>
            
            <div style="background: #FAF8F5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">${data.eventTitle}</h2>
              <p style="color: #666; margin: 8px 0;"><strong>When:</strong> ${startFormatted}</p>
              <p style="color: #666; margin: 8px 0;"><strong>Timezone:</strong> ${data.timezone}</p>
              ${data.meetingLink ? `<p style="color: #666; margin: 8px 0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #F5A623;">${data.meetingLink}</a></p>` : ""}
              ${data.notes ? `<p style="color: #666; margin: 8px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ""}
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">📅 A calendar invite is attached to this email. Add it to your calendar to stay organized!</p>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Powered by CalSchedule</p>
          </div>
        `,
      };

    case "cancellation":
      return {
        subject: `Booking Cancelled: ${data.eventTitle}`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Booking Cancelled</h1>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${data.recipientName},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">The following meeting has been cancelled:</p>
            
            <div style="background: #FFF5F5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0; text-decoration: line-through;">${data.eventTitle}</h2>
              <p style="color: #666; margin: 8px 0; text-decoration: line-through;"><strong>When:</strong> ${startFormatted}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">📅 A calendar update is attached to remove this event from your calendar.</p>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Powered by CalSchedule</p>
          </div>
        `,
      };

    case "reminder":
      return {
        subject: `Reminder: ${data.eventTitle} - Tomorrow`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; text-align: center;">Meeting Reminder</h1>
            <p style="color: #666; font-size: 16px;">Hi ${data.recipientName}, reminder about your meeting with ${data.hostName}.</p>
            <div style="background: #FAF8F5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #1a1a1a; font-size: 18px;">${data.eventTitle}</h2>
              <p style="color: #666;"><strong>When:</strong> ${startFormatted}</p>
              ${data.meetingLink ? `<p style="color: #666;"><strong>Join:</strong> <a href="${data.meetingLink}" style="color: #F5A623;">${data.meetingLink}</a></p>` : ""}
            </div>
          </div>
        `,
      };

    default:
      return {
        subject: `Update: ${data.eventTitle}`,
        html: `<p>Booking update for ${data.eventTitle}</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log("Email request:", { type: data.type, to: data.recipientEmail });

    const { subject, html } = getEmailContent(data);
    
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
        from: "CalSchedule <onboarding@resend.dev>",
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