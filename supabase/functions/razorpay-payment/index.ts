import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    if (body.action === "create-order") {
      const {
        bookingId, coursePurchaseId, webinarRegistrationId, planId,
        amount, currency = "INR", customerName, customerEmail, hostId, userId
      } = body;

      // Determine credentials
      let keyId, keySecret;
      if (planId) {
        keyId = Deno.env.get("RAZORPAY_KEY_ID");
        keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
      } else {
        const { data: settings } = await supabase
          .from("payment_settings")
          .select("razorpay_key_id, razorpay_key_secret, is_razorpay_enabled")
          .eq("user_id", hostId)
          .maybeSingle();

        if (!settings?.is_razorpay_enabled) throw new Error("Razorpay not enabled for host");
        keyId = settings.razorpay_key_id;
        keySecret = settings.razorpay_key_secret;
      }

      if (!keyId || !keySecret) throw new Error("Razorpay credentials missing");

      const authHeader = btoa(`${keyId}:${keySecret}`);
      const referenceId = planId || bookingId || coursePurchaseId || webinarRegistrationId || `temp_${Date.now()}`;

      const orderPayload = {
        amount: Math.round(amount * 100), // convert to paise
        currency,
        receipt: `rcpt_${referenceId.toString().slice(-12)}_${Date.now().toString().slice(-8)}`,
        notes: { planId, bookingId, coursePurchaseId, webinarRegistrationId, hostId, userId }
      };

      const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${authHeader}` },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await response.json();
      if (!response.ok) throw new Error(orderResult.error?.description || "Failed to create order");

      // Store payment record
      await supabase.from("payments").insert({
        booking_id: bookingId && !bookingId.startsWith('temp_') ? bookingId : null,
        course_purchase_id: coursePurchaseId || null,
        webinar_registration_id: webinarRegistrationId || null,
        provider: "razorpay",
        order_id: orderResult.id,
        amount: amount,
        currency: currency,
        status: "pending",
        metadata: { hostId, planId, userId, customerName, customerEmail }
      });

      return new Response(JSON.stringify({
        success: true,
        id: orderResult.id,
        amount: orderResult.amount,
        currency: orderResult.currency,
        keyId
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } else if (body.action === "verify-payment") {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", razorpayOrderId)
        .single();

      if (!payment) throw new Error("Payment record not found");

      let keySecret;
      if (payment.metadata.planId) {
        keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
      } else {
        const { data: settings } = await supabase
          .from("payment_settings")
          .select("razorpay_key_secret")
          .eq("user_id", payment.metadata.hostId)
          .single();
        keySecret = settings?.razorpay_key_secret;
      }

      if (!keySecret) throw new Error("Secret not found");

      const isValid = (await generateSignature(`${razorpayOrderId}|${razorpayPaymentId}`, keySecret)) === razorpaySignature;

      if (isValid) {
        await supabase.from("payments").update({
          status: "completed",
          payment_id: razorpayPaymentId,
          metadata: { ...payment.metadata, razorpayOrderId, razorpayPaymentId, razorpaySignature }
        }).eq("order_id", razorpayOrderId);

        // Success logic
        const { planId, userId } = payment.metadata;
        const { course_purchase_id, webinar_registration_id, booking_id } = payment;

        if (planId && userId) {
          await supabase.from("profiles").update({ plan_id: planId }).eq("id", userId);
          await supabase.from("user_roles").upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
        } else if (course_purchase_id) {
          await supabase.from("course_purchases").update({ status: "paid", payment_id: razorpayPaymentId }).eq("id", course_purchase_id);
        } else if (webinar_registration_id) {
          await supabase.from("webinar_registrations").update({ payment_status: "paid", payment_id: payment.id }).eq("id", webinar_registration_id);
        } else if (booking_id) {
          await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking_id);
        }

        return new Response(JSON.stringify({ success: true, verified: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        await supabase.from("payments").update({ status: "failed" }).eq("order_id", razorpayOrderId);
        return new Response(JSON.stringify({ success: false, verified: false }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(handler);
