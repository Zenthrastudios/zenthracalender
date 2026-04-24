import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token } = await req.json();

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── CASE 1: Lookup by Token (direct course load) ──────────────────────────
    if (token) {
      console.log(`Lookup by token: ${token}`);
      const { data: purchase, error } = await supabase
        .from("course_purchases")
        .select(`
          id,
          customer_email,
          customer_name,
          customer_phone,
          status,
          course:courses(id, title, thumbnail_url, user_id, slug)
        `)
        .eq("access_token", token)
        .maybeSingle();

      if (error) throw error;
      if (!purchase) {
        return new Response(JSON.stringify({ found: false, error: "Invalid link" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (purchase.status !== 'paid') {
           return new Response(JSON.stringify({ found: true, status: purchase.status, error: "Access has been revoked or is pending." }), {
             status: 403,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
           });
      }

      return new Response(JSON.stringify({ found: true, purchase }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CASE 2: Lookup by Email (recovery) ──────────────────────────────────
    // ─── CASE 2: Lookup by Email (recovery) ──────────────────────────────────
    if (email) {
      const { otp } = await (async () => {
        try {
          return await req.json();
        } catch {
          return { otp: null };
        }
      })();

      console.log(`Lookup by email: ${email}, OTP: ${otp || 'None'}`);
      
      const { data: purchases, error } = await supabase
        .from("course_purchases")
        .select("id, access_token, course:courses(id, title, thumbnail_url)")
        .ilike("customer_email", email.trim())
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("DB error:", error);
        throw new Error("Failed to look up purchases");
      }

      if (!purchases || purchases.length === 0) {
        return new Response(JSON.stringify({ found: false, purchases: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 2.1: Requesting OTP
      if (!otp) {
        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store in DB
        const { error: otpError } = await supabase
          .from("course_recovery_otps")
          .insert({
            email: email.trim(),
            otp: otpCode,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });

        if (otpError) throw otpError;

        // Send OTP via first purchase (to get course context for branding)
        try {
          await supabase.functions.invoke("send-product-notification", {
            body: { 
              type: "course_access_otp", 
              id: purchases[0].id 
            },
          });
        } catch (notifError) {
          console.error("Failed to send OTP email:", notifError);
        }

        return new Response(
          JSON.stringify({
            found: true,
            otpSent: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Step 2.2: Verifying OTP
      const { data: validOtp, error: verifyError } = await supabase
        .from("course_recovery_otps")
        .select("id")
        .eq("email", email.trim())
        .eq("otp", otp.trim())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (verifyError || !validOtp) {
        return new Response(JSON.stringify({ error: "Invalid or expired verification code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // OTP is valid! Cleanup and generate access tokens
      await supabase.from("course_recovery_otps").delete().eq("email", email.trim());

      const updatedPurchases = [];
      for (const p of purchases) {
        const newToken = crypto.randomUUID();
        
        await supabase
          .from("course_purchases")
          .update({ access_token: newToken })
          .eq("id", p.id);

        updatedPurchases.push({
          access_token: newToken,
          course_title: p.course?.title || "Your Course",
          thumbnail_url: p.course?.thumbnail_url || null,
        });
      }

      return new Response(
        JSON.stringify({
          found: true,
          verified: true,
          purchases: updatedPurchases,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Missing email or token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
