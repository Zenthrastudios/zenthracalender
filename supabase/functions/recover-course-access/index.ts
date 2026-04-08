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
    if (email) {
      console.log(`Lookup by email: ${email}`);
      const { data: purchases, error } = await supabase
        .from("course_purchases")
        .select("access_token, course:courses(id, title, thumbnail_url)")
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

      return new Response(
        JSON.stringify({
          found: true,
          purchases: purchases.map((p: any) => ({
            access_token: p.access_token,
            course_title: p.course?.title || "Your Course",
            thumbnail_url: p.course?.thumbnail_url || null,
          })),
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
