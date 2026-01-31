import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://zenthracalendar.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Email Templates & Styles ---

const escapeHtml = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

const wrapEmail = (opts: {
    title: string;
    subtitle?: string;
    bodyHtml: string;
    brandName?: string;
    heroImage?: string;
    actionLink?: string;
    actionText?: string;
}) => {
    const accent = "#FF9124";
    const brand = opts.brandName || "Zenthra";
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
      .brand { color: ${accent}; font-weight: bold; font-size: 24px; text-decoration: none; }
      .card { background: ${cardBg}; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .hero-image { width: 100%; height: 200px; object-fit: cover; background-color: #e5e7eb; }
      .content { padding: 40px; }
      .title { margin: 0 0 16px; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${textMain}; }
      .subtitle { color: ${textMuted}; margin-bottom: 24px; font-size: 16px; line-height: 1.6; }
      .btn { display: block; width: 100%; text-align: center; background: ${accent}; color: #ffffff; padding: 16px 0; border-radius: 12px; font-weight: bold; font-size: 16px; text-decoration: none; margin-top: 32px; transition: opacity 0.2s; box-shadow: 0 4px 6px -1px rgba(255, 145, 36, 0.2); }
      .btn:hover { opacity: 0.9; }
      .footer { text-align: center; margin-top: 32px; color: ${textMuted}; font-size: 12px; }
      .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
      .info-label { color: ${textMuted}; }
      .info-value { font-weight: 600; text-align: right; color: ${textMain}; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">${escapeHtml(brand)}</div>
      </div>
      
      <div class="card">
        ${opts.heroImage ? `<img src="${opts.heroImage}" alt="${escapeHtml(opts.title)}" class="hero-image" />` : ''}
        
        <div class="content">
          <h1 class="title">${escapeHtml(opts.title)}</h1>
          ${opts.subtitle ? `<p class="subtitle">${opts.subtitle}</p>` : ''}
          
          ${opts.bodyHtml}

          ${opts.actionLink ? `<a href="${opts.actionLink}" class="btn">${opts.actionText || 'View Details'}</a>` : ''}
        </div>
      </div>

      <div class="footer">
        Powered by Zenthra Calendar
      </div>
    </div>
  </body>
  </html>
  `;
};

// --- Helper: Send Email via Resend ---

async function sendEmail(to: string, subject: string, html: string, fromName = "Zenthra Notifications") {
    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        throw new Error("RESEND_API_KEY is missing in Edge Function secrets");
    }

    console.log(`Sending email to ${to} from ${fromName}`);

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: `${fromName} <noreply@intimatecare.in>`,
            to: [to],
            subject,
            html,
        }),
    });

    if (!res.ok) {
        const error = await res.text();
        console.error("Failed to send email:", error);
        throw new Error("Failed to send email via Resend");
    }
}

// --- Main Handler ---

interface NotificationRequest {
    type: 'product_purchase' | 'course_purchase' | 'webinar_registration';
    id: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { type, id }: NotificationRequest = await req.json();
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log(`Processing notification: ${type} for ID: ${id}`);

        if (type === 'product_purchase') {
            const { data: purchase, error } = await supabase
                .from('product_purchases')
                .select('*, digital_products(*)')
                .eq('id', id)
                .single();

            if (error || !purchase) throw new Error("Purchase not found");
            const product = purchase.digital_products;
            const { data: seller } = await supabase.from('profiles').select('email, name').eq('user_id', product.user_id).single();

            const amount = purchase.amount;
            const currency = purchase.currency || 'USD';
            const accessLink = purchase.access_link || `${PUBLIC_SITE_URL}/view/${purchase.access_token}`;

            // Email to Customer
            await sendEmail(
                purchase.customer_email,
                `Order Receipt: ${product.title}`,
                wrapEmail({
                    title: "Order Confirmed!",
                    subtitle: `Thank you for purchasing <b>${escapeHtml(product.title)}</b>.`,
                    heroImage: product.thumbnail_url || product.cover_image_url,
                    brandName: seller?.name,
                    actionLink: accessLink,
                    actionText: "Access Content",
                    bodyHtml: `
                        <div class="divider"></div>
                        <div class="info-row">
                            <span class="info-label">Order ID</span>
                            <span class="info-value">#${purchase.id.slice(0, 8)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Amount Paid</span>
                            <span class="info-value">${amount} ${currency.toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date</span>
                            <span class="info-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    `
                }),
                seller?.name
            );

            // Email to Seller (simplified)
            if (seller?.email) {
                await sendEmail(
                    seller.email,
                    `New Sale: ${product.title}`,
                    wrapEmail({
                        title: "New Sale! 🎉",
                        subtitle: `You just sold a copy of <b>${escapeHtml(product.title)}</b>.`,
                        brandName: "Zenthra",
                        bodyHtml: `
                            <div class="divider"></div>
                             <div class="info-row">
                                <span class="info-label">Customer</span>
                                <span class="info-value">${escapeHtml(purchase.customer_name)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Revenue</span>
                                <span class="info-value">${amount} ${currency.toUpperCase()}</span>
                            </div>
                        `
                    })
                );
            }

        } else if (type === 'course_purchase') {
            const { data: purchase, error } = await supabase
                .from('course_purchases')
                .select('*, courses(*)')
                .eq('id', id)
                .single();

            if (error || !purchase) throw new Error("Course purchase not found");
            const course = purchase.courses;
            const { data: instructor } = await supabase.from('profiles').select('email, name').eq('user_id', course.user_id).single();

            const courseUrl = purchase.access_token
                ? `${PUBLIC_SITE_URL}/course/${purchase.access_token}`
                : `${PUBLIC_SITE_URL}/courses/${course.slug}`;

            // Email to Student
            await sendEmail(
                purchase.customer_email,
                `Welcome to ${course.title}`,
                wrapEmail({
                    title: "Welcome Aboard!",
                    subtitle: `You're now enrolled in <b>${escapeHtml(course.title)}</b>. We're excited to have you!`,
                    heroImage: course.thumbnail_url || course.cover_image_url,
                    brandName: instructor?.name,
                    actionLink: courseUrl,
                    actionText: "Start Learning",
                    bodyHtml: `
                        <p style="color:#6b7280; line-height:1.6;">Access your course materials, lessons, and resources anytime from your dashboard.</p>
                    `
                }),
                instructor?.name
            );

            // Email to Instructor
            if (instructor?.email) {
                await sendEmail(
                    instructor.email,
                    `New Student: ${course.title}`,
                    wrapEmail({
                        title: "New Student Enrolled 🎓",
                        brandName: "Zenthra",
                        bodyHtml: `
                           <p><b>${escapeHtml(purchase.customer_name)}</b> has joined your course.</p>
                        `
                    })
                );
            }

        } else if (type === 'webinar_registration') {
            const { data: reg, error } = await supabase
                .from('webinar_registrations')
                .select('*, webinars(*)')
                .eq('id', id)
                .single();

            if (error || !reg) throw new Error("Registration not found");
            const webinar = reg.webinars;
            const { data: host } = await supabase.from('profiles').select('email, name').eq('user_id', webinar.user_id).single();

            const formattedDate = formatDate(webinar.start_time);
            const webinarUrl = `${PUBLIC_SITE_URL}/webinar/${webinar.id}`; // Fixed URL to public page

            // Determine Mode Content
            const isInPerson = webinar.mode === 'in-person';
            let locationHtml = '';
            let actionLink = webinarUrl;
            let actionText = "View Event Details";

            if (isInPerson) {
                locationHtml = `
                    <div style="background:#f9fafb; padding:16px; border-radius:12px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                        <div class="info-label" style="font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; color:#6b7280;">Location</div>
                        <div class="info-value" style="font-size:16px; color:#111827; text-align:left; line-height:1.4;">${escapeHtml(webinar.location || 'Location to be announced')}</div>
                         <div style="margin-top:8px; font-size:12px;"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(webinar.location || '')}" style="color:#FF9124; text-decoration:none;">📍 View on Map</a></div>
                    </div>
                `;
            } else {
                // Online Mode
                actionLink = webinar.meet_link || webinarUrl;
                actionText = webinar.meet_link ? "Join Online Meeting" : "View Details";
                locationHtml = `
                     <div style="background:#f9fafb; padding:16px; border-radius:12px; margin-bottom: 24px; border: 1px solid #e5e7eb; display:flex; align-items:center; gap:12px;">
                        <img src="https://img.icons8.com/ios-filled/50/FF9124/video-call.png" width="24" height="24" alt="video" />
                        <div>
                            <div class="info-label" style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#6b7280;">Online Event</div>
                            <div class="info-value" style="font-size:14px; color:#111827;">Link provided below</div>
                        </div>
                     </div>
                `;
            }

            // Email to Attendee
            await sendEmail(
                reg.attendee_email,
                `Registration Confirmed: ${webinar.title}`,
                wrapEmail({
                    title: "You're Registered! ✅",
                    subtitle: `Your spot for <b>${escapeHtml(webinar.title)}</b> has been reserved.`,
                    heroImage: webinar.cover_image_url,
                    brandName: host?.name,
                    actionLink: actionLink,
                    actionText: actionText,
                    bodyHtml: `
                        <div class="divider"></div>
                        
                         <div style="background:#f9fafb; padding:16px; border-radius:12px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                            <div class="info-label" style="font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; color:#6b7280;">Date & Time</div>
                            <div class="info-value" style="font-size:18px; color:#111827; text-align:left;">${formattedDate}</div>
                         </div>

                         ${locationHtml}

                        <p style="color:#6b7280; line-height:1.6;">Mark your calendar! We've sent the details to your email. ${isInPerson ? 'Please arrive 10 minutes early.' : 'Click the button below to join when it\'s time.'}</p>
                    `
                }),
                host?.name
            );

            // Email to Host
            if (host?.email) {
                await sendEmail(
                    host.email,
                    `New Attendee: ${webinar.title}`,
                    wrapEmail({
                        title: "New Registration 🎟️",
                        brandName: "Zenthra",
                        bodyHtml: `
                           <p><b>${escapeHtml(reg.attendee_name)}</b> (${escapeHtml(reg.attendee_email)}) just registered for your ${isInPerson ? 'in-person workshop' : 'webinar'}.</p>
                           <div class="divider"></div>
                           <div class="info-row">
                             <span class="info-label">Event</span>
                             <span class="info-value">${escapeHtml(webinar.title)}</span>
                           </div>
                        `
                    })
                );
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: "Notifications processed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error processing notification:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
