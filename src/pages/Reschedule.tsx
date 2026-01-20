import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, addDays, isBefore, startOfDay, isToday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendWhatsAppNotification } from '@/utils/whatsapp';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  ChevronRight,
  Globe,
  User,
  ExternalLink,
  ArrowRight
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

  // Fetch host availability based on event type's schedule
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

        // Check minimum notice
        const minutesUntilSlot = (slotDate.getTime() - now.getTime()) / 60000;
        if (minutesUntilSlot < minimumNotice) {
          currentMinutes += 15;
          continue;
        }

        // Check for conflicts
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

  // Check if date has availability
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

      if (booking.attendee_phone) {
        await sendWhatsAppNotification(booking.host_id, 'reschedule', booking.attendee_phone, {
          ...booking,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          host_name: hostProfile?.name || 'Host'
        });
      }

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

  const getLocationIconComponent = (type: string) => {
    switch (type) {
      case 'google_meet':
      case 'zoom':
        return Video;
      case 'phone':
        return Phone;
      case 'in_person':
        return MapPin;
      default:
        return Video;
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
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin" style={{ borderTopColor: accentColor }}></div>
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6 text-center">
        <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-12 max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-4">Invalid Link</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">This reschedule link is invalid or has expired.</p>
          <Button onClick={() => navigate('/')} className="w-full h-14 rounded-2xl font-bold bg-white text-black hover:bg-gray-200">Go Home</Button>
        </div>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6 text-center">
        <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-12 max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 mx-auto">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-4">Booking Cancelled</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">This booking has been cancelled and cannot be rescheduled.</p>
          <Button onClick={() => navigate('/')} className="w-full h-14 rounded-2xl font-bold bg-white text-black hover:bg-gray-200">Go Home</Button>
        </div>
      </div>
    );
  }

  if (isRescheduled) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6 text-center">
        <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-12 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse" style={{ background: accentColor }}></div>
            <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 shadow-2xl" style={{ background: `linear-gradient(135deg, ${accentColor}, #FF5C00)` }}>
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Rescheduled!</h1>
          <p className="text-gray-500 mb-10 leading-relaxed font-medium">Your meeting time has been updated successfully. A new confirmation has been sent to your email.</p>

          <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 text-left mb-10">
            <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">NEW SCHEDULE</p>
            <p className="text-xl font-black text-white mb-1">{booking.event_type?.title}</p>
            <div className="flex items-center gap-2 text-gray-400 font-bold">
              <span>{selectedTime && format(new Date(selectedTime), 'EEEE, MMM d, yyyy')}</span>
              <span className="text-gray-800">|</span>
              <span className="text-white">{selectedTime && format(new Date(selectedTime), 'h:mm a')}</span>
            </div>
          </div>

          <Button onClick={() => navigate(`/booking/confirmed/${booking.id}`)} className="w-full h-14 rounded-2xl font-black text-lg transition-all active:scale-95" style={{ background: accentColor, color: '#000' }}>
            View Booking Details
          </Button>
        </div>
      </div>
    );
  }

  const LocationIcon = getLocationIconComponent(booking.event_type?.location_type || 'google_meet');

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white selection:bg-primary/30 pb-20">
      {/* Dynamic Background Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] opacity-[0.03] blur-[120px] pointer-events-none rounded-full"
        style={{ background: accentColor }}
      ></div>

      {/* Header */}
      <header className="w-full px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#0B0B0F]/80">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: accentColor }}
          >
            {branding?.is_enabled && branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={branding.brand_name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-xl">{(branding?.brand_name || 'C')?.charAt(0)}</span>
            )}
          </div>
          <span className="font-bold text-xl tracking-tight text-white">{branding?.is_enabled ? branding.brand_name : 'CalSchedule'}</span>
        </Link>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-gray-400 font-bold hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Reschedule Meeting</h1>
          <p className="text-gray-500 font-medium">Select a new date and time for your session with {hostProfile?.name || 'the host'}.</p>
        </div>

        {/* 3-Column Booking Card - Premium Dark */}
        <div className="bg-[#1C1C1E] rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5">

            {/* Column 1: Host Info */}
            <div className="lg:col-span-3 p-8 lg:p-10 space-y-10">
              <div className="space-y-6">
                <Avatar className="h-24 w-24 rounded-[2rem] border-4 border-white/5 p-1 bg-[#0B0B0F]">
                  <AvatarImage src={hostProfile?.avatar_url || ''} className="rounded-[1.8rem] object-cover" />
                  <AvatarFallback className="bg-white/5 text-white font-bold text-3xl">
                    {hostProfile?.name?.charAt(0) || 'H'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">{hostProfile?.name || 'Host'}</h2>
                  <p className="text-gray-500 font-bold">@{hostProfile?.username || 'username'}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">CURRENT BOOKING</p>
                  <div className="bg-white/[0.02] rounded-3xl p-5 border border-white/5 group">
                    <p className="text-lg font-black text-white mb-1 truncate">{booking.event_type?.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{booking.event_type?.duration} minutes</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 space-y-1">
                      <p className="text-sm font-bold text-gray-400">{format(new Date(booking.start_time), 'EEE, MMM d, yyyy')}</p>
                      <p className="text-sm font-black text-white">{format(new Date(booking.start_time), 'h:mm a')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                      <LocationIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="text-sm font-bold">{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                      <Globe className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="text-sm font-bold truncate uppercase tracking-tighter">({booking.attendee_timezone?.replace('_', ' ').split('/').pop()})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Calendar */}
            <div className="lg:col-span-5 p-4 lg:p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Select Date</h3>
                  <p className="text-sm text-gray-500 font-medium">Available dates are highlighted</p>
                </div>
              </div>

              <div className="reschedule-calendar-container flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  disabled={(date) => !isDateAvailable(date)}
                  className="rounded-[2rem] border-none p-4"
                  fromDate={new Date()}
                  toDate={addDays(new Date(), 60)}
                />
              </div>
            </div>

            {/* Column 3: Time Slots */}
            <div className="lg:col-span-4 p-8 lg:p-10 flex flex-col">
              {selectedDate ? (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-gray-500">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-tighter">{format(selectedDate, 'EEE, MMM d')}</h3>
                      <p className="text-sm text-gray-500 font-medium">Choose a convenient slot</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={cn(
                            "w-full group relative h-16 rounded-[1.25rem] border-2 transition-all duration-300 flex items-center px-6 overflow-hidden",
                            selectedTime === slot.time
                              ? "bg-white border-white scale-[1.02]"
                              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                          )}
                        >
                          {selectedTime === slot.time && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: accentColor }}></div>
                          )}
                          <div className="flex-1 text-left">
                            <span className={cn(
                              "text-lg font-black transition-colors duration-300",
                              selectedTime === slot.time ? "text-black" : "text-white"
                            )}>
                              {slot.label}
                            </span>
                          </div>
                          {selectedTime === slot.time ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-black">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-gray-600 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p className="font-bold">No slots available</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Button */}
                  {selectedTime && (
                    <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                      <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">SELECTED TIME</p>
                        <p className="text-lg font-black text-white">{format(new Date(selectedTime), 'h:mm a, MMMM d')}</p>
                      </div>

                      <Button
                        onClick={handleReschedule}
                        disabled={isSubmitting}
                        className="w-full h-16 rounded-[1.25rem] font-black text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                        style={{ background: accentColor, color: '#000' }}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Rescheduling...
                          </>
                        ) : (
                          <>
                            Confirm Reschedule
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-[2rem] bg-white/[0.01] border border-white/5 flex items-center justify-center mb-6 text-gray-700">
                    <CalendarIcon className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-500 mb-2">Select a Date</h3>
                  <p className="text-sm text-gray-600 font-medium">Pick a date on the calendar to see available time slots.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 pt-12 border-t border-white/5 flex flex-col items-center gap-8">
          <div className="flex items-center gap-1 opacity-20">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Powerhouse Technology</span>
            <span className="text-xs font-black text-white">CalSchedule</span>
          </div>
        </div>
      </main>
    </div>
  );
}
