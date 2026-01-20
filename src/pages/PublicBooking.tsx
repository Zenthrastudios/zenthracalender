import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useEventTypeBySlug } from '@/hooks/useEventTypes';
import { useHostBookingsForDate, useGoogleCalendarConflicts } from '@/hooks/useAvailability';
import { useBookingAvailability } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityOverridesByUserId } from '@/hooks/useAvailabilityOverrides';
import { useCreateBooking } from '@/hooks/useBookings';
import { useTestimonials } from '@/hooks/useTestimonials';
import { sendWhatsAppNotification } from '@/utils/whatsapp';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment, useCreateCashfreeOrder, useVerifyCashfreePayment } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { ThemeToggle } from '@/components/ThemeToggle';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Video, Globe, ChevronLeft, ChevronRight, Calendar, MapPin, Phone, Link as LinkIcon, IndianRupee, CreditCard, Loader2, Star, Instagram, Facebook, Linkedin, Twitter, Youtube, Pin } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isToday, addMinutes, startOfDay, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { COUNTRY_DIAL_CODES } from '@/lib/countryDialCodes';

declare global {
  interface Window {
    Razorpay?: unknown;
    Cashfree?: unknown;
  }
}

interface TimeSlot {
  time: string;
  available: boolean;
  startTime: Date;
  endTime: Date;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

const TIMEZONES = ['Asia/Kolkata'];

const getLocationIcon = (locationType: string) => {
  switch (locationType) {
    case 'google_meet':
    case 'zoom':
      return Video;
    case 'phone':
      return Phone;
    case 'in_person':
      return MapPin;
    default:
      return LinkIcon;
  }
};

const getLocationLabel = (locationType: string) => {
  switch (locationType) {
    case 'google_meet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom';
    case 'phone':
      return 'Phone Call';
    case 'in_person':
      return 'In Person';
    default:
      return 'Online';
  }
};

type SocialLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  pinterest?: string;
};

export default function PublicBookingPage() {
  const { username, eventSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: eventData, isLoading } = useEventTypeBySlug(username, eventSlug);
  const { data: branding } = useBrandingSettings(eventData?.host?.id);

  // Get schedule_id from event type, or use default schedule
  const scheduleId = eventData?.eventType?.schedule_id || null;
  const { data: availability } = useBookingAvailability(eventData?.host?.id, scheduleId);
  const { data: overrides } = useAvailabilityOverridesByUserId(eventData?.host?.id);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone] = useState('Asia/Kolkata');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeeCountryCode, setAttendeeCountryCode] = useState('IN');
  const [attendeePhoneNational, setAttendeePhoneNational] = useState('');
  const [notes, setNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const { data: existingBookings } = useHostBookingsForDate(eventData?.host?.id, selectedDate);
  const { data: googleCalendarConflicts } = useGoogleCalendarConflicts(eventData?.host?.id, selectedDate);
  const createBooking = useCreateBooking();

  // Payment hooks
  const createRazorpayOrder = useCreateRazorpayOrder();
  const verifyRazorpayPayment = useVerifyRazorpayPayment();
  const createCashfreeOrder = useCreateCashfreeOrder();
  const verifyCashfreePayment = useVerifyCashfreePayment();

  // Get custom fields and payment info from event type
  const customFields: CustomField[] = Array.isArray(eventData?.eventType?.custom_fields)
    ? (eventData?.eventType?.custom_fields as unknown as CustomField[])
    : [];
  const isPaidEvent = !!eventData?.eventType?.is_paid;
  const eventPrice = eventData?.eventType?.price || 0;
  const paymentProvider = eventData?.eventType?.payment_provider || 'razorpay';

  const showTestimonials = eventData?.eventType?.show_testimonials ?? true;
  const { data: testimonials } = useTestimonials(eventData?.eventType?.id, { includeHidden: false });

  const socialLinks: SocialLinks = useMemo(() => {
    const incoming = eventData?.eventType?.social_links;
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
      return incoming as unknown as SocialLinks;
    }
    return {};
  }, [eventData?.eventType?.social_links]);

  const normalizeUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  // Load Razorpay/Cashfree script dynamically
  useEffect(() => {
    if (isPaidEvent && paymentProvider === 'razorpay') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
    if (isPaidEvent && paymentProvider === 'cashfree') {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, [isPaidEvent, paymentProvider]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = startOfMonth(currentMonth).getDay();

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const override = overrides?.find(o => o.date === dateStr);

    if (override) {
      if (override.is_unavailable) return [];
      if (override.start_time !== null && override.end_time !== null) {
        return [{
          start_time: override.start_time,
          end_time: override.end_time
        }];
      }
      return [];
    }

    // Fallback to weekly schedule
    const dayOfWeek = date.getDay();
    return availability?.filter(a => a.weekday === dayOfWeek) || [];
  };

  const hasAvailability = (date: Date) => {
    // Past check
    if (isBefore(date, new Date()) && !isToday(date)) return false;

    const schedules = getSchedulesForDate(date);
    if (schedules.length === 0) return false;

    // Minimum notice check
    const minimumNotice = eventData?.eventType?.minimum_notice || 0;
    const earliestTime = addMinutes(new Date(), minimumNotice);

    // Check if any schedule has time after earliest allowed booking time
    return schedules.some(s => {
      const scheduleEnd = new Date(date);
      scheduleEnd.setHours(0, 0, 0, 0); // Reset to start of day
      // Add minutes. end_time is minutes from midnight
      scheduleEnd.setMinutes(s.end_time);

      return isAfter(scheduleEnd, earliestTime);
    });
  };

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate || !eventData?.eventType) return [];

    const dayAvailability = getSchedulesForDate(selectedDate);
    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const now = new Date();
    const eventType = eventData.eventType;
    const duration = eventType.duration;
    const minimumNotice = eventType.minimum_notice || 60; // Default 1 hour
    const bufferBefore = eventType.buffer_before || 0;
    const bufferAfter = eventType.buffer_after || 0;

    dayAvailability.forEach(avail => {
      let currentTime = avail.start_time;
      while (currentTime + duration <= avail.end_time) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
        const slotEnd = addMinutes(slotStart, duration);

        // Check minimum notice - slot must be at least minimumNotice minutes from now
        const minutesUntilSlot = (slotStart.getTime() - now.getTime()) / 60000;
        if (minutesUntilSlot < minimumNotice) {
          currentTime += 30; // Increment by 30 mins (or configurable?)
          continue;
        }

        // Calculate buffered times for conflict checking
        const bufferedStart = addMinutes(slotStart, -bufferBefore);
        const bufferedEnd = addMinutes(slotEnd, bufferAfter);

        // Check existing bookings conflict (with buffer)
        const hasBookingConflict = existingBookings?.some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);

          // Assuming existingBookings are active.
          return bufferedStart < bookingEnd && bufferedEnd > bookingStart;
        });

        // Check Google Calendar conflicts (with buffer)
        const hasGoogleConflict = googleCalendarConflicts?.some((conflict: { start: string; end: string }) => {
          const conflictStart = new Date(conflict.start);
          const conflictEnd = new Date(conflict.end);
          return bufferedStart < conflictEnd && bufferedEnd > conflictStart;
        });

        const isAvailable = !hasBookingConflict && !hasGoogleConflict;

        slots.push({
          time: format(slotStart, 'hh:mma').toLowerCase(),
          available: isAvailable,
          startTime: slotStart,
          endTime: slotEnd,
        });
        currentTime += 30; // 30 min increments
      }
    });

    return slots;
  }, [selectedDate, eventData, availability, existingBookings, googleCalendarConflicts, overrides]);


  const updateCustomFieldValue = (fieldId: string, value: string | boolean) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = () => {
    if (!attendeeName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!attendeeEmail.trim() || !/\S+@\S+\.\S+/.test(attendeeEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    const phoneDigits = attendeePhoneNational.replace(/\D/g, '');
    if (!phoneDigits) {
      toast.error('Please enter your phone number');
      return false;
    }
    if (phoneDigits.length < 6) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.required) {
        const value = customFieldValues[field.id];
        if (field.type === 'checkbox') {
          if (!value) {
            toast.error(`Please check "${field.label}"`);
            return false;
          }
        } else {
          if (!value || (typeof value === 'string' && !value.trim())) {
            toast.error(`Please fill in "${field.label}"`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const buildAttendeePhone = () => {
    const country = COUNTRY_DIAL_CODES.find(c => c.iso2 === attendeeCountryCode);
    if (!country || !attendeePhoneNational) return undefined;

    const dial = country.dialCode.replace(/[^\d+]/g, '');
    const national = attendeePhoneNational.replace(/\D/g, '');
    const normalizedDial = dial.startsWith('+') ? dial : `+${dial}`;
    return `${normalizedDial}${national}`;
  };

  const createBookingAfterPayment = async () => {
    if (!selectedSlot || !eventData) return;

    const customResponses = customFields
      .map(field => {
        const value = customFieldValues[field.id];
        if (value === undefined || value === '' || value === false) return null;
        return {
          fieldId: field.id,
          label: field.label,
          value: field.type === 'checkbox' ? true : value,
          type: field.type,
        };
      })
      .filter(Boolean) as { fieldId: string; label: string; value: string | boolean; type: string }[];

    const booking = await createBooking.mutateAsync({
      event_type_id: eventData.eventType.id,
      host_id: eventData.host.id,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      attendee_phone: buildAttendeePhone(),
      attendee_timezone: timezone,
      start_time: selectedSlot.startTime.toISOString(),
      end_time: selectedSlot.endTime.toISOString(),
      notes: notes || undefined,
      custom_responses: customResponses.length > 0 ? customResponses : undefined,
    });

    toast.success('Booking confirmed!');
    navigate(`/booking/confirmed/${booking.id}`);
  };

  const handleRazorpayPayment = async () => {
    if (!selectedSlot || !eventData) return;

    setIsProcessingPayment(true);
    try {
      const tempBookingId = `temp_${Date.now()}`;
      const amountInPaise = Math.round(eventPrice * 100);
      const orderResult = await createRazorpayOrder.mutateAsync({
        bookingId: tempBookingId,
        amount: amountInPaise,
        customerName: attendeeName,
        customerEmail: attendeeEmail,
        hostId: eventData.host.id,
      });

      const RazorpayCtor = window.Razorpay as unknown as (new (opts: unknown) => { open: () => void });
      const options = {
        key: orderResult.keyId,
        amount: orderResult.amount,
        currency: orderResult.currency,
        name: eventData.eventType.title,
        description: `Booking with ${eventData.host.name}`,
        order_id: orderResult.orderId,
        handler: async function (response: unknown) {
          try {
            const r = response as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
            const verifyResult = await verifyRazorpayPayment.mutateAsync({
              razorpayOrderId: r.razorpay_order_id || '',
              razorpayPaymentId: r.razorpay_payment_id || '',
              razorpaySignature: r.razorpay_signature || '',
            });

            if (verifyResult.verified) {
              setPaymentCompleted(true);
              await createBookingAfterPayment();
            } else {
              toast.error('Payment verification failed. Please try again.');
              if (buildAttendeePhone()) {
                await sendWhatsAppNotification(eventData.host.id, 'payment_failed', buildAttendeePhone()!, {
                  attendee_name: attendeeName,
                  event_type: { title: eventData.eventType.title },
                  start_time: selectedSlot.startTime.toISOString(),
                  host: { username: username, name: eventData.host.name }
                });
              }
            }
          } catch (error) {
            toast.error('Payment verification failed.');
          }
          setIsProcessingPayment(false);
        },
        prefill: {
          name: attendeeName,
          email: attendeeEmail,
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          },
        },
      };

      const razorpay = new RazorpayCtor(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleCashfreePayment = async () => {
    if (!selectedSlot || !eventData) return;

    setIsProcessingPayment(true);
    try {
      const tempBookingId = `temp_${Date.now()}`;
      const orderResult = await createCashfreeOrder.mutateAsync({
        bookingId: tempBookingId,
        amount: eventPrice,
        customerName: attendeeName,
        customerEmail: attendeeEmail,
        returnUrl: window.location.href,
        hostId: eventData.host.id,
      });

      // Use Cashfree Drop-in checkout
      const cashfreeFactory = window.Cashfree as unknown as (opts: { mode: string }) => {
        checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<{ error?: unknown }>;
      };
      const cashfree = cashfreeFactory({
        mode: 'sandbox', // Change to 'production' for live
      });

      cashfree.checkout({
        paymentSessionId: orderResult.paymentSessionId,
        redirectTarget: '_modal',
      }).then(async (result: { error?: unknown }) => {
        if (result.error) {
          toast.error('Payment failed. Please try again.');
          if (buildAttendeePhone()) {
            await sendWhatsAppNotification(eventData.host.id, 'payment_failed', buildAttendeePhone()!, {
              attendee_name: attendeeName,
              event_type: { title: eventData.eventType.title, slug: eventSlug },
              start_time: selectedSlot.startTime.toISOString(),
              host: { username: username, name: eventData.host.name }
            });
          }
          setIsProcessingPayment(false);
          return;
        }

        // Verify payment
        const verifyResult = await verifyCashfreePayment.mutateAsync(orderResult.orderId);
        if (verifyResult.isPaid) {
          setPaymentCompleted(true);
          await createBookingAfterPayment();
        } else {
          toast.error('Payment not completed. Please try again.');
          if (buildAttendeePhone()) {
            await sendWhatsAppNotification(eventData.host.id, 'payment_failed', buildAttendeePhone()!, {
              attendee_name: attendeeName,
              event_type: { title: eventData.eventType.title, slug: eventSlug },
              start_time: selectedSlot.startTime.toISOString(),
              host: { username: username, name: eventData.host.name }
            });
          }
        }
        setIsProcessingPayment(false);
      }).catch(async () => {
        toast.error('Payment was cancelled.');
        if (buildAttendeePhone()) {
          await sendWhatsAppNotification(eventData.host.id, 'payment_failed', buildAttendeePhone()!, {
            attendee_name: attendeeName,
            event_type: { title: eventData.eventType.title, slug: eventSlug },
            start_time: selectedSlot.startTime.toISOString(),
            host: { username: username, name: eventData.host.name }
          });
        }
        setIsProcessingPayment(false);
      });
    } catch (error) {
      console.error('Cashfree payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !eventData) return;

    if (!validateForm()) return;

    // If it's a paid event, initiate payment first
    if (isPaidEvent && eventPrice > 0) {
      if (paymentProvider === 'razorpay') {
        await handleRazorpayPayment();
      } else if (paymentProvider === 'cashfree') {
        await handleCashfreePayment();
      }
    } else {
      // Free event, create booking directly
      try {
        await createBookingAfterPayment();
      } catch (error) {
        toast.error('Failed to create booking. Please try again.');
      }
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>;
  }

  if (!eventData) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Event not found</h1>
        <p className="text-muted-foreground mb-4">This event type doesn't exist or has been disabled.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </div>;
  }

  const LocationIcon = getLocationIcon(eventData.eventType.location_type);

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              value={(value as string) || ''}
              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="bg-background"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={(value as string) || ''}
              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="bg-background min-h-[80px]"
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => updateCustomFieldValue(field.id, v)}
            >
              <SelectTrigger className="bg-background">
                <div className="flex items-center gap-2">
                  <SelectValue placeholder={field.placeholder || 'Select an option'} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => updateCustomFieldValue(field.id, !!checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] selection:bg-primary/30 text-white pb-12">
      {/* Header */}
      <header className="w-full px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#0B0B0F]/80">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: branding?.is_enabled && branding?.brand_color ? branding.brand_color : "#FF9124" }}
          >
            {branding?.is_enabled && branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={branding.brand_name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-xl">{(branding?.brand_name || 'C')?.charAt(0)}</span>
            )}
          </div>
          <span className="font-bold text-xl tracking-tight text-white">{branding?.is_enabled ? branding.brand_name : 'CalSchedule'}</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <span className="text-xs font-medium text-gray-500 tracking-widest uppercase">Powered by CalSchedule</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-[#0F0F11] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden relative">
          {/* Subtle Glow background */}
          <div
            className="absolute top-0 left-0 w-full h-1 opacity-50"
            style={{ background: `linear-gradient(90deg, transparent, ${branding?.is_enabled && branding?.brand_color ? branding.brand_color : "#FF9124"}, transparent)` }}
          ></div>

          {eventData.eventType.banner_image_url && eventData.eventType.banner_image_url.trim() !== '' && (
            <div className="w-full h-56 md:h-64 bg-muted overflow-hidden relative">
              <img
                src={eventData.eventType.banner_image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent"></div>
            </div>
          )}

          <div className="grid lg:grid-cols-[280px_1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            {/* Column 1: Host & Event Info */}
            <div className="p-6 lg:p-8">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 rounded-2xl border border-white/[0.08] bg-[#09090B]">
                    <AvatarImage src={eventData.host?.avatar_url || ''} className="rounded-3xl object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-white/5 text-white">
                      {eventData.host?.name?.charAt(0) || username?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-bold text-white mb-0.5">{eventData.host?.name || username}</p>
                  <p className="text-sm text-gray-400 font-medium">@{username}</p>
                </div>
              </div>

              <div className="mt-6 space-y-1.5">
                <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">{eventData.eventType.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                  {(() => {
                    const LocationIconComponent = getLocationIcon(eventData.eventType.location_type);
                    return <LocationIconComponent className="w-4 h-4" />;
                  })()}
                  <span>{getLocationLabel(eventData.eventType.location_type)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {selectedSlot ? (
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center gap-3 text-white">
                      <Clock className="w-4 h-4 text-primary" style={{ color: branding?.is_enabled && branding?.brand_color ? branding.brand_color : undefined }} />
                      <span className="font-bold">
                        {format(selectedSlot.startTime, 'MMM d, yyyy')} · {format(selectedSlot.startTime, 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <Globe className="w-4 h-4" />
                      <span>Asia/Kolkata (IST)</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-gray-300 font-medium py-1">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <span>{eventData.eventType.duration} Minutes</span>
                    </div>

                    {isPaidEvent && eventPrice > 0 && (
                      <div className="flex items-center gap-4 text-white font-bold py-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <IndianRupee className="w-4 h-4 text-primary" style={{ color: branding?.is_enabled && branding?.brand_color ? branding.brand_color : undefined }} />
                        </div>
                        <span className="text-xl">₹{eventPrice.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {eventData.eventType.description && (
                <div className="mt-8 pt-6 border-t border-white/[0.08]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">About</p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {eventData.eventType.description}
                  </p>
                </div>
              )}

              {/* Social Links Design */}
              {Object.values(socialLinks).some((v) => typeof v === 'string' && v.trim() !== '') && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.website?.trim() && (
                      <a href={normalizeUrl(socialLinks.website)} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                    {socialLinks.instagram?.trim() && (
                      <a href={normalizeUrl(socialLinks.instagram)} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {socialLinks.facebook?.trim() && (
                      <a href={normalizeUrl(socialLinks.facebook)} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {socialLinks.linkedin?.trim() && (
                      <a href={normalizeUrl(socialLinks.linkedin)} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {socialLinks.twitter?.trim() && (
                      <a href={normalizeUrl(socialLinks.twitter)} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Testimonials Design */}
              {showTestimonials && (testimonials || []).length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">What people say</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {(testimonials || []).map((t) => (
                      <div key={t.id} className="relative bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-gray-300">{t.author_name}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn('w-3 h-3', i < t.rating! ? 'text-primary fill-primary' : 'text-gray-700')} style={{ color: i < t.rating! && branding?.brand_color ? branding.brand_color : undefined, fill: i < t.rating! && branding?.brand_color ? branding.brand_color : undefined }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 italic">"{t.content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Calendar */}
            <div className="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="font-semibold text-lg text-white">Select Date</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg border border-white/[0.08] hover:bg-white/[0.05]"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg border border-white/[0.08] hover:bg-white/[0.05]"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="text-sm font-medium text-white">{format(currentMonth, 'MMMM yyyy')}</p>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center text-[10px] text-gray-500 font-black py-2 tracking-tighter">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                {calendarDays.map(date => {
                  const isAvailable = hasAvailability(date);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isPast = isBefore(date, new Date()) && !isToday(date);
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => isAvailable && !isPast && (setSelectedDate(date), setSelectedSlot(null), setShowBookingForm(false))}
                      disabled={!isAvailable || isPast}
                      className={cn(
                        "relative aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
                        isSelected
                          ? "text-white"
                          : isAvailable && !isPast
                            ? "text-gray-300 hover:bg-white/[0.05]"
                            : "text-gray-700 cursor-not-allowed"
                      )}
                    >
                      {isSelected && (
                        <div
                          className="absolute inset-0 rounded-lg"
                          style={{ background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124" }}
                        />
                      )}
                      <span className="relative">{format(date, 'd')}</span>
                      {isAvailable && !isPast && !isSelected && (
                        <div
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{ background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider px-1">Timezone</p>
                <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 font-medium">Asia/Kolkata (IST)</span>
                </div>
              </div>
            </div>

            {/* Column 3: Time Slots / Form */}
            <div className="p-6 lg:p-8">
              {showBookingForm && selectedSlot ? (
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="pb-4 border-b border-white/[0.08]">
                    <h2 className="text-lg font-semibold text-white mb-1">Your Details</h2>
                    <p className="text-sm text-gray-500">Complete the form to confirm your booking</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-400 ml-0.5">Full Name</Label>
                      <Input
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        required
                        className="h-10 rounded-lg bg-white/[0.03] border-white/[0.08] focus:border-white/20 text-white placeholder:text-gray-600 focus:ring-0"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-400 ml-0.5">Email Address</Label>
                      <Input
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        required
                        className="h-10 rounded-lg bg-white/[0.03] border-white/[0.08] focus:border-white/20 text-white placeholder:text-gray-600 focus:ring-0"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-400 ml-0.5">Phone Number</Label>
                      <div className="flex gap-2">
                        <Select value={attendeeCountryCode} onValueChange={setAttendeeCountryCode}>
                          <SelectTrigger className="w-[85px] h-10 rounded-lg bg-white/[0.03] border-white/[0.08] focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0F0F11] border-white/[0.08] text-white">
                            {COUNTRY_DIAL_CODES.map((c) => (
                              <SelectItem key={c.iso2} value={c.iso2}>{c.iso2}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="tel"
                          value={attendeePhoneNational}
                          onChange={(e) => setAttendeePhoneNational(e.target.value)}
                          required
                          className="h-10 rounded-lg bg-white/[0.03] border-white/[0.08] focus:border-white/20 text-white placeholder:text-gray-600 flex-1 focus:ring-0"
                          placeholder="1234567890"
                        />
                      </div>
                    </div>

                    {/* Custom Fields - Styled similarly */}
                    <div className="space-y-4">
                      {customFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{field.label}</Label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              value={(customFieldValues[field.id] as string) || ''}
                              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                              className="rounded-xl bg-[#0B0B0F] border-white/10 min-h-[80px] text-white text-sm focus:border-primary/50 focus:ring-0"
                            />
                          ) : field.type === 'select' ? (
                            <Select value={(customFieldValues[field.id] as string) || ''} onValueChange={(v) => updateCustomFieldValue(field.id, v)}>
                              <SelectTrigger className="h-11 rounded-xl bg-[#0B0B0F] border-white/10 text-sm">
                                <SelectValue placeholder={field.placeholder || "Select an option"} />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                                {(field as any).options?.map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'checkbox' ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0B0B0F] border border-white/10">
                              <Checkbox
                                id={field.id}
                                checked={(customFieldValues[field.id] as boolean) || false}
                                onCheckedChange={(c) => updateCustomFieldValue(field.id, !!c)}
                                className="rounded-md border-white/20 data-[state=checked]:bg-primary"
                              />
                              <label htmlFor={field.id} className="text-sm font-medium text-gray-300">{field.label}</label>
                            </div>
                          ) : (
                            <Input
                              type={field.type}
                              value={(customFieldValues[field.id] as string) || ''}
                              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                              className="h-11 rounded-xl bg-[#0B0B0F] border-white/10 text-white text-sm focus:ring-0"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-medium text-gray-400 ml-0.5">Additional Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="rounded-lg bg-white/[0.03] border-white/[0.08] min-h-[70px] text-white placeholder:text-gray-600 focus:ring-0 resize-none"
                        placeholder="Any special requirements or notes..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-5 pb-2 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowBookingForm(false)}
                      className="h-10 rounded-lg flex-1 border border-white/[0.08] text-gray-400 font-medium hover:bg-white/[0.03] hover:text-gray-300"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="h-10 rounded-lg flex-2 min-w-[130px] font-semibold"
                      disabled={createBooking.isPending || isProcessingPayment}
                      style={{ background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124", color: "#fff" }}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          Processing
                        </>
                      ) : createBooking.isPending ? (
                        'Confirming...'
                      ) : isPaidEvent && eventPrice > 0 ? (
                        'Pay & Confirm'
                      ) : (
                        'Confirm Booking'
                      )}
                    </Button>
                  </div>
                </form>
              ) : selectedDate ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white">{format(selectedDate, 'EEEE, MMM d')}</h2>
                    <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">Available</div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                    {timeSlots.filter(s => s.available).map((slot) => (
                      <div key={slot.time} className="group relative flex gap-2">
                        <button
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "flex-1 h-16 rounded-[1.25rem] text-base font-bold transition-all duration-300 relative overflow-hidden flex items-center justify-center border",
                            selectedSlot?.time === slot.time
                              ? "border-transparent text-black"
                              : "bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/20 hover:bg-white/[0.06]"
                          )}
                        >
                          {selectedSlot?.time === slot.time && (
                            <div
                              className="absolute inset-0 z-0 animate-in fade-in scale-in-95 duration-300"
                              style={{ background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124" }}
                            />
                          )}
                          <span className="relative z-10">{slot.time}</span>
                        </button>

                        {selectedSlot?.time === slot.time && (
                          <Button
                            onClick={() => setShowBookingForm(true)}
                            className="h-16 w-24 rounded-[1.25rem] bg-white text-black hover:bg-gray-200 font-black animate-in slide-in-from-left-4 duration-300 shadow-xl"
                          >
                            Next
                          </Button>
                        )}
                      </div>
                    ))}
                    {timeSlots.filter(s => s.available).length === 0 && (
                      <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
                        <Calendar className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">No slots available today</p>
                        <p className="text-xs text-gray-600 mt-1">Try selecting another date</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-pulse">
                  <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-400 mb-2">Ready to book?</h3>
                  <p className="text-sm text-gray-600 max-w-[240px]">Select a date on the calendar to see available time slots.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
