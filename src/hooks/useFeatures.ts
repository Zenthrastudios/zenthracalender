import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from './useRole';

export function useFeatures() {
    const { user, profile } = useAuth();
    const { isSuperAdmin } = useRole();

    const { data: activeFeatures, isLoading, refetch } = useQuery({
        queryKey: ['user-features', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase.rpc('get_user_features', {
                target_user_id: user.id
            });

            if (error) {
                console.error('Error fetching features:', error);
                return [];
            }

            return data as string[];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const hasFeature = (key: string) => {
        // Superadmins always see everything for debugging/management
        if (isSuperAdmin) return true;

        // Core platform features that are always enabled for everyone
        const coreFeatures = ['dashboard', 'bookings', 'availability', 'products'];
        if (coreFeatures.includes(key)) return true;

        return activeFeatures?.includes(key) || false;
    };

    return {
        activeFeatures,
        hasFeature,
        isLoading,
        refetch
    };
}
