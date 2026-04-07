import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
    type: "customer" | "instructor" | "cancellation" | "reschedule" | "reschedule_instructor" | "payment_failed" | "reminder" | "reminder_instructor" | "course_purchase" | "product_purchase" | "course_purchase_instructor" | "product_purchase_instructor" | "webinar_registration" | "webinar_reminder" | "support_ticket_created" | "support_ticket_resolved";
    recipient_phone: string;
    booking: any;
    settings: {
        api_key: string;
        phone_number_id: string;
        customer_template_name?: string;
        instructor_template_name?: string;
        cancelled_template_name?: string;
        rescheduled_template_name?: string;
        instructor_rescheduled_template_name?: string;
        payment_failed_template_name?: string;
        reminder_template_name?: string;
        instructor_reminder_template_name?: string;
        course_purchase_template_name?: string;
        product_purchase_template_name?: string;
        instructor_course_purchase_template_name?: string;
        instructor_product_purchase_template_name?: string;
        webinar_registration_template_name?: string;
        webinar_reminder_template_name?: string;
        support_ticket_created_template_name?: string;
        support_ticket_resolved_template_name?: string;
        template_language?: string;
        site_url?: string;
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

// @ts-ignore
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const data: WhatsAppRequest = await req.json();
        const { type, recipient_phone, booking, settings } = data;

        if (!recipient_phone || !settings.api_key || !settings.phone_number_id) {
            throw new Error("Missing required WhatsApp configuration");
        }

        let templateName = "";
        switch (type) {
            case "customer":
                templateName = settings.customer_template_name || "booking_confirmation";
                break;
            case "instructor":
                templateName = settings.instructor_template_name || "new_booking_instructor";
                break;
            case "cancellation":
                templateName = settings.cancelled_template_name || "booking_cancelled";
                break;
            case "reschedule":
                templateName = settings.rescheduled_template_name || "booking_rescheduled";
                break;
            case "reschedule_instructor":
                templateName = settings.instructor_rescheduled_template_name || "booking_rescheduled_instructor";
                break;
            case "payment_failed":
                templateName = settings.payment_failed_template_name || "payment_failed";
                break;
            case "reminder":
                templateName = settings.reminder_template_name || "booking_reminder";
                break;
            case "reminder_instructor":
                templateName = settings.instructor_reminder_template_name || "booking_reminder_instructor";
                break;
            case "course_purchase":
                templateName = settings.course_purchase_template_name || "course_purchase_confirmation";
                break;
            case "product_purchase":
                templateName = settings.product_purchase_template_name || "product_purchase_confirmation";
                break;
            case "course_purchase_instructor":
                templateName = settings.instructor_course_purchase_template_name || "new_course_purchase_instructor";
                break;
            case "product_purchase_instructor":
                templateName = settings.instructor_product_purchase_template_name || "new_product_purchase_instructor";
                break;
            case "webinar_registration":
                templateName = settings.webinar_registration_template_name || "webinar_registration_confirmation";
                break;
            case "webinar_reminder":
                templateName = settings.webinar_reminder_template_name || "webinar_reminder";
                break;
            case "support_ticket_created":
                templateName = settings.support_ticket_created_template_name || "support_ticket_received";
                break;
            case "support_ticket_resolved":
                templateName = settings.support_ticket_resolved_template_name || "support_ticket_resolved";
                break;
            default:
                templateName = settings.customer_template_name || "booking_confirmation";
        }

        const templateLanguage = settings.template_language || "en";
        // @ts-ignore
        const siteUrl = (settings.site_url || Deno.env.get("PUBLIC_SITE_URL") || "https://cal.zenthrashop.in").replace(/\/$/, '');
        const formattedDate = formatDateTime(booking.start_time, booking.attendee_timezone || "UTC");

        // Construct parameters based on template type
        let parameters: any[] = [];
        if (type === "customer") {
            // New Booking (Customer)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.host?.name || "the host" },
                { type: "text", text: `${siteUrl}/booking/confirmed/${booking.id}` }
            ];
        } else if (type === "instructor") {
            // New Booking (Instructor)
            parameters = [
                { type: "text", text: "Instructor" },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.attendee_name },
                { type: "text", text: `${siteUrl}/dashboard/bookings` }
            ];
        } else if (type === "cancellation") {
            // Cancellation (1. Name, 2. Event Title, 3. Date/Time, 4. Host Name)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.host?.name || "the host" }
            ];
        } else if (type === "reschedule") {
            // Reschedule (Customer) (1. Name, 2. Event Title, 3. New Date/Time, 4. Link)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: `${siteUrl}/booking/confirmed/${booking.id}` }
            ];
        } else if (type === "reschedule_instructor") {
            // Reschedule (Instructor) (1. Instructor, 2. Event Title, 3. New Date/Time, 4. Attendee Name, 5. Link)
            parameters = [
                { type: "text", text: "Instructor" },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.attendee_name },
                { type: "text", text: `${siteUrl}/dashboard/bookings` }
            ];
        } else if (type === "payment_failed") {
            // Payment Failed (1. Name, 2. Event Title, 3. Date/Time, 4. Link to retry)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: `${siteUrl}/booking/${booking.host?.username}/${booking.event_type?.slug}` }
            ];
        } else if (type === "reminder") {
            // Reminder (Customer) (1. Name, 2. Event Title, 3. Date/Time, 4. Host Name, 5. Meeting Link)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.host?.name || "the host" },
                { type: "text", text: booking.meet_link || `${siteUrl}/booking/confirmed/${booking.id}` }
            ];
        } else if (type === "reminder_instructor") {
            // Reminder (Instructor) (1. Instructor, 2. Event Title, 3. Date/Time, 4. Attendee Name, 5. Link)
            parameters = [
                { type: "text", text: "Instructor" },
                { type: "text", text: booking.event_type?.title || "Session" },
                { type: "text", text: formattedDate },
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.meet_link || `${siteUrl}/dashboard/bookings` }
            ];
        } else if (type === "course_purchase") {
            // Course Purchase (Customer) (1. Name, 2. Course Title, 3. Link)
            parameters = [
                { type: "text", text: booking.customer_name },
                { type: "text", text: booking.course?.title || "Course" },
                { type: "text", text: `${siteUrl}/course/${booking.course?.slug || booking.course_id}/access/${booking.access_token}` }
            ];
        } else if (type === "product_purchase") {
            // Product Purchase (Customer) (1. Name, 2. Product Title, 3. Link)
            parameters = [
                { type: "text", text: booking.customer_name },
                { type: "text", text: booking.product?.title || "Digital Product" },
                { type: "text", text: `${siteUrl}/product/${booking.product?.slug || booking.product_id}/access/${booking.access_token}` }
            ];
        } else if (type === "course_purchase_instructor") {
            // Course Purchase (Instructor) (1. Instructor, 2. Customer Name, 3. Course Title)
            parameters = [
                { type: "text", text: booking.instructor_name || "Instructor" },
                { type: "text", text: booking.customer_name },
                { type: "text", text: booking.course?.title || "Course" }
            ];
        } else if (type === "product_purchase_instructor") {
            // Product Purchase (Instructor) (1. Instructor, 2. Product Title, 3. Customer Name)
            parameters = [
                { type: "text", text: booking.instructor_name || "Instructor" },
                { type: "text", text: booking.product?.title || "Digital Product" },
                { type: "text", text: booking.customer_name }
            ];
        } else if (type === "webinar_registration") {
            // Webinar Registration (Customer) (1. Name, 2. Webinar Title, 3. Date, 4. Link)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.webinar?.title || "Webinar" },
                { type: "text", text: formatDateTime(booking.webinar?.start_time, "UTC") },
                { type: "text", text: booking.webinar?.meet_link || `${siteUrl}/webinar/${booking.webinar_id}` }
            ];
        } else if (type === "webinar_reminder") {
            // Webinar Reminder (Customer) (1. Name, 2. Webinar Title, 3. Time, 4. Link)
            parameters = [
                { type: "text", text: booking.attendee_name },
                { type: "text", text: booking.webinar?.title || "Webinar" },
                { type: "text", text: booking.time_remaining || "soon" },
                { type: "text", text: booking.webinar?.meet_link || `${siteUrl}/webinar/${booking.webinar_id}` }
            ];
        } else if (type === "support_ticket_created") {
            // Support Ticket Created (1. Name, 2. Subject, 3. Ticket ID)
            parameters = [
                { type: "text", text: booking.customer_name },
                { type: "text", text: booking.subject },
                { type: "text", text: booking.id.substring(0, 8) }
            ];
        } else if (type === "support_ticket_resolved") {
            // Support Ticket Resolved (1. Name, 2. Subject)
            parameters = [
                { type: "text", text: booking.customer_name },
                { type: "text", text: booking.subject }
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
    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
