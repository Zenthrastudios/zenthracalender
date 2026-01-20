import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBookingById, useCancelBooking } from '@/hooks/useBookings';
import { useProfileById, useUserBranding } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  ExternalLink,
  ArrowRight,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { data: branding } = useUserBranding(hostProfile?.id);
  const cancelBooking = useCancelBooking();

  const accentColor = branding?.is_enabled && branding?.brand_color ? branding.brand_color : "#FF9124";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-3">Booking not found</h1>
          <p className="text-muted-foreground mb-6 text-sm">This booking doesn't exist or has been cancelled.</p>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const LocationIconComponent = getLocationIcon(booking.event_type?.location_type || 'google_meet');

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
    if (booking?.reschedule_token) {
      navigate(`/reschedule/${booking.reschedule_token}`);
    } else {
      toast.info('Reschedule not available.');
    }
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: accentColor }}
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

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-12">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: accentColor }}
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-2">Booking Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            You are scheduled with <span className="text-foreground font-medium">{hostProfile?.name || 'the host'}</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 w-fit mx-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Confirmation email sent</span>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6">
            {/* Host Section */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
              <Avatar className="h-12 w-12 rounded-full border border-border">
                <AvatarImage src={hostProfile?.avatar_url || ''} className="rounded-full object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {hostProfile?.name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-medium text-foreground">{hostProfile?.name || 'Host'}</p>
                <p className="text-sm text-muted-foreground">@{hostProfile?.username || 'username'}</p>
              </div>
            </div>

            {/* Grid Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LocationIconComponent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Event</span>
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">{booking.event_type?.title}</p>
                  <p className="text-sm text-muted-foreground">{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Attendee</span>
                </div>
                <div>
                  <p className="text-base font-medium text-foreground truncate">{booking.attendee_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{booking.attendee_email}</p>
                  {booking.attendee_phone && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{booking.attendee_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* When Section */}
            <div className="bg-muted/30 rounded-lg p-5 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">When</span>
              </div>

              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{format(new Date(booking.start_time), 'h:mm a')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="text-foreground font-medium">{format(new Date(booking.end_time), 'h:mm a')}</span>
                  <span className="mx-1">·</span>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{booking.attendee_timezone?.replace('_', ' ').split('/').pop()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meet Link */}
            {booking.meet_link && (
              <div className="mt-6">
                <div className="bg-muted/30 rounded-lg p-5 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Join Meeting</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-foreground truncate flex-1">{booking.meet_link}</p>
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-4 rounded-md flex items-center justify-center gap-2 font-medium text-sm text-white transition-all"
                      style={{ background: accentColor }}
                    >
                      Join
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-6 rounded-md font-medium">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Calendar
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border rounded-md min-w-[180px]">
                <DropdownMenuItem onClick={() => handleAddToCalendar('google')} className="cursor-pointer">
                  Google Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')} className="cursor-pointer">
                  Outlook Calendar
                </DropdownMenuItem>
                <div className="h-px bg-border my-1"></div>
                <DropdownMenuItem onClick={() => handleAddToCalendar('ics')} className="cursor-pointer">
                  Download .ics file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-6">
              <button
                onClick={handleReschedule}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reschedule
              </button>

              <button
                onClick={handleCancel}
                disabled={cancelBooking.isPending}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {cancelBooking.isPending ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-border flex flex-col items-center gap-6">
            <Link
              to="/my-bookings"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all bookings
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="text-center">
              <span className="text-xs text-muted-foreground">Powered by CalSchedule</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
