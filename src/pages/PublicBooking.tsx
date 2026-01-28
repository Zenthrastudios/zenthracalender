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
        description: `Booking with ${eventData.eventType.instructor?.name || eventData.host.name}`,
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
                  host: { username: username, name: eventData.eventType.instructor?.name || eventData.host.name }
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
              host: { username: username, name: eventData.eventType.instructor?.name || eventData.host.name }
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
              host: { username: username, name: eventData.eventType.instructor?.name || eventData.host.name }
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
            host: { username: username, name: eventData.eventType.instructor?.name || eventData.host.name }
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
    <div className="min-h-screen bg-background selection:bg-primary/30 text-foreground pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: branding?.is_enabled && branding?.brand_color ? branding.brand_color : "#FF9124" }}
          >
            {branding?.is_enabled && branding?.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt={branding.brand_name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-lg">{(branding?.brand_name || 'C')?.charAt(0)}</span>
            )}
          </div>
          <span className="font-semibold text-lg text-foreground">{branding?.is_enabled ? branding.brand_name : 'CalSchedule'}</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-muted-foreground">Powered by CalSchedule</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">

          {eventData.eventType.banner_image_url && eventData.eventType.banner_image_url.trim() !== '' && (
            <div className="w-full h-40 md:h-48 bg-muted overflow-hidden">
              <img
                src={eventData.eventType.banner_image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="grid lg:grid-cols-[260px_1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Column 1: Host & Event Info */}
            <div className="p-5 lg:p-6">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 rounded-full border border-border bg-muted">
                  <AvatarImage
                    src={eventData.eventType.instructor?.avatar_url || eventData.host?.avatar_url || ''}
                    className="rounded-full object-cover"
                  />
                  <AvatarFallback className="text-base font-medium bg-muted text-muted-foreground">
                    {eventData.eventType.instructor?.name?.charAt(0) || eventData.host?.name?.charAt(0) || username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {eventData.eventType.instructor?.name || eventData.host?.name || username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventData.eventType.instructor?.specialization ? eventData.eventType.instructor.specialization : `@${username}`}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <h1 className="text-xl font-semibold text-foreground leading-tight">{eventData.eventType.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1.5">
                  {(() => {
                    const LocationIconComponent = getLocationIcon(eventData.eventType.location_type);
                    return <LocationIconComponent className="w-4 h-4" />;
                  })()}
                  <span>{getLocationLabel(eventData.eventType.location_type)}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {selectedSlot ? (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-foreground text-sm">
                      <Clock className="w-4 h-4" style={{ color: branding?.is_enabled && branding?.brand_color ? branding.brand_color : undefined }} />
                      <span className="font-medium">
                        {format(selectedSlot.startTime, 'MMM d, yyyy')} · {format(selectedSlot.startTime, 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Asia/Kolkata (IST)</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{eventData.eventType.duration} min</span>
                    </div>

                    {isPaidEvent && eventPrice > 0 && (
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <IndianRupee className="w-4 h-4" style={{ color: branding?.is_enabled && branding?.brand_color ? branding.brand_color : undefined }} />
                        <span>₹{eventPrice.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {eventData.eventType.description && (
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">About</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {eventData.eventType.description}
                  </p>
                </div>
              )}

              {/* Social Links */}
              {Object.values(socialLinks).some((v) => typeof v === 'string' && v.trim() !== '') && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-1.5">
                    {socialLinks.website?.trim() && (
                      <a href={normalizeUrl(socialLinks.website)} target="_blank" rel="noreferrer" title="Website" className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    {socialLinks.instagram?.trim() && (
                      <a href={normalizeUrl(socialLinks.instagram)} target="_blank" rel="noreferrer" title="Instagram" className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {socialLinks.facebook?.trim() && (
                      <a href={normalizeUrl(socialLinks.facebook)} target="_blank" rel="noreferrer" title="Facebook" className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {socialLinks.linkedin?.trim() && (
                      <a href={normalizeUrl(socialLinks.linkedin)} target="_blank" rel="noreferrer" title="LinkedIn" className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {socialLinks.twitter?.trim() && (
                      <a href={normalizeUrl(socialLinks.twitter)} target="_blank" rel="noreferrer" title="Twitter" className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Testimonials */}
              {showTestimonials && (testimonials || []).length > 0 && (
                <div className="mt-5 pt-4 border-t border-border">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Reviews</h3>
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                    {(testimonials || []).map((t) => (
                      <div key={t.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-xs text-foreground">{t.author_name}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn('w-3 h-3', i < t.rating! ? 'text-primary fill-primary' : 'text-muted')} style={{ color: i < t.rating! && branding?.brand_color ? branding.brand_color : undefined, fill: i < t.rating! && branding?.brand_color ? branding.brand_color : undefined }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">"{t.content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Calendar */}
            <div className="p-5 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm text-foreground">Select Date</h2>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-muted"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-muted"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="text-sm font-medium text-foreground">{format(currentMonth, 'MMMM yyyy')}</p>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-xs text-muted-foreground font-medium py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
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
                        "relative aspect-square rounded-md flex items-center justify-center text-sm transition-colors",
                        isSelected
                          ? "text-white font-medium"
                          : isAvailable && !isPast
                            ? "text-foreground hover:bg-muted"
                            : "text-muted-foreground/40 cursor-not-allowed"
                      )}
                    >
                      {isSelected && (
                        <div
                          className="absolute inset-0.5 rounded-md"
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

              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-2">Timezone</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>Asia/Kolkata (IST)</span>
                </div>
              </div>
            </div>

            {/* Column 3: Time Slots / Form */}
            <div className="p-5 lg:p-6">
              {showBookingForm && selectedSlot ? (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="pb-3 border-b border-border">
                    <h2 className="text-sm font-medium text-foreground">Your Details</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Complete the form to confirm</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <Input
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        required
                        className="h-9 rounded-md bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Email Address</Label>
                      <Input
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        required
                        className="h-9 rounded-md bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <div className="flex gap-2">
                        <Select value={attendeeCountryCode} onValueChange={setAttendeeCountryCode}>
                          <SelectTrigger className="w-[80px] h-9 rounded-md bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
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
                          className="h-9 rounded-md bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground flex-1"
                          placeholder="1234567890"
                        />
                      </div>
                    </div>

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {customFields.map((field) => (
                          <div key={field.id} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{field.label}</Label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                value={(customFieldValues[field.id] as string) || ''}
                                onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                                className="rounded-md bg-background border-border min-h-[70px] text-foreground text-sm"
                              />
                            ) : field.type === 'select' ? (
                              <Select value={(customFieldValues[field.id] as string) || ''} onValueChange={(v) => updateCustomFieldValue(field.id, v)}>
                                <SelectTrigger className="h-9 rounded-md bg-background border-border text-sm">
                                  <SelectValue placeholder={field.placeholder || "Select an option"} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                  {(field as any).options?.map((opt: string) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={field.id}
                                  checked={(customFieldValues[field.id] as boolean) || false}
                                  onCheckedChange={(c) => updateCustomFieldValue(field.id, !!c)}
                                />
                                <label htmlFor={field.id} className="text-sm text-foreground">{field.label}</label>
                              </div>
                            ) : (
                              <Input
                                type={field.type}
                                value={(customFieldValues[field.id] as string) || ''}
                                onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                                className="h-9 rounded-md bg-background border-border text-foreground text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Additional Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="rounded-md bg-background border-border min-h-[60px] text-foreground placeholder:text-muted-foreground resize-none"
                        placeholder="Any special requirements..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowBookingForm(false)}
                      className="h-9 rounded-md flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="h-9 rounded-md flex-1 font-medium text-white"
                      disabled={createBooking.isPending || isProcessingPayment}
                      style={{ background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124" }}
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
                        'Confirm'
                      )}
                    </Button>
                  </div>
                </form>
              ) : selectedDate ? (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-foreground">{format(selectedDate, 'EEEE, MMM d')}</h2>
                    <span className="text-xs text-muted-foreground">{timeSlots.filter(s => s.available).length} slots</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {timeSlots.filter(s => s.available).map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowBookingForm(true);
                        }}
                        className={cn(
                          "h-10 rounded-md text-sm font-medium transition-colors border",
                          selectedSlot?.time === slot.time
                            ? "border-transparent text-white"
                            : "bg-muted/30 border-border text-foreground hover:bg-muted"
                        )}
                        style={selectedSlot?.time === slot.time ? { background: branding?.is_enabled && branding.brand_color ? branding.brand_color : "#FF9124" } : undefined}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  {timeSlots.filter(s => s.available).length === 0 && (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed border-border">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No slots available</p>
                      <p className="text-xs text-muted-foreground mt-1">Try another date</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Select a date</h3>
                  <p className="text-xs text-muted-foreground max-w-[200px]">Choose a date to see available time slots</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
