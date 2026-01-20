import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendWhatsAppNotification } from '@/utils/whatsapp';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  ChevronRight,
  Globe,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserBranding } from '@/hooks/useProfile';

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

  const { data: branding } = useUserBranding(hostProfile?.user_id);
  const accentColor = branding?.is_enabled && branding?.brand_color ? branding.brand_color : "#FF9124";

  // Fetch host availability
  const scheduleId = (booking?.event_type as any)?.schedule_id;
  const { data: availability = [] } = useQuery({
    queryKey: ['host-availability', booking?.host_id, scheduleId],
    queryFn: async () => {
      if (!booking?.host_id) return [];

      let query = (supabase as any)
        .from('availability')
        .select('*')
        .eq('user_id', booking.host_id);

      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      } else {
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

  // Fetch existing bookings
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
        .neq('id', booking.id)
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
    const dayAvailability = availability.filter((a: any) => a.weekday === dayOfWeek);

    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const duration = booking.event_type.duration;
    const minimumNotice = booking.event_type.minimum_notice || 60;
    const now = new Date();

    dayAvailability.forEach((avail: any) => {
      let currentMinutes = avail.start_time;

      while (currentMinutes + duration <= avail.end_time) {
        const slotDate = new Date(selectedDate);
        slotDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

        const minutesUntilSlot = (slotDate.getTime() - now.getTime()) / 60000;
        if (minutesUntilSlot < minimumNotice) {
          currentMinutes += 15;
          continue;
        }

        const slotEnd = new Date(slotDate.getTime() + duration * 60000);
        const hasConflict = existingBookings.some((b: any) => {
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

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    const hasAvailability = availability.some((a: any) => a.weekday === dayOfWeek);
    const isPast = isBefore(date, startOfDay(new Date()));
    return hasAvailability && !isPast;
  };

  const handleReschedule = async () => {
    if (!selectedTime || !booking?.event_type) return;

    setIsSubmitting(true);

    try {
      const startTime = new Date(selectedTime);
      const endTime = new Date(startTime.getTime() + booking.event_type.duration * 60000);

      const { error: updateError } = await (supabase as any)
        .from('bookings')
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
          reminder_sent: false,
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Email Notification
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: {
            type: 'reschedule',
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
            hostId: booking.host_id,
          }
        });
      } catch (emailError) {
        console.error('Failed to send reschedule email:', emailError);
      }

      // Customer WhatsApp (Using the secure edge function call)
      if (booking.attendee_phone) {
        await sendWhatsAppNotification(booking.host_id, 'reschedule', booking.attendee_phone, {
          ...booking,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          host_name: hostProfile?.name || 'Host'
        });
      }

      // Instructor/Host Notification
      try {
        const eventType = booking.event_type as any;
        let instructorPhone: string | null = null;

        if (eventType.instructor_id) {
          const { data: instructor } = await supabase
            .from('instructors')
            .select('phone')
            .eq('id', eventType.instructor_id)
            .maybeSingle();
          instructorPhone = instructor?.phone || null;
        }

        if (!instructorPhone && hostProfile?.phone) {
          instructorPhone = hostProfile.phone;
        }

        if (instructorPhone) {
          await sendWhatsAppNotification(booking.host_id, 'reschedule_instructor', instructorPhone, {
            ...booking,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            host_name: hostProfile?.name || 'Host',
            attendee_name: booking.attendee_name,
          });
        }
      } catch (instructorNotifyError) {
        console.error('Failed to send instructor reschedule notification:', instructorNotifyError);
      }

      setIsRescheduled(true);
      toast.success('Successfully rescheduled!');
    } catch (error: any) {
      console.error('Reschedule error:', error);
      toast.error(error.message || 'Failed to reschedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const LocationIconComponent = (type: string) => {
    switch (type) {
      case 'google_meet': return Video;
      case 'zoom': return Video;
      case 'phone': return Phone;
      case 'in_person': return MapPin;
      default: return Video;
    }
  };

  const getLocationLabel = (type: string) => {
    switch (type) {
      case 'google_meet': return 'Google Meet';
      case 'zoom': return 'Zoom';
      case 'phone': return 'Phone Call';
      case 'in_person': return 'In Person';
      default: return 'Video Call';
    }
  };

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" style={{ borderTopColor: accentColor }}></div>
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-3">Invalid Link</h1>
          <p className="text-muted-foreground mb-6 text-sm">This reschedule link is invalid or has expired.</p>
          <Button onClick={() => navigate('/')} className="w-full">Go Home</Button>
        </div>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-6 mx-auto">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-3">Booking Cancelled</h1>
          <p className="text-muted-foreground mb-6 text-sm">This booking has been cancelled and cannot be rescheduled.</p>
          <Button onClick={() => navigate('/')} className="w-full">Go Home</Button>
        </div>
      </div>
    );
  }

  if (isRescheduled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="bg-card rounded-xl border border-border p-12 max-w-md w-full animate-in zoom-in-95 duration-500">
          <div className="mb-6 mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${accentColor}, #FF5C00)` }}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Rescheduled!</h1>
          <p className="text-muted-foreground mb-8">Your meeting time has been updated successfully.</p>

          <div className="bg-muted/50 rounded-lg p-6 border border-border text-left mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Time</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {selectedTime && format(new Date(selectedTime), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-base text-muted-foreground">
              {selectedTime && format(new Date(selectedTime), 'h:mm a')}
            </p>
          </div>

          <Button onClick={() => navigate(`/booking/confirmed/${booking.id}`)} className="w-full h-12 text-base" style={{ background: accentColor, color: '#fff' }}>
            View Details
          </Button>
        </div>
      </div>
    );
  }

  const LocationIcon = LocationIconComponent(booking.event_type?.location_type || 'google_meet');

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: accentColor }}>
            {branding?.is_enabled && branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={branding.brand_name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-lg">{(branding?.brand_name || 'C')?.charAt(0)}</span>
            )}
          </div>
          <span className="font-semibold text-lg text-foreground">{branding?.is_enabled ? branding.brand_name : 'CalSchedule'}</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10">
            <RefreshCw className="w-6 h-6 text-primary" style={{ color: accentColor }} />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-3">Reschedule Meeting</h1>
          <p className="text-muted-foreground">Select a new date and time with <span className="font-medium text-foreground">{hostProfile?.name || 'the host'}</span></p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left Sidebar: Current Booking Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-14 w-14 rounded-full border border-border">
                    <AvatarImage src={hostProfile?.avatar_url || ''} className="rounded-full object-cover" />
                    <AvatarFallback>{hostProfile?.name?.charAt(0) || 'H'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-lg">{hostProfile?.name}</p>
                    <p className="text-sm text-muted-foreground">@{hostProfile?.username}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Current Booking</p>
                    <p className="font-medium text-foreground mb-1">{booking.event_type?.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{booking.event_type?.duration} min</span>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <p className="text-sm font-medium text-foreground line-through opacity-70">
                        {format(new Date(booking.start_time), 'EEE, MMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-xs text-orange-500 font-medium mt-1">Rescheduling</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <LocationIcon className="w-4 h-4" />
                    <span>{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content: Calendar & Slots */}
          <div className="lg:col-span-8">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Calendar Column */}
                <div className="p-6 flex flex-col items-center">
                  <h3 className="font-medium text-foreground mb-4 w-full text-center">Select Date</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    disabled={(date) => !isDateAvailable(date)}
                    className="rounded-lg border border-border p-3"
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 60)}
                  />
                </div>

                {/* Time Slots Column */}
                <div className="p-6 bg-muted/10 min-h-[400px] flex flex-col">
                  {selectedDate ? (
                    <>
                      <div className="mb-4 pb-4 border-b border-border">
                        <h3 className="font-medium text-foreground">
                          {format(selectedDate, 'EEEE, MMMM d')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {availableSlots.length} slots available
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[350px]">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((slot) => (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={cn(
                                "w-full px-4 py-3 rounded-md text-sm font-medium border transition-all flex items-center justify-between group",
                                selectedTime === slot.time
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                              style={selectedTime === slot.time ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                            >
                              <span>{slot.label}</span>
                              {selectedTime === slot.time && <CheckCircle className="w-4 h-4" />}
                            </button>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            No slots available
                          </div>
                        )}
                      </div>

                      {selectedTime && (
                        <div className="mt-6 pt-4 border-t border-border">
                          <Button
                            onClick={handleReschedule}
                            disabled={isSubmitting}
                            className="w-full text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Confirming...
                              </>
                            ) : (
                              'Confirm new time'
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <CalendarIcon className="w-12 h-12 mb-4 opacity-10" />
                      <p>Select a date to view available times</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
