import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBookingById, useCancelBooking } from '@/hooks/useBookings';
import { useProfileById } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  Video, 
  CalendarPlus,
  RefreshCw,
  XCircle,
  ChevronDown,
  MapPin,
  Phone,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const { data: booking, isLoading } = useBookingById(bookingId);
  const { data: hostProfile } = useProfileById(booking?.host_id);
  const cancelBooking = useCancelBooking();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!booking) {
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

  const LocationIcon = getLocationIcon(booking.event_type?.location_type || 'google_meet');

  const handleAddToCalendar = (type: 'google' | 'outlook' | 'ics') => {
    const title = encodeURIComponent(booking.event_type?.title || 'Meeting');
    const startTime = format(new Date(booking.start_time), "yyyyMMdd'T'HHmmss");
    const endTime = format(new Date(booking.end_time), "yyyyMMdd'T'HHmmss");
    const description = encodeURIComponent(
      `Meeting with ${hostProfile?.name || 'Host'}${booking.meet_link ? `\n\nJoin: ${booking.meet_link}` : ''}`
    );

    if (type === 'google') {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${description}`;
      window.open(url, '_blank');
    } else if (type === 'outlook') {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${description}`;
      window.open(url, '_blank');
    } else {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${booking.event_type?.title || 'Meeting'}
DESCRIPTION:Meeting with ${hostProfile?.name || 'Host'}${booking.meet_link ? `\\nJoin: ${booking.meet_link}` : ''}
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

  const handleCancel = async () => {
    try {
      await cancelBooking.mutateAsync(booking);
      toast.success('Booking cancelled');
      navigate('/');
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
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

          <h1 className="text-3xl font-bold mb-2">Booking confirmed!</h1>
          <p className="text-muted-foreground">
            You are scheduled with {hostProfile?.name || 'the host'}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            A calendar invitation has been sent to your email address.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-6 animate-slide-up">
          {/* Host Info */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Avatar className="h-12 w-12">
              <AvatarImage src={hostProfile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {hostProfile?.name?.charAt(0) || 'H'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{hostProfile?.name || 'Host'}</p>
              <p className="text-sm text-muted-foreground">@{hostProfile?.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <LocationIcon className="w-3 h-3" /> WHAT
              </p>
              <p className="font-semibold">{booking.event_type?.title}</p>
              <p className="text-sm text-muted-foreground">{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> WHO
              </p>
              <p className="font-semibold">{booking.attendee_name}</p>
              <p className="text-sm text-muted-foreground">{booking.attendee_email}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> WHEN
            </p>
            <p className="font-semibold">
              {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}{' '}
              <span className="text-primary">at</span>{' '}
              {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}{' '}
              <span className="text-muted-foreground">({booking.attendee_timezone?.replace('_', ' ').split('/').pop()})</span>
            </p>
          </div>

          {/* Meet Link */}
          {booking.meet_link && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Video className="w-3 h-3" /> JOIN MEETING
              </p>
              <a 
                href={booking.meet_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <span className="truncate">{booking.meet_link}</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>
          )}
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
              disabled={cancelBooking.isPending}
              className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {cancelBooking.isPending ? 'Cancelling...' : 'Cancel'}
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
