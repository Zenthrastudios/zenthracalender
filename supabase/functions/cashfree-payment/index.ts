import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use sandbox for testing, production for live
const CASHFREE_API_URL = "https://sandbox.cashfree.com/pg"; // Change to https://api.cashfree.com/pg for production

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  action: "create-order";
  bookingId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  hostId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("cashfree-payment function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    if (body.action === "create-order") {
      const { bookingId, amount, currency = "INR", customerName, customerEmail, customerPhone, returnUrl, hostId } = body as CreateOrderRequest;

      // Fetch user-specific Cashfree settings
      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("cashfree_app_id, cashfree_secret_key, is_cashfree_enabled")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings || !settings.is_cashfree_enabled) {
        throw new Error("Cashfree is not enabled or configured for this host");
      }

      const appId = settings.cashfree_app_id;
      const secretKey = settings.cashfree_secret_key;

      if (!appId || !secretKey) {
        throw new Error("Cashfree credentials not configured for this host");
      }

      const orderId = `order_${bookingId}_${Date.now()}`;

      const orderPayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: `cust_${bookingId}`,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || "9999999999",
        },
        order_meta: {
          return_url: `${returnUrl}?order_id={order_id}`,
          notify_url: `${SUPABASE_URL}/functions/v1/cashfree-payment`,
        },
        order_note: `Payment for booking ${bookingId}`,
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
      console.log("Cashfree order response:", orderResult);

      if (!response.ok) {
        throw new Error(orderResult.message || "Failed to create Cashfree order");
      }

      // Store payment record
      await supabase.from("payments").insert({
        booking_id: bookingId.startsWith('temp_') ? null : bookingId,
        provider: "cashfree",
        order_id: orderId,
        amount: amount,
        currency: currency,
        status: "pending",
        metadata: { host_id: hostId }
      });

      return new Response(JSON.stringify({
        success: true,
        orderId: orderId,
        paymentSessionId: orderResult.payment_session_id,
        orderToken: orderResult.order_token,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (body.action === "webhook") {
      // Handle webhook from Cashfree
      console.log("Received Cashfree webhook:", JSON.stringify(body));

      const orderId = body.data?.order?.order_id;
      const paymentStatus = body.data?.payment?.payment_status;

      if (orderId) {
        const status = paymentStatus === "SUCCESS" ? "completed" :
          paymentStatus === "FAILED" ? "failed" : "pending";

        await supabase
          .from("payments")
          .update({
            status: status,
            payment_id: body.data?.payment?.cf_payment_id,
            metadata: body.data,
          })
          .eq("order_id", orderId);

        console.log(`Updated payment status for order ${orderId}: ${status}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (body.action === "verify-payment") {
      const { orderId } = body;

      // Fetch the host ID from the payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("metadata")
        .eq("order_id", orderId)
        .single();

      if (paymentError || !payment || !payment.metadata || typeof payment.metadata !== 'object') {
        throw new Error("Payment record not found");
      }

      const hostId = (payment.metadata as any).host_id;

      // Fetch host-specific settings
      const { data: settings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("cashfree_app_id, cashfree_secret_key")
        .eq("user_id", hostId)
        .maybeSingle();

      if (settingsError || !settings || !settings.cashfree_app_id || !settings.cashfree_secret_key) {
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
      console.log("Cashfree order verification:", orderResult);

      return new Response(JSON.stringify({
        success: true,
        order: orderResult,
        isPaid: orderResult.order_status === "PAID",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Cashfree payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
