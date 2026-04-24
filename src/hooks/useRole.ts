import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'guest' | 'superadmin';

export function useRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        return 'guest' as AppRole;
      }

      return (data?.role as AppRole) || 'guest';
    },
    enabled: !!user,
  });

  return {
    role: role || 'guest',
    isAdmin: role === 'admin' || role === 'superadmin',
    isSuperAdmin: role === 'superadmin',
    isGuest: role === 'guest' || !role,
    isLoading,
  };
}
