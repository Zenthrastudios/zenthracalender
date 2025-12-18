import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventType {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  buffer_before: number;
  buffer_after: number;
  location_type: string;
  location_value: string | null;
  is_active: boolean;
  minimum_notice: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export function useEventTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['event-types', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EventType[];
    },
    enabled: !!user,
  });
}

export function useEventTypeBySlug(username: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['event-type', username, slug],
    queryFn: async () => {
      if (!username || !slug) return null;

      // First get the profile by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .eq('username', username)
        .maybeSingle();

      if (profileError || !profile) return null;

      // Then get the event type
      const { data: eventType, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !eventType) return null;

      return {
        eventType: eventType as EventType,
        host: {
          id: profile.user_id,
          name: profile.name,
          username,
          avatar_url: profile.avatar_url,
        }
      };
    },
    enabled: !!username && !!slug,
  });
}

export function useCreateEventType() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<EventType, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: newEventType, error } = await supabase
        .from('event_types')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newEventType as EventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<EventType> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('event_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as EventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
}

export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
    },
  });
}
