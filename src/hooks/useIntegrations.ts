import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: string;
  provider_email: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useIntegrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['integrations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_integrations')
        .select('id, user_id, provider, provider_email, token_expires_at, scopes, created_at, updated_at')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserIntegration[];
    },
    enabled: !!user,
  });
}

export function useConnectGoogle() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const redirectUrl = `${window.location.origin}/dashboard/apps?connected=google`;

      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: { userId: user.id, redirectUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.authUrl as string;
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (provider: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('google-disconnect', {
        body: { userId: user.id, provider },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useGoogleCalendar() {
  const { user } = useAuth();

  const listEvents = async () => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'list-events', userId: user.id },
    });

    if (error) throw error;
    return data;
  };

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone?: string;
    attendees?: string[];
    createMeet?: boolean;
  }) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'create-event', userId: user.id, eventData },
    });

    if (error) throw error;
    return data;
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'delete-event', userId: user.id, eventData: { eventId } },
    });

    if (error) throw error;
    return data;
  };

  const checkAvailability = async (startTime: string, endTime: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'check-availability', userId: user.id, eventData: { startTime, endTime } },
    });

    if (error) throw error;
    return data;
  };

  return { listEvents, createEvent, deleteEvent, checkAvailability };
}
