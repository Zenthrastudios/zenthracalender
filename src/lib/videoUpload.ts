import { supabase } from '@/integrations/supabase/client';

// Cloudflare R2 Video Upload Utility
// This provides secure, fast video hosting with signed URLs

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface UploadResult {
    success: boolean;
    publicUrl?: string;
    error?: string;
}

/**
 * Upload a video file to Cloudflare R2 using presigned URL
 */
export async function uploadVideoToR2(
    file: File,
    courseId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
    try {
        // Get presigned upload URL from our Edge Function
        const { data, error } = await supabase.functions.invoke('r2-video-upload', {
            body: {
                action: 'get-upload-url',
                fileName: file.name,
                fileType: file.type,
                courseId,
            },
        });

        if (error) {
            console.error('Edge function error:', error);
            throw new Error(error.message || 'Failed to get upload URL');
        }

        if (!data?.uploadUrl) {
            throw new Error('Failed to get upload URL from server');
        }

        const { uploadUrl, publicUrl } = data;

        // Upload directly to R2 using the presigned URL
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress({
                        loaded: e.loaded,
                        total: e.total,
                        percentage: Math.round((e.loaded / e.total) * 100),
                    });
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({ success: true, publicUrl });
                } else {
                    console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
                    resolve({ success: false, error: `Upload failed: ${xhr.statusText}` });
                }
            });

            xhr.addEventListener('error', (e) => {
                console.error('XHR error:', e);
                resolve({ success: false, error: 'Network error during upload' });
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    } catch (error: any) {
        console.error('R2 upload error:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Generate a time-limited signed URL for video viewing
 * This prevents direct link sharing
 */
export async function getSignedVideoUrl(
    videoPath: string,
    expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
    try {
        const { data, error } = await supabase.functions.invoke('r2-video-upload', {
            body: {
                action: 'generate-signed-url',
                videoPath,
                expiresIn,
            },
        });

        if (error) throw error;
        return data?.signedUrl || null;
    } catch (error) {
        console.error('Failed to get signed URL:', error);
        return null;
    }
}

/**
 * Fallback: Upload to Supabase Storage if R2 is not configured
 * This is used during development or as a fallback
 */
export async function uploadVideoToSupabase(
    file: File,
    userId: string,
    courseId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${courseId}/${Date.now()}.${fileExt}`;

        // Supabase storage doesn't support progress natively, so we simulate it
        if (onProgress) {
            onProgress({ loaded: 0, total: file.size, percentage: 0 });
        }

        const { error: uploadError } = await supabase.storage
            .from('course-videos')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        if (onProgress) {
            onProgress({ loaded: file.size, total: file.size, percentage: 100 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('course-videos')
            .getPublicUrl(fileName);

        return { success: true, publicUrl };
    } catch (error: any) {
        console.error('Supabase storage error:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Smart upload function - tries R2 first, falls back to Supabase
 */
export async function uploadVideo(
    file: File,
    userId: string,
    courseId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
    // Try R2 first
    try {
        const result = await uploadVideoToR2(file, courseId, onProgress);
        if (result.success) {
            console.log('Video uploaded to R2 successfully');
            return result;
        }
        console.log('R2 upload failed, falling back to Supabase:', result.error);
    } catch (e) {
        console.log('R2 not available, using Supabase storage');
    }

    // Fallback to Supabase storage
    return uploadVideoToSupabase(file, userId, courseId, onProgress);
}
