import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Helper to create HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

// Helper to create SHA256 hash
async function sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(message));
    return bufferToHex(hash);
}

// URL encode for AWS (encodes all special chars except unreserved)
function awsUriEncode(str: string, encodeSlash = true): string {
    let encoded = "";
    for (const char of str) {
        if (
            (char >= "A" && char <= "Z") ||
            (char >= "a" && char <= "z") ||
            (char >= "0" && char <= "9") ||
            char === "_" ||
            char === "-" ||
            char === "~" ||
            char === "."
        ) {
            encoded += char;
        } else if (char === "/" && !encodeSlash) {
            encoded += char;
        } else {
            encoded += "%" + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
        }
    }
    return encoded;
}

serve(async (req: Request) => {
    // Handle CORS preflight - return immediately
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        // Get R2 configuration
        const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
        const ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
        const SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
        const BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "course-videos";
        const PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL");

        // Check if R2 is configured
        if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !PUBLIC_URL) {
            return new Response(
                JSON.stringify({
                    error: "R2 not configured",
                    details: "Missing environment variables"
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verify JWT
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: { headers: { Authorization: authHeader } },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const body = await req.json();
        const { action, fileName, fileType, courseId } = body;

        if (action === "get-upload-url") {
            if (!fileName || !fileType) {
                return new Response(
                    JSON.stringify({ error: "Missing fileName or fileType" }),
                    {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            // Create unique file path
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
            const objectKey = `${user.id}/${courseId || "general"}/${timestamp}_${sanitizedFileName}`;

            // R2 endpoint and configuration
            const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
            const region = "auto";
            const service = "s3";

            // Time components
            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
            const dateStamp = amzDate.substring(0, 8);

            // Expiration
            const expiresIn = 3600;

            // Credential scope
            const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

            // Build canonical URI (path-style: /bucket/key)
            const canonicalUri = "/" + BUCKET_NAME + "/" + objectKey;

            // Query parameters for presigned URL (MUST be sorted alphabetically)
            const queryParams: Record<string, string> = {
                "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
                "X-Amz-Credential": `${ACCESS_KEY_ID}/${credentialScope}`,
                "X-Amz-Date": amzDate,
                "X-Amz-Expires": expiresIn.toString(),
                "X-Amz-SignedHeaders": "host",
            };

            // Build canonical query string (sorted, encoded)
            const sortedKeys = Object.keys(queryParams).sort();
            const canonicalQueryString = sortedKeys
                .map((key) => `${awsUriEncode(key)}=${awsUriEncode(queryParams[key])}`)
                .join("&");

            // Canonical headers
            const canonicalHeaders = `host:${host}\n`;
            const signedHeaders = "host";

            // Payload hash (UNSIGNED-PAYLOAD for presigned URLs)
            const payloadHash = "UNSIGNED-PAYLOAD";

            // Build canonical request
            const canonicalRequest = [
                "PUT",
                canonicalUri,
                canonicalQueryString,
                canonicalHeaders,
                signedHeaders,
                payloadHash,
            ].join("\n");

            // Create string to sign
            const canonicalRequestHash = await sha256(canonicalRequest);
            const stringToSign = [
                "AWS4-HMAC-SHA256",
                amzDate,
                credentialScope,
                canonicalRequestHash,
            ].join("\n");

            // Calculate signing key
            const encoder = new TextEncoder();
            const kDate = await hmacSha256(encoder.encode("AWS4" + SECRET_ACCESS_KEY), dateStamp);
            const kRegion = await hmacSha256(kDate, region);
            const kService = await hmacSha256(kRegion, service);
            const kSigning = await hmacSha256(kService, "aws4_request");

            // Calculate signature
            const signatureBuffer = await hmacSha256(kSigning, stringToSign);
            const signature = bufferToHex(signatureBuffer);

            // Build final presigned URL
            const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

            // Public URL for viewing
            const publicUrl = `${PUBLIC_URL}/${objectKey}`;

            console.log("Generated presigned URL for:", objectKey);

            return new Response(
                JSON.stringify({
                    uploadUrl,
                    publicUrl,
                    key: objectKey,
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action" }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: any) {
        console.error("R2 Upload Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
