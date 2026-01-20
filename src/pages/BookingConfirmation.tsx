import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBookingById, useCancelBooking } from '@/hooks/useBookings';
import { useProfileById, useUserBranding } from '@/hooks/useProfile';
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
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin" style={{ borderTopColor: accentColor }}></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6 text-center">
        <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-12 max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-4">Booking not found</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">This booking doesn't exist or has been cancelled.</p>
          <Button
            onClick={() => navigate('/')}
            className="w-full h-14 rounded-2xl font-bold bg-white text-black hover:bg-gray-200"
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
    <div className="min-h-screen bg-[#0B0B0F] text-white selection:bg-primary/30 pb-20 overflow-x-hidden">
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
        <div className="flex items-center gap-4">
          {!hostProfile && (
            <>
              <Button variant="ghost" className="text-gray-400 font-bold hover:text-white" onClick={() => navigate('/auth')}>Login</Button>
              <Button className="h-11 px-6 rounded-xl font-black bg-white text-black hover:bg-gray-200" onClick={() => navigate('/auth')}>Sign up</Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-16 relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative inline-block mb-8">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse"
              style={{ background: accentColor }}
            ></div>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #FF5C00)` }}
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Booking confirmed!</h1>
          <p className="text-lg text-gray-500 font-medium">
            You are scheduled with <span className="text-gray-300 font-bold">{hostProfile?.name || 'the host'}</span>.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 w-fit mx-auto">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirmation email sent</span>
          </div>
        </div>

        {/* Booking Details Card - PREMIUM DARK */}
        <div className="bg-[#1C1C1E] rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 w-full h-1 opacity-50" style={{ background: accentColor }}></div>

          <div className="p-8 md:p-10">
            {/* Host Section */}
            <div className="flex items-center gap-4 mb-10 pb-10 border-b border-white/5">
              <Avatar className="h-16 w-16 rounded-[1.5rem] border-2 border-white/5 p-1 bg-[#0B0B0F]">
                <AvatarImage src={hostProfile?.avatar_url || ''} className="rounded-[1.4rem] object-cover" />
                <AvatarFallback className="bg-white/5 text-white font-bold text-xl">
                  {hostProfile?.name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl font-black text-white">{hostProfile?.name || 'Host'}</p>
                <p className="text-gray-500 font-bold">@{hostProfile?.username || 'username'}</p>
              </div>
            </div>

            {/* Grid Details - matching email template style */}
            <div className="grid md:grid-cols-2 gap-10 mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center">
                    <LocationIconComponent className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">WHAT</span>
                </div>
                <div>
                  <p className="text-xl font-black text-white mb-1">{booking.event_type?.title}</p>
                  <p className="text-sm text-gray-400 font-medium">{getLocationLabel(booking.event_type?.location_type || 'google_meet')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">WHO</span>
                </div>
                <div>
                  <p className="text-xl font-black text-white mb-1 truncate">{booking.attendee_name}</p>
                  <p className="text-sm text-gray-400 font-medium truncate">{booking.attendee_email}</p>
                  {booking.attendee_phone && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 font-bold">
                      <Phone className="w-3 h-3" />
                      <span>{booking.attendee_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* WHEN Section */}
            <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">WHEN</span>
              </div>

              <div className="space-y-1">
                <p className="text-xl font-black text-white">
                  {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex items-center gap-2 text-lg font-bold text-gray-400">
                  <span className="text-white">{format(new Date(booking.start_time), 'h:mm a')}</span>
                  <ArrowRight className="w-4 h-4 text-gray-700" />
                  <span className="text-white">{format(new Date(booking.end_time), 'h:mm a')}</span>
                  <span className="text-gray-700 mx-2">|</span>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 font-black">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-tighter">({booking.attendee_timezone?.replace('_', ' ').split('/').pop()})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meet Link */}
            {booking.meet_link && (
              <div className="mt-8 relative group">
                <div
                  className="absolute inset-0 rounded-3xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: accentColor }}
                ></div>
                <div className="relative bg-white/[0.03] rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${accentColor}20` }}
                    >
                      <Video className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">JOIN MEETING</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-white truncate max-w-[80%]">{booking.meet_link}</p>
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-6 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg active:scale-95"
                      style={{ background: accentColor, color: '#000' }}
                    >
                      Join Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions - BUTTONS */}
        <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex flex-col items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-16 px-10 rounded-[1.25rem] bg-white text-black hover:bg-gray-200 font-black text-lg shadow-xl active:scale-95 transition-transform">
                  <CalendarPlus className="w-5 h-5 mr-3" />
                  Add to Calendar
                  <ChevronDown className="w-5 h-5 ml-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1C1C1E] border-white/10 p-2 rounded-[1.25rem] min-w-[200px]">
                <DropdownMenuItem onClick={() => handleAddToCalendar('google')} className="p-3 rounded-xl font-bold text-white focus:bg-white/5 cursor-pointer">
                  Google Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')} className="p-3 rounded-xl font-bold text-white focus:bg-white/5 cursor-pointer">
                  Outlook Calendar
                </DropdownMenuItem>
                <div className="h-px bg-white/5 my-1 mx-1"></div>
                <DropdownMenuItem onClick={() => handleAddToCalendar('ics')} className="p-3 rounded-xl font-bold text-white focus:bg-white/5 cursor-pointer">
                  Download .ics file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-8">
              <button
                onClick={handleReschedule}
                className="group flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-all underline decoration-gray-800 underline-offset-8 decoration-2 hover:decoration-white"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Reschedule
              </button>

              <button
                onClick={handleCancel}
                disabled={cancelBooking.isPending}
                className="group flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-red-500 transition-all underline decoration-gray-800 underline-offset-8 decoration-2 hover:decoration-red-500"
              >
                <XCircle className="w-4 h-4" />
                {cancelBooking.isPending ? 'Cancelling...' : 'Cancel Meeting'}
              </button>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-8">
            <Link
              to="/my-bookings"
              className="group flex items-center gap-3 text-sm font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              View all your bookings
              <div
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform"
                style={{ color: accentColor }}
              >
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <div className="flex flex-col items-center gap-1 opacity-20">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Powerhouse Technology</span>
              <span className="text-xs font-black text-white">CalSchedule</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
