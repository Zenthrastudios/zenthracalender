import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Generate HMAC-SHA256 hex digest */
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify Razorpay webhook signature: HMAC-SHA256(rawBody, webhookSecret) as hex */
async function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const computed = await generateSignature(rawBody, secret);
    return computed === signature;
  } catch {
    return false;
  }
}

/** After a payment is confirmed, update downstream records */
async function handlePaymentSuccess(
  supabase: ReturnType<typeof createClient>,
  payment: Record<string, unknown>,
  razorpayPaymentId: string
) {
  const metadata = payment.metadata as Record<string, unknown> | null;
  const { planId, userId } = metadata ?? {};
  const coursePurchaseId = payment.course_purchase_id as string | null;
  const webinarRegistrationId = payment.webinar_registration_id as string | null;
  const bookingId = payment.booking_id as string | null;

  if (planId && userId) {
    await supabase.from("profiles").update({ plan_id: planId }).eq("id", userId);
    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });
  } else if (coursePurchaseId) {
    await supabase
      .from("course_purchases")
      .update({ status: "paid", payment_id: razorpayPaymentId })
      .eq("id", coursePurchaseId);
  } else if (webinarRegistrationId) {
    await supabase
      .from("webinar_registrations")
      .update({ payment_status: "paid", payment_id: payment.id })
      .eq("id", webinarRegistrationId);
  } else if (bookingId) {
    await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read raw body once — needed for webhook signature verification
    const rawBody = await req.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Razorpay Webhook ────────────────────────────────────────────────────
    // Razorpay sends webhooks with an `event` field (e.g. "payment.captured")
    // and NO `action` field.
    if (body.event && !body.action) {
      console.log("Received Razorpay webhook event:", body.event);

      const webhookSignature = req.headers.get("x-razorpay-signature") ?? "";
      const eventType = body.event as string;
      const payload = body.payload as Record<string, unknown> | undefined;
      const paymentEntity = (payload?.payment as Record<string, unknown> | undefined)
        ?.entity as Record<string, unknown> | undefined;
      const razorpayOrderId = paymentEntity?.order_id as string | undefined;
      const razorpayPaymentId = paymentEntity?.id as string | undefined;

      if (!razorpayOrderId) {
        // Acknowledge unhandled event types gracefully
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Fetch payment record
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", razorpayOrderId)
        .maybeSingle();

      if (payment && webhookSignature) {
        const metadata = payment.metadata as Record<string, unknown> | null;
        const hostId = metadata?.hostId as string | undefined;
        const planId = metadata?.planId as string | undefined;

        // Determine which webhook secret to use
        let webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

        if (hostId && !planId) {
          const { data: settings } = await supabase
            .from("payment_settings")
            .select("razorpay_webhook_secret")
            .eq("user_id", hostId)
            .maybeSingle();
          if (settings?.razorpay_webhook_secret) {
            webhookSecret = settings.razorpay_webhook_secret;
          }
        }

        if (webhookSecret) {
          const isValid = await verifyRazorpayWebhook(rawBody, webhookSignature, webhookSecret);
          if (!isValid) {
            console.warn("Invalid Razorpay webhook signature for order:", razorpayOrderId);
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }
      }

      // Process event
      if (payment) {
        if (eventType === "payment.captured" || eventType === "payment.authorized") {
          await supabase
            .from("payments")
            .update({
              status: "completed",
              payment_id: razorpayPaymentId,
              metadata: {
                ...(payment.metadata as Record<string, unknown>),
                webhookEvent: eventType,
                razorpayPaymentId,
                razorpayOrderId,
              },
            })
            .eq("order_id", razorpayOrderId);

          await handlePaymentSuccess(supabase, payment as Record<string, unknown>, razorpayPaymentId ?? "");
          console.log(`Webhook: payment completed for order ${razorpayOrderId}`);
        } else if (eventType === "payment.failed") {
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("order_id", razorpayOrderId);
          console.log(`Webhook: payment failed for order ${razorpayOrderId}`);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Create Order ────────────────────────────────────────────────────────
    if (body.action === "create-order") {
      const {
        bookingId, coursePurchaseId, webinarRegistrationId, planId,
        amount, currency = "INR", customerName, customerEmail, hostId, userId,
      } = body as Record<string, unknown>;

      let keyId: string | undefined, keySecret: string | undefined;

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
      const referenceId =
        (planId || bookingId || coursePurchaseId || webinarRegistrationId || `temp_${Date.now()}`) as string;

      const orderPayload = {
        amount: Math.round((amount as number) * 100), // paise
        currency,
        receipt: `rcpt_${referenceId.toString().slice(-12)}_${Date.now().toString().slice(-8)}`,
        notes: { planId, bookingId, coursePurchaseId, webinarRegistrationId, hostId, userId },
      };

      const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await response.json();
      if (!response.ok) throw new Error(orderResult.error?.description || "Failed to create order");

      await supabase.from("payments").insert({
        booking_id: bookingId && !(bookingId as string).startsWith("temp_") ? bookingId : null,
        course_purchase_id: coursePurchaseId ?? null,
        webinar_registration_id: webinarRegistrationId ?? null,
        provider: "razorpay",
        order_id: orderResult.id,
        amount,
        currency,
        status: "pending",
        metadata: { hostId, planId, userId, customerName, customerEmail },
      });

      return new Response(JSON.stringify({
        success: true,
        id: orderResult.id,
        amount: orderResult.amount,
        currency: orderResult.currency,
        keyId,
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Verify Payment (manual verification after checkout) ─────────────────
    if (body.action === "verify-payment") {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body as Record<string, string>;

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", razorpayOrderId)
        .single();

      if (!payment) throw new Error("Payment record not found");

      const metadata = payment.metadata as Record<string, unknown>;
      let keySecret: string | undefined;

      if (metadata.planId) {
        keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
      } else {
        const { data: settings } = await supabase
          .from("payment_settings")
          .select("razorpay_key_secret")
          .eq("user_id", metadata.hostId)
          .single();
        keySecret = settings?.razorpay_key_secret;
      }

      if (!keySecret) throw new Error("Secret not found");

      const isValid =
        (await generateSignature(`${razorpayOrderId}|${razorpayPaymentId}`, keySecret)) ===
        razorpaySignature;

      if (isValid) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            payment_id: razorpayPaymentId,
            metadata: { ...metadata, razorpayOrderId, razorpayPaymentId, razorpaySignature },
          })
          .eq("order_id", razorpayOrderId);

        await handlePaymentSuccess(supabase, payment as Record<string, unknown>, razorpayPaymentId);

        return new Response(JSON.stringify({ success: true, verified: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } else {
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("order_id", razorpayOrderId);

        return new Response(JSON.stringify({ success: false, verified: false }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Razorpay payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
