import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  action: "create-order";
  bookingId: string;
  amount: number; // Amount in paise (e.g., 50000 for ₹500)
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
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
      const { bookingId, amount, currency = "INR", customerName, customerEmail } = body as CreateOrderRequest;

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay credentials not configured");
      }

      const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      const orderPayload = {
        amount: amount, // Amount in paise
        currency: currency,
        receipt: `receipt_${bookingId}_${Date.now()}`,
        notes: {
          booking_id: bookingId,
          customer_name: customerName,
          customer_email: customerEmail,
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
      await supabase.from("payments").insert({
        booking_id: bookingId,
        provider: "razorpay",
        order_id: orderResult.id,
        amount: amount / 100, // Convert paise to rupees
        currency: currency,
        status: "pending",
      });

      return new Response(JSON.stringify({
        success: true,
        orderId: orderResult.id,
        amount: orderResult.amount,
        currency: orderResult.currency,
        keyId: RAZORPAY_KEY_ID,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (body.action === "verify-payment") {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

      if (!RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay credentials not configured");
      }

      // Verify signature
      const generatedSignature = await generateSignature(
        `${razorpayOrderId}|${razorpayPaymentId}`,
        RAZORPAY_KEY_SECRET
      );

      const isValid = generatedSignature === razorpaySignature;
      console.log("Signature verification:", { isValid, razorpayOrderId, razorpayPaymentId });

      if (isValid) {
        // Update payment record
        await supabase
          .from("payments")
          .update({ 
            status: "completed",
            payment_id: razorpayPaymentId,
            metadata: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
          })
          .eq("order_id", razorpayOrderId);

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          message: "Payment verified successfully",
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

    } else if (body.action === "webhook" || body.event) {
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
