import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendWhatsAppNotification } from '@/utils/whatsapp';

export interface CustomResponse {
  fieldId: string;
  label: string;
  value: string | boolean;
  type: string;
}

export interface Booking {
  id: string;
  event_type_id: string;
  host_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string | null;
  attendee_timezone: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'pending';
  notes: string | null;
  custom_responses: CustomResponse[] | null;
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
  is_rescheduled?: boolean;
}

export function useBookings(filter?: 'upcoming' | 'past' | 'cancelled' | 'rescheduled') {
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
      } else if (filter === 'rescheduled') {
        query = query.eq('is_rescheduled', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        custom_responses: (item.custom_responses as unknown as CustomResponse[]) || [],
      })) as Booking[];
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
          event_type:event_types(
            title, 
            duration, 
            location_type, 
            description,
            instructor:instructors(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        custom_responses: (data.custom_responses as unknown as CustomResponse[]) || [],
      } as Booking & { event_type: { instructor: import('@/integrations/supabase/types').Tables<'instructors'> | null } };
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
      attendee_phone?: string;
      attendee_timezone: string;
      start_time: string;
      end_time: string;
      notes?: string;
      custom_responses?: CustomResponse[];
    }) => {
      // Get event type details
      const { data: eventType } = await supabase
        .from('event_types')
        .select('title, duration, location_type, instructor_id')
        .eq('id', data.event_type_id)
        .single();

      // Get host profile for name
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', data.host_id)
        .single();

      let googleEventId: string | null = null;
      let meetLink: string | null = null;

      // Create Google Calendar event with Meet link if integrated
      if (eventType?.location_type === 'google_meet') {
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
            meetLink =
              calendarResult.event.hangoutLink ||
              calendarResult.event.conferenceData?.entryPoints?.find(
                (ep: { entryPointType?: string; uri?: string }) => ep.entryPointType === 'video' && !!ep.uri
              )?.uri ||
              null;
          }
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
        }
      }

      // Create booking in database
      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          event_type_id: data.event_type_id,
          host_id: data.host_id,
          attendee_name: data.attendee_name,
          attendee_email: data.attendee_email,
          attendee_phone: data.attendee_phone,
          attendee_timezone: data.attendee_timezone,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes,
          custom_responses: (data.custom_responses || []) as unknown as import('@/integrations/supabase/types').Json,
          google_event_id: googleEventId,
          meet_link: meetLink,
        })
        .select(`
          *,
          event_type:event_types(title, duration, location_type, description)
        `)
        .single();

      if (error) throw error;

      // Fetch branding settings for email
      const { data: branding } = await (supabase as any)
        .from('branding_settings')
        .select('site_url, brand_name, brand_logo_url, brand_color, is_enabled')
        .eq('user_id', data.host_id)
        .maybeSingle();

      // Prepare notification promises
      const notifications = [];

      // 1. Email Notification
      notifications.push(
        supabase.functions.invoke('send-booking-email', {
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
            meetingLink: meetLink,
            siteUrl: branding?.site_url,
            branding: branding?.is_enabled ? {
              brandName: branding.brand_name,
              brandLogoUrl: branding.brand_logo_url,
              brandColor: branding.brand_color,
              isEnabled: branding.is_enabled
            } : undefined
          }
        }).catch(err => console.error('Failed to send confirmation email:', err))
      );

      // 2. Customer WhatsApp
      if (data.attendee_phone) {
        notifications.push(
          sendWhatsAppNotification(data.host_id, 'customer', data.attendee_phone, {
            ...newBooking,
            host_name: hostProfile?.name || 'Host',
            meet_link: meetLink
          }).catch(err => console.error('Failed to send customer WhatsApp:', err))
        );
      }

      // 3. Instructor/Host WhatsApp
      // Fetch phone number first
      const getInstructorPhone = async () => {
        let instructorPhone = null;
        if (eventType?.instructor_id) {
          const { data: instr } = await supabase
            .from('instructors')
            .select('phone')
            .eq('id', eventType.instructor_id)
            .maybeSingle();
          instructorPhone = instr?.phone;
        }

        if (!instructorPhone) {
          const { data: hostProfileDetails } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', data.host_id)
            .maybeSingle();
          instructorPhone = hostProfileDetails?.phone;
        }
        return instructorPhone;
      };

      notifications.push(
        getInstructorPhone().then(phone => {
          if (phone) {
            return sendWhatsAppNotification(data.host_id, 'instructor', phone, {
              ...newBooking,
              host_name: hostProfile?.name || 'Host',
              meet_link: meetLink
            });
          }
        }).catch(err => console.error('Failed to send instructor WhatsApp:', err))
      );

      // Execute all notifications in parallel without blocking response
      await Promise.allSettled(notifications);

      return {
        ...newBooking,
        meet_link: meetLink,
        custom_responses: (newBooking.custom_responses as unknown as CustomResponse[]) || [],
      } as Booking;
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

        // Fetch branding settings
        const { data: branding } = await (supabase as any)
          .from('branding_settings')
          .select('site_url, brand_name, brand_logo_url, brand_color, is_enabled')
          .eq('user_id', booking.host_id)
          .maybeSingle();

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
            siteUrl: branding?.site_url,
            branding: branding?.is_enabled ? {
              brandName: branding.brand_name,
              brandLogoUrl: branding.brand_logo_url,
              brandColor: branding.brand_color,
              isEnabled: branding.is_enabled
            } : undefined
          }
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
      }

      // Send WhatsApp cancellation
      if (booking.attendee_phone) {
        // Fetch host profile if not already fetched
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', booking.host_id)
          .single();

        await sendWhatsAppNotification(booking.host_id, 'cancellation', booking.attendee_phone, {
          ...booking,
          host_name: hostProfile?.name || 'Host'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
