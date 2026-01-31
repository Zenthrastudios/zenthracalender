import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  action: "create-order";
  bookingId?: string;
  coursePurchaseId?: string;
  webinarRegistrationId?: string;
  amount: number; // Amount in paise
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  hostId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("razorpay-payment function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    if (body.action === "create-order") {
      const { bookingId, coursePurchaseId, webinarRegistrationId, amount, currency = "INR", customerName, customerEmail, hostId } = body as CreateOrderRequest;

      // Fetch user-specific Razorpay settings
      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("razorpay_key_id, razorpay_key_secret, is_razorpay_enabled")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings || !settings.is_razorpay_enabled) {
        throw new Error("Razorpay is not enabled or configured for this host");
      }

      const keyId = settings.razorpay_key_id;
      const keySecret = settings.razorpay_key_secret;

      if (!keyId || !keySecret) {
        throw new Error("Razorpay credentials not configured for this host");
      }

      const authHeader = btoa(`${keyId}:${keySecret}`);
      const referenceId = bookingId || coursePurchaseId || webinarRegistrationId || `temp_${Date.now()}`;

      // Truncate receipt to max 40 chars
      // Use last 12 chars of ID + short timestamp
      const shortId = referenceId.slice(-12);
      const shortTs = Date.now().toString().slice(-8);

      const orderPayload = {
        amount: amount, // Amount in paise
        currency: currency,
        receipt: `rcpt_${shortId}_${shortTs}`, // e.g. rcpt_abc123..._12345678 (approx 25-30 chars)
        notes: {
          booking_id: bookingId,
          course_purchase_id: coursePurchaseId,
          webinar_registration_id: webinarRegistrationId,
          customer_name: customerName,
          customer_email: customerEmail,
          host_id: hostId,
        },
      };

      console.log("Creating Razorpay order:", orderPayload);

      const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await response.json();
      console.log("Razorpay order response:", orderResult);

      if (!response.ok) {
        throw new Error(orderResult.error?.description || "Failed to create Razorpay order");
      }

      // Store payment record
      const { error: insertError } = await supabase.from("payments").insert({
        booking_id: bookingId && !bookingId.startsWith('temp_') ? bookingId : null,
        course_purchase_id: coursePurchaseId || null,
        webinar_registration_id: webinarRegistrationId || null,
        provider: "razorpay",
        order_id: orderResult.id,
        amount: amount / 100, // Convert paise to rupees
        currency: currency,
        status: "pending",
        metadata: { host_id: hostId }
      });

      if (insertError) {
        console.error("Failed to insert payment record:", insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        id: orderResult.id,
        orderId: orderResult.id,
        amount: orderResult.amount,
        currency: orderResult.currency,
        keyId: keyId,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (body.action === "verify-payment") {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

      console.log(`Verifying payment for Order ID: ${razorpayOrderId}`);

      // Fetch the host ID and purchase IDs from the payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("metadata, order_id, booking_id, course_purchase_id, webinar_registration_id")
        .eq("order_id", razorpayOrderId)
        .maybeSingle();

      if (paymentError) {
        console.error("Database error fetching payment:", paymentError);
        throw new Error(`Database error: ${paymentError.message}`);
      }

      if (!payment) {
        throw new Error(`Payment record not found for ID: ${razorpayOrderId}`);
      }

      // Check metadata
      if (!payment.metadata || typeof payment.metadata !== 'object') {
        throw new Error("Payment record corrupted (missing metadata)");
      }

      const hostId = (payment.metadata as any).host_id;

      // Fetch host-specific secret
      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("razorpay_key_secret")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings || !settings.razorpay_key_secret) {
        throw new Error("Razorpay credentials not configured for this host");
      }

      const keySecret = settings.razorpay_key_secret;

      // Verify signature
      const generatedSignature = await generateSignature(
        `${razorpayOrderId}|${razorpayPaymentId}`,
        keySecret
      );

      const isValid = generatedSignature === razorpaySignature;
      console.log("Signature verification:", { isValid, razorpayOrderId, razorpayPaymentId });

      if (isValid) {
        // 1. Update payment record
        await supabase
          .from("payments")
          .update({
            status: "completed",
            payment_id: razorpayPaymentId,
            metadata: { ...((payment.metadata as object) || {}), razorpayOrderId, razorpayPaymentId, razorpaySignature },
          })
          .eq("order_id", razorpayOrderId);

        // 2. Update the associated entity (booking or course purchase)
        if (payment.course_purchase_id) {
          console.log(`Updating course purchase ${payment.course_purchase_id} to paid`);
          await supabase
            .from("course_purchases")
            .update({
              status: "paid",
              payment_id: razorpayPaymentId
            })
            .eq("id", payment.course_purchase_id);
        } else if (payment.webinar_registration_id) {
          console.log(`Updating webinar registration ${payment.webinar_registration_id} to paid`);
          await supabase
            .from("webinar_registrations")
            .update({
              payment_status: "paid",
              payment_id: payment.id // or razorpayPaymentId if you prefer
            })
            .eq("id", payment.webinar_registration_id);
        } else if (payment.booking_id) {
          console.log(`Updating booking ${payment.booking_id} to confirmed`);
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", payment.booking_id);
        }

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          message: "Payment verified and records updated",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } else {
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("order_id", razorpayOrderId);

        return new Response(JSON.stringify({
          success: false,
          verified: false,
          message: "Payment verification failed",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

    } else if (body.action === "webhook") {
      // Handle Razorpay webhook
      console.log("Received Razorpay webhook:", JSON.stringify(body));

      const event = body.event;
      const payload = body.payload;

      if (event === "payment.captured" || event === "payment.authorized") {
        const orderId = payload?.payment?.entity?.order_id;
        const paymentId = payload?.payment?.entity?.id;

        if (orderId) {
          await supabase
            .from("payments")
            .update({
              status: "completed",
              payment_id: paymentId,
              metadata: payload,
            })
            .eq("order_id", orderId);

          console.log(`Updated payment status for order ${orderId}: completed`);
        }
      } else if (event === "payment.failed") {
        const orderId = payload?.payment?.entity?.order_id;

        if (orderId) {
          await supabase
            .from("payments")
            .update({
              status: "failed",
              metadata: payload,
            })
            .eq("order_id", orderId);

          console.log(`Updated payment status for order ${orderId}: failed`);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Razorpay payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

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

serve(handler);
