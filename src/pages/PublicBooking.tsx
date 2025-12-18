import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEventTypeBySlug } from '@/hooks/useEventTypes';
import { useHostAvailabilityForBooking, useHostBookingsForDate, useGoogleCalendarConflicts } from '@/hooks/useAvailability';
import { useCreateBooking } from '@/hooks/useBookings';
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
import { Clock, Video, Globe, ChevronLeft, ChevronRight, MapPin, Phone, Link as LinkIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isToday, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const TIMEZONES = [
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

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

export default function PublicBookingPage() {
  const { username, eventSlug } = useParams();
  const navigate = useNavigate();
  
  const { data: eventData, isLoading } = useEventTypeBySlug(username, eventSlug);
  const { data: availability } = useHostAvailabilityForBooking(eventData?.host?.id);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean>>({});

  const { data: existingBookings } = useHostBookingsForDate(eventData?.host?.id, selectedDate);
  const { data: googleCalendarConflicts } = useGoogleCalendarConflicts(eventData?.host?.id, selectedDate);
  const createBooking = useCreateBooking();

  // Get custom fields from event type
  const customFields: CustomField[] = (eventData?.eventType as any)?.custom_fields || [];

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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !eventData) return;

    if (!validateForm()) return;

    try {
      // Build notes with custom field values
      let fullNotes = notes;
      if (Object.keys(customFieldValues).length > 0) {
        const customAnswers = customFields
          .map(field => {
            const value = customFieldValues[field.id];
            if (value === undefined || value === '' || value === false) return null;
            const displayValue = field.type === 'checkbox' ? 'Yes' : value;
            return `${field.label}: ${displayValue}`;
          })
          .filter(Boolean)
          .join('\n');
        
        if (customAnswers) {
          fullNotes = fullNotes 
            ? `${notes}\n\n--- Custom Responses ---\n${customAnswers}`
            : `--- Custom Responses ---\n${customAnswers}`;
        }
      }

      const booking = await createBooking.mutateAsync({
        event_type_id: eventData.eventType.id,
        host_id: eventData.host.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_timezone: timezone,
        start_time: selectedSlot.startTime.toISOString(),
        end_time: selectedSlot.endTime.toISOString(),
        notes: fullNotes || undefined,
      });

      toast.success('Booking confirmed!');
      navigate(`/booking/confirmed/${booking.id}`);
    } catch (error) {
      toast.error('Failed to create booking. Please try again.');
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
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
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
          <div className="grid md:grid-cols-[300px_1fr_1fr]">
            {/* Host & Event Info */}
            <div className="p-6 border-r border-border">
              <Avatar className="w-16 h-16 mb-4">
                <AvatarImage src={eventData.host?.avatar_url || ''} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {eventData.host?.name?.charAt(0) || username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground mb-1">{eventData.host?.name || username}</p>
              <h1 className="text-xl font-bold mb-4">{eventData.eventType.title}</h1>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{eventData.eventType.duration} min</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <LocationIcon className="w-4 h-4" />
                  <span>{getLocationLabel(eventData.eventType.location_type)}</span>
                </div>
              </div>
              {eventData.eventType.description && (
                <p className="text-sm text-muted-foreground mt-6 border-t border-border pt-4">
                  {eventData.eventType.description}
                </p>
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
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-background">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowBookingForm(false)} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createBooking.isPending}>
                      {createBooking.isPending ? 'Booking...' : 'Confirm Booking'}
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