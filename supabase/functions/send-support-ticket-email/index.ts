import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { ticketId } = await req.json();

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*, courses(title), digital_products(title)")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) throw new Error("Ticket not found");

    // Fetch branding settings to get support email
    const { data: branding } = await supabase
      .from("branding_settings")
      .select("*")
      .eq("user_id", ticket.user_id)
      .single();

    const supportEmail = branding?.support_email || "support@zenthracalendar.com";
    const siteName = branding?.site_name || "Zenthra Calendar";
    const siteUrl = branding?.site_url || "https://zenthracalendar.com";

    // Send email to admin/instructor
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${siteName} Support <support@resend.dev>`,
        to: [supportEmail],
        subject: `[Support Ticket #${ticket.id.slice(0, 8)}] New Inquiry: ${ticket.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #f97316; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">New Support Ticket</h1>
            </div>
            <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px;">Hello,</p>
              <p style="font-size: 16px;">A new support ticket has been dispatched from your ${ticket.courses?.title || ticket.digital_products?.title || 'platform'}.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Customer Name:</strong> ${ticket.customer_name}</p>
                <p style="margin: 0 0 8px 0;"><strong>Customer Email:</strong> ${ticket.customer_email}</p>
                <p style="margin: 0 0 8px 0;"><strong>Customer Phone:</strong> ${ticket.customer_phone || 'N/A'}</p>
                <p style="margin: 0 0 20px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 20px 0;">
                <p style="font-style: italic;">"${ticket.message}"</p>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="${siteUrl}/dashboard/support" 
                   style="background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                   View Ticket in Dashboard
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${siteName}. Automated support notification.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      console.error("Resend API error:", emailError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
