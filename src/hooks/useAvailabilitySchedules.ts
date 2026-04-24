import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AvailabilitySchedule {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  schedule_id: string | null;
  weekday: number;
  start_time: number;
  end_time: number;
  created_at: string;
}

export function useAvailabilitySchedules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['availability-schedules', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as AvailabilitySchedule[];
    },
    enabled: !!user,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; timezone?: string; isDefault?: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (data.isDefault) {
        await supabase
          .from('availability_schedules')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data: schedule, error } = await supabase
        .from('availability_schedules')
        .insert({
          user_id: user.id,
          name: data.name,
          timezone: data.timezone || 'Asia/Kolkata',
          is_default: data.isDefault || false,
        })
        .select()
        .single();

      if (error) throw error;
      return schedule as AvailabilitySchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; timezone?: string; isDefault?: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (data.isDefault) {
        await supabase
          .from('availability_schedules')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

      const { error } = await supabase
        .from('availability_schedules')
        .update(updateData)
        .eq('id', data.id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if this is the only schedule
      const { data: schedules } = await supabase
        .from('availability_schedules')
        .select('id')
        .eq('user_id', user.id);

      if (schedules && schedules.length <= 1) {
        throw new Error('Cannot delete the only schedule. Create another schedule first.');
      }

      // Check if this schedule is used by any event types
      const { data: eventTypes } = await supabase
        .from('event_types')
        .select('id, title')
        .eq('schedule_id', scheduleId);

      if (eventTypes && eventTypes.length > 0) {
        throw new Error(`This schedule is used by ${eventTypes.length} event type(s). Please reassign them first.`);
      }

      const { error } = await supabase
        .from('availability_schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useScheduleAvailability(scheduleId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['schedule-availability', scheduleId],
    queryFn: async () => {
      if (!user || !scheduleId) return [];

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('weekday')
        .order('start_time');

      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!user && !!scheduleId,
  });
}

export function useUpdateScheduleAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { 
      scheduleId: string; 
      slots: { weekday: number; start_time: number; end_time: number }[] 
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing availability for this schedule
      await supabase
        .from('availability')
        .delete()
        .eq('schedule_id', data.scheduleId)
        .eq('user_id', user.id);

      // Insert new availability
      if (data.slots.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(
            data.slots.map(slot => ({
              user_id: user.id,
              schedule_id: data.scheduleId,
              weekday: slot.weekday,
              start_time: slot.start_time,
              end_time: slot.end_time,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-availability', variables.scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

// Hook to get availability for booking (by schedule or default)
export function useBookingAvailability(hostId: string | undefined, scheduleId: string | null | undefined) {
  return useQuery({
    queryKey: ['booking-availability', hostId, scheduleId],
    queryFn: async () => {
      if (!hostId) return [];

      let query = supabase
        .from('availability')
        .select('*')
        .eq('user_id', hostId)
        .order('weekday')
        .order('start_time');

      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      } else {
        // Get default schedule's availability
        const { data: defaultSchedule } = await supabase
          .from('availability_schedules')
          .select('id')
          .eq('user_id', hostId)
          .eq('is_default', true)
          .maybeSingle();

        if (defaultSchedule) {
          query = query.eq('schedule_id', defaultSchedule.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!hostId,
  });
}
