import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Booking {
  id: string;
  event_type_id: string;
  host_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_timezone: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'pending';
  notes: string | null;
  reschedule_token: string | null;
  cancel_token: string | null;
  google_event_id?: string | null;
  meet_link?: string | null;
  created_at: string;
  updated_at: string;
  event_type?: {
    title: string;
    duration: number;
    location_type: string;
    description?: string;
  };
}

export function useBookings(filter?: 'upcoming' | 'past' | 'cancelled') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookings', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('bookings')
        .select(`
          *,
          event_type:event_types(title, duration, location_type, description)
        `)
        .eq('host_id', user.id)
        .order('start_time', { ascending: filter !== 'past' });

      const now = new Date().toISOString();

      if (filter === 'upcoming') {
        query = query.gte('start_time', now).neq('status', 'cancelled');
      } else if (filter === 'past') {
        query = query.lt('start_time', now).neq('status', 'cancelled');
      } else if (filter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });
}

export function useBookingById(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          event_type:event_types(title, duration, location_type, description)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Booking | null;
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      event_type_id: string;
      host_id: string;
      attendee_name: string;
      attendee_email: string;
      attendee_timezone: string;
      start_time: string;
      end_time: string;
      notes?: string;
    }) => {
      // Get event type details
      const { data: eventType } = await supabase
        .from('event_types')
        .select('title, duration, location_type')
        .eq('id', data.event_type_id)
        .single();

      // Get host profile for name
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', data.host_id)
        .single();

      // Check if host has Google Calendar integration
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', data.host_id)
        .eq('provider', 'google')
        .maybeSingle();

      let googleEventId: string | null = null;
      let meetLink: string | null = null;

      // Create Google Calendar event with Meet link if integrated
      if (integration && eventType?.location_type === 'google_meet') {
        try {
          const { data: calendarResult, error: calendarError } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create-event',
              userId: data.host_id,
              eventData: {
                title: eventType.title,
                description: `Meeting with ${data.attendee_name}\n\nNotes: ${data.notes || 'None'}`,
                startTime: data.start_time,
                endTime: data.end_time,
                timezone: data.attendee_timezone,
                attendees: [data.attendee_email],
                createMeet: true,
              },
            },
          });

          if (!calendarError && calendarResult?.event) {
            googleEventId = calendarResult.event.id;
            meetLink = calendarResult.event.hangoutLink;
          }
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
        }
      }

      // Create booking in database
      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          ...data,
          google_event_id: googleEventId,
          meet_link: meetLink,
        })
        .select(`
          *,
          event_type:event_types(title, duration, location_type, description)
        `)
        .single();

      if (error) throw error;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: {
            type: 'confirmation',
            bookingId: newBooking.id,
            recipientEmail: data.attendee_email,
            recipientName: data.attendee_name,
            hostName: hostProfile?.name || 'Host',
            eventTitle: eventType?.title || 'Meeting',
            startTime: data.start_time,
            endTime: data.end_time,
            timezone: data.attendee_timezone,
            meetLink: meetLink,
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      return { ...newBooking, meet_link: meetLink } as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: Booking) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      // Send cancellation email
      try {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', booking.host_id)
          .single();

        await supabase.functions.invoke('send-booking-email', {
          body: {
            type: 'cancellation',
            bookingId: booking.id,
            recipientEmail: booking.attendee_email,
            recipientName: booking.attendee_name,
            hostName: hostProfile?.name || 'Host',
            eventTitle: booking.event_type?.title || 'Meeting',
            startTime: booking.start_time,
            endTime: booking.end_time,
            timezone: booking.attendee_timezone,
          }
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
