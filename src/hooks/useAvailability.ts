import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Availability {
  id: string;
  user_id: string;
  weekday: number;
  start_time: number;
  end_time: number;
  created_at: string;
}

export function useAvailability(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['availability', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', targetUserId)
        .order('weekday')
        .order('start_time');

      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!targetUserId,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newAvailability: Omit<Availability, 'id' | 'user_id' | 'created_at'>[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing availability
      await supabase
        .from('availability')
        .delete()
        .eq('user_id', user.id);

      // Insert new availability
      if (newAvailability.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(
            newAvailability.map(a => ({
              ...a,
              user_id: user.id,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useHostAvailabilityForBooking(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host-availability', hostId],
    queryFn: async () => {
      if (!hostId) return [];

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', hostId)
        .order('weekday')
        .order('start_time');

      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!hostId,
  });
}

export function useHostBookingsForDate(hostId: string | undefined, date: Date | null) {
  return useQuery({
    queryKey: ['host-bookings', hostId, date?.toISOString()],
    queryFn: async () => {
      if (!hostId || !date) return [];

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('host_id', hostId)
        .eq('status', 'confirmed')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!hostId && !!date,
  });
}
