import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useEventTypeBySlug } from '@/hooks/useEventTypes';
import { useHostBookingsForDate, useGoogleCalendarConflicts } from '@/hooks/useAvailability';
import { useBookingAvailability } from '@/hooks/useAvailabilitySchedules';
import { useCreateBooking } from '@/hooks/useBookings';
import { useTestimonials } from '@/hooks/useTestimonials';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment, useCreateCashfreeOrder, useVerifyCashfreePayment } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Video, Globe, ChevronLeft, ChevronRight, MapPin, Phone, Link as LinkIcon, IndianRupee, CreditCard, Loader2, Star, Instagram, Facebook, Linkedin, Twitter, Youtube, Pin } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isToday, addMinutes } from 'date-fns';
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

  // Get schedule_id from event type, or use default schedule
  const scheduleId = eventData?.eventType?.schedule_id || null;
  const { data: availability } = useBookingAvailability(eventData?.host?.id, scheduleId);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone] = useState('Asia/Kolkata');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeeCountryCode, setAttendeeCountryCode] = useState('+91');
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

  const hasAvailability = (date: Date) => {
    if (isBefore(date, new Date()) && !isToday(date)) return false;
    const dayOfWeek = date.getDay();
    return availability?.some(a => a.weekday === dayOfWeek) ?? false;
  };

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate || !eventData?.eventType || !availability) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(a => a.weekday === dayOfWeek);
    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const now = new Date();

    dayAvailability.forEach(avail => {
      let currentTime = avail.start_time;
      while (currentTime + eventData.eventType.duration <= avail.end_time) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
        const slotEnd = addMinutes(slotStart, eventData.eventType.duration);

        const isAvailable = slotStart > now;

        // Check existing bookings conflict
        const hasBookingConflict = existingBookings?.some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });

        // Check Google Calendar conflicts
        const hasGoogleConflict = googleCalendarConflicts?.some((conflict: { start: string; end: string }) => {
          const conflictStart = new Date(conflict.start);
          const conflictEnd = new Date(conflict.end);
          return slotStart < conflictEnd && slotEnd > conflictStart;
        });

        slots.push({
          time: format(slotStart, 'hh:mma').toLowerCase(),
          available: isAvailable && !hasBookingConflict && !hasGoogleConflict,
          startTime: slotStart,
          endTime: slotEnd,
        });
        currentTime += 30;
      }
    });

    return slots;
  }, [selectedDate, eventData, availability, existingBookings, googleCalendarConflicts]);

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
    const dial = attendeeCountryCode.replace(/[^\d+]/g, '');
    const national = attendeePhoneNational.replace(/\D/g, '');
    if (!dial || !national) return undefined;
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
        }
        setIsProcessingPayment(false);
      }).catch(() => {
        toast.error('Payment was cancelled.');
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
    <div className="min-h-screen bg-background">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">C</span>
          </div>
          <span className="font-semibold">CalSchedule</span>
        </Link>
        <span className="text-sm text-muted-foreground">Powered by CalSchedule</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {eventData.eventType.banner_image_url && eventData.eventType.banner_image_url.trim() !== '' && (
            <div className="w-full h-44 md:h-52 bg-muted overflow-hidden">
              <img
                src={eventData.eventType.banner_image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="grid md:grid-cols-[300px_1fr_1fr]">
            {/* Host & Event Info */}
            <div className="p-6 border-r border-border">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={eventData.host?.avatar_url || ''} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {eventData.host?.name?.charAt(0) || username?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{eventData.host?.name || username}</p>
                  <p className="text-xs text-muted-foreground truncate">Book a session</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold mt-5 leading-tight">{eventData.eventType.title}</h1>

              <p className="text-sm text-muted-foreground mt-2">
                Choose a time that works for you. You’ll get a confirmation email with all details.
              </p>

              <div className="mt-5 space-y-3 text-sm">
                {selectedSlot ? (
                  <>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(selectedSlot.startTime, 'EEEE, MMM d, yyyy')} · {format(selectedSlot.startTime, 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>Asia/Kolkata (IST)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{eventData.eventType.duration} min</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <LocationIcon className="w-4 h-4" />
                      <span>{getLocationLabel(eventData.eventType.location_type)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>Asia/Kolkata (IST)</span>
                    </div>
                    {isPaidEvent && eventPrice > 0 && (
                      <div className="flex items-center gap-3 text-primary font-medium">
                        <IndianRupee className="w-4 h-4" />
                        <span>₹{eventPrice.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {eventData.eventType.description && (
                <p className="text-sm text-muted-foreground mt-6 border-t border-border pt-4 whitespace-pre-wrap">
                  {eventData.eventType.description}
                </p>
              )}

              {Object.values(socialLinks).some((v) => typeof v === 'string' && v.trim() !== '') && (
                <div className="mt-5 flex items-center gap-2">
                  {socialLinks.website?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Website"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.instagram?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.instagram)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.facebook?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.facebook)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.linkedin?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.linkedin)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.twitter?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.twitter)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.youtube?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.youtube)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.pinterest?.trim() && (
                    <a
                      href={normalizeUrl(socialLinks.pinterest)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Pinterest"
                    >
                      <Pin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {showTestimonials && (testimonials || []).length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Testimonials</h2>
                    <span className="text-xs text-muted-foreground">{(testimonials || []).length}</span>
                  </div>
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {(testimonials || []).map((t) => (
                      <div key={t.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.author_name}</p>
                            {t.author_title && (
                              <p className="text-xs text-muted-foreground truncate">{t.author_title}</p>
                            )}
                          </div>
                          {t.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'w-3.5 h-3.5',
                                    i < t.rating! ? 'text-primary fill-primary' : 'text-muted-foreground/40'
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{t.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="p-6 border-r border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">{day}</div>
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
                        "aspect-square rounded-full flex items-center justify-center text-sm transition-all",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isAvailable && !isPast && "hover:bg-accent",
                        (!isAvailable || isPast) && "text-muted-foreground/50 cursor-not-allowed"
                      )}
                    >
                      {format(date, 'd')}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Time Zone</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">Asia/Kolkata (IST)</span>
                </div>
              </div>
            </div>

            {/* Time Slots / Booking Form */}
            <div className="p-6">
              {showBookingForm && selectedSlot ? (
                <form onSubmit={handleBookingSubmit} className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  <div>
                    <h2 className="font-semibold mb-1">Enter your details</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedSlot.startTime, 'EEEE, MMMM d')} at {format(selectedSlot.startTime, 'h:mm a')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Your Name <span className="text-destructive">*</span></Label>
                    <Input 
                      value={attendeeName} 
                      onChange={(e) => setAttendeeName(e.target.value)} 
                      required 
                      className="bg-background" 
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address <span className="text-destructive">*</span></Label>
                    <Input 
                      type="email" 
                      value={attendeeEmail} 
                      onChange={(e) => setAttendeeEmail(e.target.value)} 
                      required 
                      className="bg-background"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2">
                      <Select value={attendeeCountryCode} onValueChange={setAttendeeCountryCode}>
                        <SelectTrigger className="w-[150px] bg-background">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_DIAL_CODES.map((c) => (
                            <SelectItem key={`${c.iso2}-${c.dialCode}`} value={c.dialCode}>
                              {c.iso2} {c.dialCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        value={attendeePhoneNational}
                        onChange={(e) => setAttendeePhoneNational(e.target.value)}
                        required
                        className="bg-background flex-1"
                        placeholder="9876543210"
                        inputMode="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We’ll use this only if the host needs to contact you.
                    </p>
                  </div>

                  {/* Custom Fields */}
                  {customFields.map(renderCustomField)}

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="bg-background min-h-[80px]"
                      placeholder="Any additional information..."
                    />
                  </div>
                  {/* Price Display for Paid Events */}
                  {isPaidEvent && eventPrice > 0 && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <span className="font-medium">Payment Required</span>
                        </div>
                        <div className="flex items-center gap-1 text-lg font-bold text-primary">
                          <IndianRupee className="w-5 h-5" />
                          {eventPrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment via {paymentProvider === 'razorpay' ? 'Razorpay' : 'Cashfree'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowBookingForm(false)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={createBooking.isPending || isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : createBooking.isPending ? (
                        'Booking...'
                      ) : isPaidEvent && eventPrice > 0 ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay & Confirm
                        </>
                      ) : (
                        'Confirm Booking'
                      )}
                    </Button>
                  </div>
                </form>
              ) : selectedDate ? (
                <>
                  <h2 className="font-semibold mb-4">{format(selectedDate, 'EEEE, MMM d')}</h2>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {timeSlots.filter(s => s.available).map((slot) => (
                      <div key={slot.time} className="flex gap-2">
                        <button 
                          onClick={() => setSelectedSlot(slot)} 
                          className={cn(
                            "flex-1 py-3 px-4 rounded-lg text-sm font-medium border transition-all",
                            selectedSlot?.time === slot.time 
                              ? "bg-foreground text-background border-foreground" 
                              : "bg-background border-border hover:border-primary text-primary"
                          )}
                        >
                          {slot.time}
                        </button>
                        {selectedSlot?.time === slot.time && (
                          <Button onClick={() => setShowBookingForm(true)} className="animate-scale-in">
                            Next
                          </Button>
                        )}
                      </div>
                    ))}
                    {timeSlots.filter(s => s.available).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        No available slots for this day.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Select a date to see available times</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}