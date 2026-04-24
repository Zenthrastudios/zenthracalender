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
        const { accessToken } = await req.json();
        if (!accessToken) throw new Error("Missing access token");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Verify purchase
        // Note: We use the join syntax to get the related product's file_url
        const { data: purchase, error: purchaseError } = await supabase
            .from('product_purchases')
            .select('status, product:digital_products(file_url)')
            .eq('access_token', accessToken)
            .eq('status', 'paid')
            .maybeSingle();

        if (purchaseError || !purchase) {
            console.error("Access denied:", accessToken, purchaseError);
            return new Response(JSON.stringify({ error: "Invalid or expired access link" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // @ts-ignore
        const filePath = purchase.product?.file_url;

        if (!filePath) {
            throw new Error("File not found for this product");
        }

        // Create Signed URL
        const { data: signedUrlData, error: signError } = await supabase
            .storage
            .from('digital-products')
            .createSignedUrl(filePath, 3600); // 1 hour

        if (signError || !signedUrlData) {
            console.error("Sign error:", signError);
            throw new Error("Failed to generate access link");
        }

        return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
