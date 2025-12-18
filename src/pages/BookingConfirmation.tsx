import { useParams, Link, useNavigate } from 'react-router-dom';
import { useScheduling } from '@/contexts/SchedulingContext';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  Video, 
  CalendarPlus,
  RefreshCw,
  XCircle,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { bookings, eventTypes, cancelBooking } = useScheduling();

  const booking = bookings.find(b => b.id === bookingId);
  const eventType = booking ? eventTypes.find(et => et.id === booking.eventTypeId) : null;

  if (!booking || !eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Booking not found</h1>
          <p className="text-muted-foreground mb-4">This booking doesn't exist or has been cancelled.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handleAddToCalendar = (type: 'google' | 'outlook' | 'ics') => {
    const title = encodeURIComponent(eventType.title);
    const startTime = format(new Date(booking.startTime), "yyyyMMdd'T'HHmmss");
    const endTime = format(new Date(booking.endTime), "yyyyMMdd'T'HHmmss");
    const description = encodeURIComponent(`Meeting with ${booking.attendeeName}`);

    if (type === 'google') {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${description}`;
      window.open(url, '_blank');
    } else if (type === 'outlook') {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${description}`;
      window.open(url, '_blank');
    } else {
      // Generate ICS file
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${eventType.title}
DESCRIPTION:Meeting with ${booking.attendeeName}
END:VEVENT
END:VCALENDAR`;
      
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'event.ics';
      link.click();
    }

    toast.success('Calendar event added!');
  };

  const handleReschedule = () => {
    toast.info('Reschedule feature coming soon!');
  };

  const handleCancel = () => {
    cancelBooking(booking.id);
    toast.success('Booking cancelled');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">C</span>
          </div>
          <span className="font-semibold">CalSchedule</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
          <Button onClick={() => navigate('/auth')}>Sign up</Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-8 animate-fade-in">
          {/* Success Icon */}
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary-foreground" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Booking confirmed</h1>
          <p className="text-muted-foreground">
            You are scheduled with {booking.attendeeName || 'the host'}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            A calendar invitation has been sent to your email address.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(booking.startTime), 'MMMM yyyy')}</span>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
                <Video className="w-3 h-3" /> WHAT
              </p>
              <p className="font-semibold">{eventType.title}</p>
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> WHO
              </p>
              <p className="font-semibold">{booking.attendeeName}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4">
            <p className="text-xs text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> WHEN
            </p>
            <p className="font-semibold">
              {format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')}{' '}
              <span className="text-primary">at</span>{' '}
              {format(new Date(booking.startTime), 'h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}{' '}
              <span className="text-muted-foreground">({booking.attendeeTimezone?.replace('_', ' ').split('/').pop()})</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to Calendar
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')}>
                Outlook Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToCalendar('ics')}>
                Download .ics file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={handleReschedule}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reschedule
            </button>
            <div className="w-px h-4 bg-border"></div>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          POWERED BY <span className="font-semibold text-foreground">CalSchedule</span>
        </div>
      </main>
    </div>
  );
}
