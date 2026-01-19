import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
    type: "customer" | "instructor";
    recipient_phone: string;
    booking: any;
    settings: {
        api_key: string;
        phone_number_id: string;
        customer_template_name?: string;
        instructor_template_name?: string;
        template_language?: string;
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

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const data: WhatsAppRequest = await req.json();
        const { type, recipient_phone, booking, settings } = data;

        if (!recipient_phone || !settings.api_key || !settings.phone_number_id) {
            throw new Error("Missing required WhatsApp configuration");
        }

        const templateName = type === "customer"
            ? (settings.customer_template_name || "booking_confirmation")
            : (settings.instructor_template_name || "new_booking_instructor");

        const templateLanguage = settings.template_language || "en";

        const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://zenthracalendar.com";
        const formattedDate = formatDateTime(booking.start_time, booking.attendee_timezone || "UTC");

        // Construct parameters based on template type
        let parameters: any[] = [];
        if (type === "customer") {
            // 1. Customer Name, 2. Event Title, 3. Date/Time, 4. Host Name, 5. Link
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.host?.name || "the host" },
                { type: "text", text: `${siteUrl}/booking/confirmed/${booking.id}` }
            ];
        } else {
            // 1. Instructor Name, 2. Event Title, 3. Date/Time, 4. Customer Name, 5. Link
            parameters = [
                { type: "text", text: "Instructor" },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.attendee_name },
                { type: "text", text: `${siteUrl}/dashboard/bookings` }
            ];
        }

        const whatsappPayload = {
            messaging_product: "whatsapp",
            to: recipient_phone.replace(/\+/g, ""), // Remove + if present
            type: "template",
            template: {
                name: templateName,
                language: { code: templateLanguage },
                components: [
                    {
                        type: "body",
                        parameters: parameters
                    }
                ]
            }
        };

        console.log(`Sending WhatsApp (${type}) to ${recipient_phone} using template ${templateName}`);

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${settings.api_key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(whatsappPayload),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("WhatsApp API Error:", result);
            return new Response(JSON.stringify({ error: result.error?.message || "Failed to send WhatsApp message" }), {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
