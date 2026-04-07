import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CASHFREE_API_URL = Deno.env.get("CASHFREE_ENV") === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Verify Cashfree webhook signature: HMAC-SHA256(timestamp + rawBody, secretKey) base64-encoded */
async function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
  secretKey: string
): Promise<boolean> {
  try {
    const stringToSign = timestamp + rawBody;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign));
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computedSig === signature;
  } catch {
    return false;
  }
}

/** After a payment is confirmed, update downstream records (booking / course / webinar) */
async function handlePaymentSuccess(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  cfPaymentId: string,
  paymentData: unknown
) {
  // Read existing record first so we can MERGE metadata (preserving host_id etc.)
  const { data: existing } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!existing) {
    console.error("No payment record found for order:", orderId);
    return;
  }

  const mergedMetadata = {
    ...(existing.metadata as Record<string, unknown> ?? {}),
    ...(paymentData as Record<string, unknown> ?? {}),
  };

  const { data: payment } = await supabase
    .from("payments")
    .update({
      status: "completed",
      payment_id: cfPaymentId,
      metadata: mergedMetadata,
    })
    .eq("order_id", orderId)
    .select("*")
    .single();

  if (!payment) {
    console.error("Failed to update payment for order:", orderId);
    return;
  }

  const { course_purchase_id, webinar_registration_id, booking_id } = payment;

  if (course_purchase_id) {
    await supabase
      .from("course_purchases")
      .update({ status: "paid", payment_id: payment.id })
      .eq("id", course_purchase_id);
  } else if (webinar_registration_id) {
    await supabase
      .from("webinar_registrations")
      .update({ payment_status: "paid", payment_id: payment.id })
      .eq("id", webinar_registration_id);
  } else if (booking_id) {
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking_id);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("cashfree-payment function invoked", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read raw body once so we can use it for both JSON parsing and signature verification
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

    // ─── Cashfree Webhook ────────────────────────────────────────────────────
    // Cashfree POSTs webhooks with a `type` field (e.g. "PAYMENT_SUCCESS_WEBHOOK")
    // and NO `action` field — this is how we distinguish them from SDK calls.
    if (body.type && !body.action) {
      console.log("Received Cashfree webhook type:", body.type);

      const signature = req.headers.get("x-webhook-signature") ?? "";
      const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
      const data = body.data as Record<string, unknown> | undefined;
      const order = data?.order as Record<string, unknown> | undefined;
      const payment = data?.payment as Record<string, unknown> | undefined;
      const orderId = order?.order_id as string | undefined;
      const paymentStatus = payment?.payment_status as string | undefined;
      const cfPaymentId = String(payment?.cf_payment_id ?? "");

      if (orderId && signature && timestamp) {
        // Look up host credentials for signature verification
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("metadata")
          .eq("order_id", orderId)
          .maybeSingle();

        const hostId = (paymentRecord?.metadata as Record<string, unknown> | null)?.host_id as string | undefined;

        if (hostId) {
          const { data: settings } = await supabase
            .from("payment_settings")
            .select("cashfree_secret_key")
            .eq("user_id", hostId)
            .maybeSingle();

          if (settings?.cashfree_secret_key) {
            const isValid = await verifyCashfreeWebhook(rawBody, signature, timestamp, settings.cashfree_secret_key);
            if (!isValid) {
              console.warn("Invalid Cashfree webhook signature for order:", orderId);
              return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 401,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
          }
        }
      }

      if (orderId) {
        const status =
          paymentStatus === "SUCCESS" ? "completed" :
          paymentStatus === "FAILED" ? "failed" : "pending";

        if (status === "completed" && cfPaymentId) {
          await handlePaymentSuccess(supabase, orderId, cfPaymentId, data);
        } else {
          await supabase
            .from("payments")
            .update({ status, metadata: data })
            .eq("order_id", orderId);
        }

        console.log(`Webhook: updated payment status for order ${orderId}: ${status}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Get Payment Info (public – no secrets exposed) ──────────────────────
    if (body.action === "get-payment-info") {
      const { hostId } = body as { hostId: string };

      const { data: settings } = await supabase
        .from("payment_settings")
        .select("is_razorpay_enabled, razorpay_key_id, is_cashfree_enabled, cashfree_app_id")
        .eq("user_id", hostId)
        .maybeSingle();

      const cashfreeMode = CASHFREE_API_URL.includes("sandbox") ? "sandbox" : "production";
      const razorpayEnabled = !!(settings?.is_razorpay_enabled && settings?.razorpay_key_id);
      const cashfreeEnabled = !!(settings?.is_cashfree_enabled && settings?.cashfree_app_id);

      // Prefer cashfree if both are enabled, otherwise whichever is ready
      let activeGateway = "razorpay";
      if (cashfreeEnabled && !razorpayEnabled) activeGateway = "cashfree";
      else if (razorpayEnabled) activeGateway = "razorpay";
      else if (cashfreeEnabled) activeGateway = "cashfree";

      return new Response(JSON.stringify({
        success: true,
        activeGateway,
        cashfreeMode,
        razorpayEnabled,
        cashfreeEnabled,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Create Order ────────────────────────────────────────────────────────
    if (body.action === "create-order") {
      const {
        bookingId, coursePurchaseId, amount, currency = "INR",
        customerName, customerEmail, customerPhone,
        returnUrl, hostId,
      } = body as {
        bookingId?: string; coursePurchaseId?: string; amount: number; currency?: string;
        customerName: string; customerEmail: string; customerPhone?: string;
        returnUrl: string; hostId: string;
      };

      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("cashfree_app_id, cashfree_secret_key, is_cashfree_enabled")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings || !settings.is_cashfree_enabled) {
        throw new Error("Cashfree is not enabled or configured for this host");
      }

      const { cashfree_app_id: appId, cashfree_secret_key: secretKey } = settings;
      if (!appId || !secretKey) {
        throw new Error("Cashfree credentials not configured for this host");
      }

      const referenceId = bookingId || coursePurchaseId || `temp_${Date.now()}`;
      const orderId = `order_${referenceId}_${Date.now()}`;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/cashfree-payment`;

      const orderPayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: `cust_${referenceId}`,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || "9999999999",
        },
        order_meta: {
          return_url: `${returnUrl}?order_id={order_id}`,
          notify_url: webhookUrl,
        },
        order_note: `Payment for ${coursePurchaseId ? "course" : "booking"} ${referenceId}`,
      };

      console.log("Creating Cashfree order:", orderId);

      const response = await fetch(`${CASHFREE_API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": appId,
          "x-client-secret": secretKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await response.json();
      console.log("Cashfree order response:", JSON.stringify(orderResult));

      if (!response.ok) {
        throw new Error(orderResult.message || "Failed to create Cashfree order");
      }

      await supabase.from("payments").insert({
        booking_id: bookingId && !bookingId.startsWith("temp_") ? bookingId : null,
        course_purchase_id: coursePurchaseId ?? null,
        provider: "cashfree",
        order_id: orderId,
        amount,
        currency,
        status: "pending",
        metadata: { host_id: hostId },
      });

      return new Response(JSON.stringify({
        success: true,
        orderId,
        paymentSessionId: orderResult.payment_session_id,
        orderToken: orderResult.order_token,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Verify Payment (manual check after checkout) ────────────────────────
    if (body.action === "verify-payment") {
      const { orderId } = body as { orderId: string };

      const { data: paymentRecord } = await supabase
        .from("payments")
        .select("metadata, status, course_purchase_id, booking_id, webinar_registration_id")
        .eq("order_id", orderId)
        .maybeSingle();

      // Fast path: webhook already completed this payment before the client called us
      if (paymentRecord?.status === "completed") {
        console.log("Payment already completed by webhook, returning success:", orderId);
        return new Response(JSON.stringify({ success: true, isPaid: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Slow path: need to verify with Cashfree API
      const meta = paymentRecord?.metadata as Record<string, unknown> | null;
      const hostId = meta?.host_id as string | undefined;

      if (!hostId) {
        // Payment record missing entirely — nothing we can do without host credentials
        throw new Error("Payment record not found");
      }

      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("cashfree_app_id, cashfree_secret_key")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings?.cashfree_app_id || !settings?.cashfree_secret_key) {
        throw new Error("Cashfree credentials not configured for this host");
      }

      const response = await fetch(`${CASHFREE_API_URL}/orders/${orderId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": settings.cashfree_app_id,
          "x-client-secret": settings.cashfree_secret_key,
        },
      });

      const orderResult = await response.json();
      console.log("Cashfree order verification:", JSON.stringify(orderResult));

      const isPaid = orderResult.order_status === "PAID";

      if (isPaid) {
        const paymentsResponse = await fetch(`${CASHFREE_API_URL}/orders/${orderId}/payments`, {
          method: "GET",
          headers: {
            "x-api-version": "2023-08-01",
            "x-client-id": settings.cashfree_app_id,
            "x-client-secret": settings.cashfree_secret_key,
          },
        });
        const paymentsResult = await paymentsResponse.json();
        const successfulPayment = Array.isArray(paymentsResult)
          ? paymentsResult.find((p: Record<string, unknown>) => p.payment_status === "SUCCESS")
          : null;
        const cfPaymentId = String(successfulPayment?.cf_payment_id ?? "");

        await handlePaymentSuccess(supabase, orderId, cfPaymentId, orderResult);
      }

      return new Response(JSON.stringify({
        success: true,
        order: orderResult,
        isPaid,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Cashfree payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
