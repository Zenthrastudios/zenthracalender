import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentSettings {
    id: string;
    user_id: string;
    razorpay_key_id: string | null;
    razorpay_key_secret: string | null;
    cashfree_app_id: string | null;
    cashfree_secret_key: string | null;
    is_razorpay_enabled: boolean;
    is_cashfree_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export function usePaymentSettings() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['payment-settings', user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await (supabase as any)
                .from('payment_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;
            return data as PaymentSettings | null;
        },
        enabled: !!user,
    });
}

export function useUpdatePaymentSettings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (settings: Partial<PaymentSettings>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: existing } = await (supabase as any)
                .from('payment_settings')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const { data, error } = await (supabase as any)
                    .from('payment_settings')
                    .update(settings)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                const { data, error } = await (supabase as any)
                    .from('payment_settings')
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
            queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
        },
    });
}
