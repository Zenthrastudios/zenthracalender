import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsappSettings {
    id: string;
    user_id: string;
    api_key: string;
    phone_number_id: string;
    business_account_id: string | null;
    customer_template_name: string;
    instructor_template_name: string;
    template_language: string;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export function useWhatsappSettings() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['whatsapp-settings', user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await (supabase as any)
                .from('whatsapp_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;
            return data as WhatsappSettings | null;
        },
        enabled: !!user,
    });
}

export function useUpdateWhatsappSettings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settings: Partial<WhatsappSettings>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: existing } = await (supabase as any)
                .from('whatsapp_settings')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const { data, error } = await (supabase as any)
                    .from('whatsapp_settings')
                    .update(settings)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                const { data, error } = await (supabase as any)
                    .from('whatsapp_settings')
                    .insert({
                        ...settings,
                        user_id: user.id
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
        },
    });
}
