import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BrandingSettings {
    id: string;
    user_id: string;
    brand_name: string;
    brand_logo_url: string | null;
    brand_color: string;
    site_url: string | null;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export function useBrandingSettings(userId?: string) {
    const { user } = useAuth();
    const effectiveUserId = userId || user?.id;

    return useQuery({
        queryKey: ['branding-settings', effectiveUserId],
        queryFn: async () => {
            if (!effectiveUserId) return null;

            const { data, error } = await (supabase as any)
                .from('branding_settings')
                .select('*')
                .eq('user_id', effectiveUserId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching branding settings:', error);
                return null;
            }
            return data as BrandingSettings | null;
        },
        enabled: !!effectiveUserId,
    });
}

export function useUpdateBrandingSettings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settings: Partial<BrandingSettings>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: existing } = await (supabase as any)
                .from('branding_settings')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const { data, error } = await (supabase as any)
                    .from('branding_settings')
                    .update({
                        ...settings,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return data as BrandingSettings;
            } else {
                const { data, error } = await (supabase as any)
                    .from('branding_settings')
                    .insert({
                        ...settings,
                        user_id: user.id,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data as BrandingSettings;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['branding-settings', user?.id] });
        },
    });
}

export function useUploadBrandLogo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Upload to branding-logos bucket (ensure it exists or use existing)
            // For now, let's use a subfolder in profiles or a new bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars') // Reusing avatars bucket for simplicity or create branding-logos
                .upload(`branding/${filePath}`, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(`branding/${filePath}`);

            return publicUrl;
        },
        onSuccess: () => {
            // Invalidation handled by the update mutation that follows logo upload
        },
    });
}
