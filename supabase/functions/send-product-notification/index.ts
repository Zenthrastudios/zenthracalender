import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://zenthracalendar.com"; // Fallback/Update as needed

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Email Templates & Styles (Shared Style) ---

const escapeHtml = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const wrapEmail = (opts: {
    title: string;
    subtitle?: string;
    bodyHtml: string;
    brandName?: string;
}) => {
    const accent = "#FF9124"; // Main brand color
    const brand = opts.brandName || "Zenthra";

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0B0F; color: #FFFFFF; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
      .card { background: #1C1C1E; border-radius: 24px; padding: 40px; border: 1px solid rgba(255,255,255,0.05); }
      .btn { display: inline-block; background: linear-gradient(135deg, ${accent}, #FF5C00); color: #000; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="color:${accent};font-weight:bold;font-size:24px;">${escapeHtml(brand)}</div>
      </div>
      
      <div class="card">
        <h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(opts.title)}</h1>
        ${opts.subtitle ? `<p style="color:#94A3B8;margin-bottom:32px;line-height:1.6;">${escapeHtml(opts.subtitle)}</p>` : ''}
        
        ${opts.bodyHtml}
      </div>

      <div style="text-align:center;margin-top:32px;color:#48484A;font-size:12px;">
        Powered by Zenthra
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

    console.log(`Sending email to ${to} from ${fromName} <noreply@intimatecare.in>`);

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: `${fromName} <noreply@intimatecare.in>`, // Using existing verified domain
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
    id: string; // ID of the purchase record
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { type, id }: NotificationRequest = await req.json();
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log(`Processing notification: ${type} for ID: ${id}`);

        if (type === 'product_purchase') {
            // 1. Fetch Purchase Details
            const { data: purchase, error } = await supabase
                .from('product_purchases')
                .select('*, digital_products(*)')
                .eq('id', id)
                .single();

            if (error || !purchase) throw new Error("Purchase not found");
            const product = purchase.digital_products;

            // 2. Fetch Seller Profile
            const { data: seller } = await supabase.from('profiles').select('email, name').eq('user_id', product.user_id).single();

            const customerEmail = purchase.customer_email;
            const amount = purchase.amount;
            const currency = purchase.currency || 'USD';

            // Email to Customer
            await sendEmail(
                customerEmail,
                `Your Order Receipt: ${product.title}`,
                wrapEmail({
                    title: "Thanks for your purchase!",
                    subtitle: `Here is your access to <b>${escapeHtml(product.title)}</b>.`,
                    bodyHtml: `
            <div style="background:rgba(255,255,255,0.03);padding:20px;border-radius:12px;margin-bottom:20px;">
              <div style="font-size:14px;color:#8E8E93;">Amount Paid</div>
              <div style="font-size:24px;font-weight:bold;">${amount} ${currency.toUpperCase()}</div>
            </div>
            <p>You can access your product using the link below:</p>
            <a href="${purchase.access_link || '#'}" class="btn">Access Product</a>
          `,
                    brandName: seller?.name
                }),
                seller?.name
            );

            // Email to Seller
            if (seller?.email) {
                await sendEmail(
                    seller.email,
                    `New Sale: ${product.title}`,
                    wrapEmail({
                        title: "Cha-ching! New Sale",
                        subtitle: `You just sold <b>${escapeHtml(product.title)}</b>.`,
                        bodyHtml: `
              <div style="margin-bottom:12px;"><b>Customer:</b> ${escapeHtml(purchase.customer_name)} (${escapeHtml(customerEmail)})</div>
              <div><b>Amount:</b> ${amount} ${currency.toUpperCase()}</div>
            `,
                        brandName: "Zenthra"
                    })
                );
            }

        } else if (type === 'course_purchase') {
            // 1. Fetch Course Purchase
            const { data: purchase, error } = await supabase
                .from('course_purchases')
                .select(`
            *,
            courses (*)
         `)
                .eq('id', id)
                .single();

            if (error || !purchase) throw new Error("Course purchase not found");
            const course = purchase.courses;

            // 2. Fetch Instructor
            const { data: instructor } = await supabase.from('profiles').select('email, name').eq('user_id', course.user_id).single();

            // Email to Student
            await sendEmail(
                purchase.customer_email,
                `Welcome to ${course.title}`,
                wrapEmail({
                    title: "Welcome aboard!",
                    subtitle: `You are now enrolled in <b>${escapeHtml(course.title)}</b>.`,
                    bodyHtml: `
             <p>Get started learning right away.</p>
             <a href="${PUBLIC_SITE_URL}/courses/${course.slug}" class="btn">Start Learning</a>
           `,
                    brandName: instructor?.name
                }),
                instructor?.name
            );

            // Email to Instructor
            if (instructor?.email) {
                await sendEmail(
                    instructor.email,
                    `New Student: ${course.title}`,
                    wrapEmail({
                        title: "New Student Enrolled",
                        bodyHtml: `
               <p><b>${escapeHtml(purchase.customer_name)}</b> just bought your course!</p>
               <p><b>Earnings:</b> ${purchase.amount}</p>
             `,
                        brandName: "Zenthra"
                    })
                );
            }

        } else if (type === 'webinar_registration') {
            const { data: reg, error } = await supabase
                .from('webinar_registrations')
                .select(`
             *,
             webinars (*)
          `)
                .eq('id', id)
                .single();

            if (error || !reg) throw new Error("Registration not found");
            const webinar = reg.webinars;

            const { data: host } = await supabase.from('profiles').select('email, name').eq('user_id', webinar.user_id).single();

            // Email to Attendee
            const startTime = new Date(webinar.start_time).toLocaleString();

            await sendEmail(
                reg.attendee_email,
                `Registration Confirmed: ${webinar.title}`,
                wrapEmail({
                    title: "You're registered!",
                    subtitle: `Your spot for <b>${escapeHtml(webinar.title)}</b> is saved.`,
                    bodyHtml: `
               <div style="background:rgba(255,255,255,0.03);padding:20px;border-radius:12px;margin:20px 0;">
                 <div style="color:#aaa;font-size:12px;text-transform:uppercase;">When</div>
                 <div style="font-size:18px;font-weight:600;margin-top:4px;">${startTime}</div>
               </div>
               ${webinar.meet_link ? `<a href="${webinar.meet_link}" class="btn">Join Webinar</a>` : ''}
             `,
                    brandName: host?.name
                }),
                host?.name
            );

            // Email to Host
            if (host?.email) {
                await sendEmail(
                    host.email,
                    `New Attendee: ${webinar.title}`,
                    wrapEmail({
                        title: "New Registration",
                        bodyHtml: `
                      <p><b>${escapeHtml(reg.attendee_name)}</b> (${escapeHtml(reg.attendee_email)}) just registered.</p>
                    `,
                        brandName: "Zenthra"
                    })
                );
            }
        }

        // TODO: Team Notifications
        // Currently relying on 'teams' table which is not yet created. 
        // In the future, query team_members of the owner (product.user_id) with 'admin' role and loop through to send emails.

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
