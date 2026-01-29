import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductPurchaseNotification {
    purchase_id: string;
    customer_email: string;
    customer_name: string;
    customer_phone?: string;
    product_title: string;
    amount: number;
    access_token: string;
    access_link: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload: ProductPurchaseNotification = await req.json();
        console.log("Product purchase notification triggered:", payload);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Send email notification (you can integrate with your email service here)
        // For now, we'll log it
        console.log("Email notification would be sent to:", payload.customer_email);
        console.log("Subject: Access Your Digital Product -", payload.product_title);
        console.log("Access link:", payload.access_link);

        // Send WhatsApp notification if phone number exists
        if (payload.customer_phone) {
            try {
                // Get the product owner to fetch WhatsApp settings
                const { data: purchase } = await supabase
                    .from('product_purchases')
                    .select('product:digital_products(user_id)')
                    .eq('id', payload.purchase_id)
                    .single();

                if (purchase?.product) {
                    // @ts-ignore
                    const sellerId = purchase.product.user_id;

                    // Trigger WhatsApp notification
                    const whatsappPayload = {
                        type: 'product_purchase',
                        recipient_phone: payload.customer_phone,
                        userId: sellerId,
                        booking: {
                            customerName: payload.customer_name,
                            productTitle: payload.product_title,
                            amount: payload.amount.toString(),
                            accessLink: payload.access_link
                        }
                    };

                    const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp-message', {
                        body: whatsappPayload
                    });

                    if (whatsappError) {
                        console.error("WhatsApp notification failed:", whatsappError);
                    } else {
                        console.log("WhatsApp notification sent successfully");
                    }
                }
            } catch (whatsappErr) {
                console.error("Error sending WhatsApp:", whatsappErr);
                // Don't fail the whole function if WhatsApp fails
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: "Notifications sent" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error processing notification:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
