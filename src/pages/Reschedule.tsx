import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, isBefore, startOfDay, isToday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendWhatsAppNotification } from '@/utils/whatsapp';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  label: string;
}

export default function Reschedule() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRescheduled, setIsRescheduled] = useState(false);

  // Fetch booking by reschedule token
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ['reschedule-booking', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          event_type:event_types(
            id, title, duration, location_type, location_value, 
            buffer_before, buffer_after, minimum_notice, user_id, schedule_id
          )
        `)
        .eq('reschedule_token', token)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Fetch host profile
  const { data: hostProfile } = useQuery({
    queryKey: ['host-profile', booking?.host_id],
    queryFn: async () => {
      if (!booking?.host_id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', booking.host_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!booking?.host_id,
  });

  // Fetch host availability based on event type's schedule
  const scheduleId = (booking?.event_type as any)?.schedule_id;
  const { data: availability = [] } = useQuery({
    queryKey: ['host-availability', booking?.host_id, scheduleId],
    queryFn: async () => {
      if (!booking?.host_id) return [];

      let query = supabase
        .from('availability')
        .select('*')
        .eq('user_id', booking.host_id);

      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      } else {
        // Get default schedule's availability
        const { data: defaultSchedule } = await supabase
          .from('availability_schedules')
          .select('id')
          .eq('user_id', booking.host_id)
          .eq('is_default', true)
          .maybeSingle();

        if (defaultSchedule) {
          query = query.eq('schedule_id', defaultSchedule.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking?.host_id,
  });

  // Fetch existing bookings for the host
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['host-bookings', booking?.host_id, selectedDate],
    queryFn: async () => {
      if (!booking?.host_id || !selectedDate) return [];

      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('host_id', booking.host_id)
        .eq('status', 'confirmed')
        .neq('id', booking.id) // Exclude current booking
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!booking?.host_id && !!selectedDate,
  });

  // Calculate available time slots
  const getAvailableSlots = (): TimeSlot[] => {
    if (!selectedDate || !booking?.event_type) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(a => a.weekday === dayOfWeek);

    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const duration = booking.event_type.duration;
    const minimumNotice = booking.event_type.minimum_notice || 60;
    const now = new Date();

    dayAvailability.forEach(avail => {
      let currentMinutes = avail.start_time;

      while (currentMinutes + duration <= avail.end_time) {
        const slotDate = new Date(selectedDate);
        slotDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

        // Check minimum notice
        const minutesUntilSlot = (slotDate.getTime() - now.getTime()) / 60000;
        if (minutesUntilSlot < minimumNotice) {
          currentMinutes += 15;
          continue;
        }

        // Check for conflicts
        const slotEnd = new Date(slotDate.getTime() + duration * 60000);
        const hasConflict = existingBookings.some(b => {
          const bookingStart = new Date(b.start_time);
          const bookingEnd = new Date(b.end_time);
          return (slotDate < bookingEnd && slotEnd > bookingStart);
        });

        if (!hasConflict) {
          slots.push({
            time: slotDate.toISOString(),
            label: format(slotDate, 'h:mm a'),
          });
        }

        currentMinutes += 15;
      }
    });

    return slots;
  };

  const availableSlots = getAvailableSlots();

  // Check if date has availability
  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    const hasAvailability = availability.some(a => a.weekday === dayOfWeek);
    const isPast = isBefore(date, startOfDay(new Date()));
    return hasAvailability && !isPast;
  };

  // Handle reschedule
  const handleReschedule = async () => {
    if (!selectedTime || !booking?.event_type) return;

    setIsSubmitting(true);

    try {
      const startTime = new Date(selectedTime);
      const endTime = new Date(startTime.getTime() + booking.event_type.duration * 60000);

      // Update booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: {
            type: 'confirmation',
            bookingId: booking.id,
            recipientEmail: booking.attendee_email,
            recipientName: booking.attendee_name,
            hostName: hostProfile?.name || 'Host',
            eventTitle: booking.event_type.title,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            timezone: booking.attendee_timezone,
            meetingLink: booking.meet_link,
            notes: booking.notes,
          }
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      // Send WhatsApp reschedule
      if (booking.attendee_phone) {
        await sendWhatsAppNotification(booking.host_id, 'reschedule', booking.attendee_phone, {
          ...booking,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          host_name: hostProfile?.name || 'Host'
        });
      }

      setIsRescheduled(true);
      toast.success('Booking rescheduled successfully!');
    } catch (error: any) {
      console.error('Reschedule error:', error);
      toast.error(error.message || 'Failed to reschedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Reschedule Link</h2>
            <p className="text-muted-foreground mb-4">
              This reschedule link is invalid or has expired. Please contact the host for a new link.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Cancelled</h2>
            <p className="text-muted-foreground">
              This booking has been cancelled and cannot be rescheduled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRescheduled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Rescheduled!</h2>
            <p className="text-muted-foreground mb-6">
              Your booking has been rescheduled. A confirmation email has been sent.
            </p>
            <div className="p-4 bg-muted/50 rounded-lg text-left mb-6">
              <p className="font-medium">{booking.event_type?.title}</p>
              <p className="text-sm text-muted-foreground">
                {selectedTime && format(new Date(selectedTime), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedTime && format(new Date(selectedTime), 'h:mm a')} ({booking.attendee_timezone})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Left Sidebar - Event Info */}
              <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-border lg:w-[280px] lg:shrink-0">
                {hostProfile && (
                  <div className="flex items-center gap-3 mb-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={hostProfile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {hostProfile.name?.charAt(0) || 'H'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{hostProfile.name}</p>
                      <p className="text-sm text-muted-foreground">@{hostProfile.username}</p>
                    </div>
                  </div>
                )}

                <h1 className="text-xl font-bold mb-4">{booking.event_type?.title}</h1>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{booking.event_type?.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLocationIcon(booking.event_type?.location_type || 'google_meet')}
                    <span className="capitalize">
                      {booking.event_type?.location_type?.replace('_', ' ') || 'Google Meet'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Current Booking</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Right Side - Calendar & Times */}
              <div className="p-4 sm:p-6 flex-1 min-w-0">
                <h2 className="text-lg font-semibold mb-4">Select a new date & time</h2>

                <div className="flex flex-col gap-6">
                  {/* Calendar */}
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      disabled={(date) => !isDateAvailable(date)}
                      className="rounded-lg border"
                      fromDate={new Date()}
                      toDate={addDays(new Date(), 60)}
                    />
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div>
                      <p className="text-sm font-medium mb-3">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </p>
                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto pr-1">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={cn(
                                "px-3 py-2.5 text-sm rounded-lg border transition-colors",
                                selectedTime === slot.time
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted border-border"
                              )}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No available times for this date
                        </p>
                      )}
                    </div>
                  )}

                  {!selectedDate && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      Select a date to see available times
                    </div>
                  )}
                </div>

                {/* Confirm Button */}
                {selectedTime && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {format(new Date(selectedTime), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedTime), 'h:mm a')} ({booking.attendee_timezone})
                        </p>
                      </div>
                      <Button onClick={handleReschedule} disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Rescheduling...
                          </>
                        ) : (
                          'Confirm Reschedule'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}