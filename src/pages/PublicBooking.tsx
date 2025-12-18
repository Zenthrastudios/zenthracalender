import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useScheduling } from '@/contexts/SchedulingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Video, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isToday, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeSlot, EventType, Availability } from '@/types/scheduling';
import { toast } from 'sonner';
import avatarRick from '@/assets/avatar-rick.png';

// Timezone list
const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

// Demo event types for public viewing
const demoEventTypes: EventType[] = [
  {
    id: 'demo-15',
    userId: '1',
    title: '15 Min Meeting',
    slug: '15min',
    description: 'Quick sync or introduction call',
    duration: 15,
    bufferBefore: 0,
    bufferAfter: 5,
    locationType: 'google_meet',
    isActive: true,
    minimumNotice: 60,
  },
  {
    id: 'demo-30',
    userId: '1',
    title: '30 Min Introductory Call',
    slug: '30min',
    description: "Let's chat about your project requirements and how we can help. Please be ready with your current roadmap and any questions you might have.",
    duration: 30,
    bufferBefore: 5,
    bufferAfter: 5,
    locationType: 'google_meet',
    isActive: true,
    minimumNotice: 120,
  },
];

// Demo availability
const demoAvailability: Availability[] = [
  { id: '1', userId: '1', weekday: 1, startTime: 540, endTime: 1020 },
  { id: '2', userId: '1', weekday: 2, startTime: 540, endTime: 1020 },
  { id: '3', userId: '1', weekday: 3, startTime: 540, endTime: 1020 },
  { id: '4', userId: '1', weekday: 4, startTime: 540, endTime: 1020 },
  { id: '5', userId: '1', weekday: 5, startTime: 540, endTime: 1020 },
];

export default function PublicBookingPage() {
  const { username, eventSlug } = useParams();
  const navigate = useNavigate();
  const { eventTypes: userEventTypes, availability: userAvailability, bookings, addBooking } = useScheduling();

  // Use demo data if no user data available
  const eventTypes = userEventTypes.length > 0 ? userEventTypes : demoEventTypes;
  const availability = userAvailability.length > 0 ? userAvailability : demoAvailability;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // Form state
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the event type
  const eventType = eventTypes.find(et => et.slug === eventSlug && et.isActive);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get first day offset
  const firstDayOffset = startOfMonth(currentMonth).getDay();

  // Check if a day has availability
  const hasAvailability = (date: Date) => {
    if (isBefore(date, new Date()) && !isToday(date)) return false;
    const dayOfWeek = date.getDay();
    return availability.some(a => a.weekday === dayOfWeek);
  };

  // Generate time slots for selected date
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate || !eventType) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(a => a.weekday === dayOfWeek);
    
    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const now = new Date();

    dayAvailability.forEach(avail => {
      let currentTime = avail.startTime;
      while (currentTime + eventType.duration <= avail.endTime) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
        
        const slotEnd = addMinutes(slotStart, eventType.duration);
        
        // Check if slot is in the past
        const isAvailable = slotStart > now || (isToday(selectedDate) && slotStart > now);
        
        // Check if slot conflicts with existing bookings
        const hasConflict = bookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          return (
            booking.status === 'confirmed' &&
            slotStart < bookingEnd &&
            slotEnd > bookingStart
          );
        });

        slots.push({
          time: format(slotStart, 'hh:mma').toLowerCase(),
          available: isAvailable && !hasConflict,
          startTime: slotStart,
          endTime: slotEnd,
        });

        currentTime += 30; // 30 minute increments
      }
    });

    return slots;
  }, [selectedDate, eventType, availability, bookings]);

  const handleDateSelect = (date: Date) => {
    if (hasAvailability(date)) {
      setSelectedDate(date);
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      setShowBookingForm(true);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !eventType) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const booking = addBooking({
        eventTypeId: eventType.id,
        hostId: '1',
        attendeeName,
        attendeeEmail,
        attendeeTimezone: timezone,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        status: 'confirmed',
        notes,
      });

      toast.success('Booking confirmed!');
      navigate(`/booking/confirmed/${booking.id}`);
    } catch (error) {
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <p className="text-muted-foreground mb-4">This event type doesn't exist or has been disabled.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">C</span>
          </div>
          <span className="font-semibold">CalApp</span>
        </Link>
        <span className="text-sm text-muted-foreground">Powered by CalApp</span>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="grid md:grid-cols-[300px_1fr_1fr]">
            {/* Event Info */}
            <div className="p-6 border-r border-border">
              <img 
                src={avatarRick} 
                alt={`${username}'s profile`}
                className="w-16 h-16 rounded-full object-cover mb-4"
              />
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                {username?.toUpperCase()}
              </p>
              <h1 className="text-xl font-bold mb-4">{eventType.title}</h1>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{eventType.duration} min</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Video className="w-4 h-4" />
                  <span>Google Meet</span>
                </div>
              </div>

              {eventType.description && (
                <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
                  {eventType.description}
                </p>
              )}
            </div>

            {/* Calendar */}
            <div className="p-6 border-r border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset (adjusted for Monday start) */}
                {Array.from({ length: (firstDayOffset + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {calendarDays.map(date => {
                  const isAvailable = hasAvailability(date);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isPast = isBefore(date, new Date()) && !isToday(date);
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
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

              {/* Timezone */}
              <div className="mt-6">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Time Zone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-background">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Slots or Booking Form */}
            <div className="p-6">
              {showBookingForm && selectedSlot ? (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <h2 className="font-semibold mb-1">Enter your details</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedSlot.startTime, 'EEEE, MMMM d')} at {format(selectedSlot.startTime, 'h:mm a')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information..."
                      className="bg-background min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowBookingForm(false)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                  </div>
                </form>
              ) : selectedDate ? (
                <>
                  <h2 className="font-semibold mb-4">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </h2>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {timeSlots.filter(s => s.available).map((slot) => (
                      <div key={slot.time} className="flex gap-2">
                        <button
                          onClick={() => handleSlotSelect(slot)}
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
                          <Button onClick={handleConfirm} className="animate-scale-in">
                            Confirm
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {timeSlots.filter(s => s.available).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        No available time slots for this day.
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

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} CalApp Inc. <Link to="/privacy" className="hover:underline">Privacy</Link> & <Link to="/terms" className="hover:underline">Terms</Link>
        </footer>
      </main>
    </div>
  );
}
