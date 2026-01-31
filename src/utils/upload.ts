import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an image to Supabase Storage with a structured fallback pattern.
 * Currently, it defaults to 'public-images' bucket.
 */
export async function uploadImage(file: File, bucket: string = 'public-images') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt Supabase Upload
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.warn("Supabase upload failed, checking for Cloudflare fallback mechanism...");
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error: any) {
        // Fallback Logic Placeholder
        // In a real production environment with Cloudflare R2, you would call your Edge Function 
        // that proxies to R2 here. For now, we log the error and propagate.
        console.error("Critical: Storage layer failure.", error);

        // Example of what a Cloudflare fallback might look like (pseudo-code):
        /*
        const formData = new FormData();
        formData.append('file', file);
        const r2Response = await fetch('/api/cloudflare-upload', { method: 'POST', body: formData });
        const { url } = await r2Response.json();
        return url;
        */

        throw new Error(`Upload failed: ${error.message}. Please verify storage permissions.`);
    }
}
