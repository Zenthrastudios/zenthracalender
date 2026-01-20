import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type AvailabilityOverride = Tables<'availability_overrides'>;

export function useAvailabilityOverrides() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['availability-overrides', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('availability_overrides')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: true });

            if (error) throw error;
            return data as AvailabilityOverride[];
        },
        enabled: !!user,
    });
}

export function useAvailabilityOverridesByUserId(userId: string | undefined) {
    return useQuery({
        queryKey: ['availability-overrides', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('availability_overrides')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            return data as AvailabilityOverride[];
        },
        enabled: !!userId,
    });
}

export function useCreateAvailabilityOverride() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (data: Omit<TablesInsert<'availability_overrides'>, 'user_id'>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: override, error } = await supabase
                .from('availability_overrides')
                .insert({
                    ...data,
                    user_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            return override as AvailabilityOverride;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['availability-overrides'] });
        },
    });
}

export function useUpdateAvailabilityOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<AvailabilityOverride> & { id: string }) => {
            const { data: updated, error } = await supabase
                .from('availability_overrides')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated as AvailabilityOverride;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['availability-overrides'] });
        },
    });
}

export function useDeleteAvailabilityOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('availability_overrides')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['availability-overrides'] });
        },
    });
}
