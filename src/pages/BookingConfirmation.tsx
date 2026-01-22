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
import { Share, Heart, Sparkle, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
    }
  };

  const handleShare = async () => {
    await triggerHaptic(ImpactStyle.Medium);
    const url = window.location.href;
    if (Capacitor.isNativePlatform()) {
      await CapacitorShare.share({
        title: 'Booking Confirmed!',
        text: `I just booked a ${booking.event_type?.title} with ${hostProfile?.name}!`,
        url: url,
        dialogTitle: 'Share your booking'
      });
    } else if (navigator.share) {
      await navigator.share({
        title: 'Booking Confirmed!',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReschedule = async () => {
    await triggerHaptic(ImpactStyle.Light);
    if (booking?.reschedule_token) {
      navigate(`/reschedule/${booking.reschedule_token}`);
    } else {
      toast.info('Reschedule not available.');
    }
  };

  const handleCancel = async () => {
    await triggerHaptic(ImpactStyle.Medium);
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

      {/* Confetti Background Effect (CSS Only) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              backgroundColor: i % 2 === 0 ? accentColor : '#fff',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 relative z-10">
        <div className="text-center mb-8 animate-in fade-in zoom-in duration-700">
          <div className="inline-block mb-6 relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-500" />
            <div
              className="w-24 h-24 rounded-[2rem] flex items-center justify-center relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-2xl shadow-primary/40"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #FFB26B)` }}
            >
              <CheckCircle className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkle className="w-6 h-6 text-primary animate-bounce" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">You're all set!</h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your meeting with <span className="text-foreground font-bold">{hostProfile?.name || 'the host'}</span> is confirmed.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit mx-auto shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Email Confirmation Sent</span>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-card/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl shadow-black/20 animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <div className="p-8">
            {/* Host Section */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                <Avatar className="h-16 w-16 rounded-2xl border-2 border-white/10 relative z-10">
                  <AvatarImage src={hostProfile?.avatar_url || ''} className="rounded-2xl object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xl">
                    {hostProfile?.name?.charAt(0) || 'H'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{hostProfile?.name || 'Host'}</p>
                <p className="text-sm text-muted-foreground font-medium">@{hostProfile?.username || 'username'}</p>
              </div>
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/5 active:scale-90"
                  onClick={handleShare}
                >
                  <Share className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Grid Details */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 w-fit">
                  <LocationIconComponent className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Event Type</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-tight">{booking.event_type?.title}</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 w-fit">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Details</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground truncate">{booking.attendee_name}</p>
                  <p className="text-sm text-muted-foreground font-medium truncate">{booking.attendee_email}</p>
                </div>
              </div>
            </div>

            {/* When Section */}
            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 space-y-4 group hover:border-primary/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Schedule</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                  <Globe className="w-3 h-3" />
                  {booking.attendee_timezone?.split('/').pop()?.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">
                  {format(new Date(booking.start_time), 'EEEE, MMM d')}
                </p>
                <div className="flex items-center gap-3 text-lg text-muted-foreground">
                  <span className="text-primary font-bold">{format(new Date(booking.start_time), 'h:mm a')}</span>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="font-medium">{format(new Date(booking.end_time), 'h:mm a')}</span>
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
        <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:flex-1 h-14 rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xl active:scale-[0.98]">
                    <CalendarPlus className="w-5 h-5 mr-3" />
                    Add to Calendar
                    <ChevronDown className="w-5 h-5 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-white/10 rounded-2xl min-w-[220px] p-2 shadow-2xl backdrop-blur-3xl">
                  <DropdownMenuItem onClick={() => handleAddToCalendar('google')} className="cursor-pointer rounded-xl py-3 px-4 font-medium focus:bg-primary/10">
                    <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')} className="cursor-pointer rounded-xl py-3 px-4 font-medium focus:bg-primary/10">
                    <Calendar className="w-4 h-4 mr-3 text-blue-600" />
                    Outlook Calendar
                  </DropdownMenuItem>
                  <div className="h-px bg-white/5 my-2"></div>
                  <DropdownMenuItem onClick={() => handleAddToCalendar('ics')} className="cursor-pointer rounded-xl py-3 px-4 font-medium focus:bg-primary/10">
                    <ExternalLink className="w-4 h-4 mr-3 text-muted-foreground" />
                    Download Apple ICS
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="w-full sm:flex-1 h-14 rounded-2xl font-bold border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm active:scale-[0.98]"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5 mr-3 text-primary" />
                Share Booking
              </Button>
            </div>

            <div className="flex items-center gap-10">
              <button
                onClick={handleReschedule}
                className="flex flex-col items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group"
              >
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-primary group-hover:rotate-180 transition-all duration-500">
                  <RefreshCw className="w-4 h-4" />
                </div>
                Reschedule
              </button>

              <button
                onClick={handleCancel}
                disabled={cancelBooking.isPending}
                className="flex flex-col items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-destructive transition-all uppercase tracking-widest group"
              >
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-destructive transition-all">
                  <XCircle className="w-4 h-4" />
                </div>
                {cancelBooking.isPending ? 'Wait...' : 'Cancel'}
              </button>
            </div>
          </div>

          {/* Special App Note */}
          {Capacitor.isNativePlatform() && (
            <div className="bg-primary/5 rounded-[2rem] p-6 border border-dashed border-primary/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm">Better on the App</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Get instant notifications and manage your bookings on the move with our mobile app.
                </p>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-8">
            <Link
              to="/my-bookings"
              className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all font-bold text-sm text-foreground shadow-sm active:scale-95"
            >
              My Bookings Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <Sparkle className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Zenthra Calendar</span>
                <Sparkle className="w-3 h-3 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
