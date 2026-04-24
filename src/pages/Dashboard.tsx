import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypes, useUpdateEventType } from '@/hooks/useEventTypes';
import { useBookings } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Search,
  Bell,
  Video,
  Copy,
  Lock,
  Phone,
  MapPin,
  IndianRupee,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  ArrowUpRight,
  ExternalLink,
  Share2,
  Sparkles,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { data: eventTypes, isLoading: eventTypesLoading } = useEventTypes();
  const { data: upcomingBookings } = useBookings('upcoming');
  const updateEventType = useUpdateEventType();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Push Notifications Setup
  const { registerPush } = usePushNotifications(user?.id);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
    }
  };

  const filteredEventTypes = eventTypes?.filter(et =>
    et.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const recentBookings = upcomingBookings?.slice(0, 5) || [];

  const copyLink = async (slug: string) => {
    const username = profile?.username;
    if (!username) {
      toast.error('Please set a username in settings before copying links.');
      return;
    }

    const url = `${window.location.origin}/book/${username}/${slug}`;
    await triggerHaptic(ImpactStyle.Medium);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link. Please copy it manually.');
    }
  };

  const toggleEventType = async (id: string, isActive: boolean) => {
    await triggerHaptic(ImpactStyle.Light);
    try {
      await updateEventType.mutateAsync({ id, is_active: isActive });
      toast.success(isActive ? 'Event type enabled' : 'Event type disabled');
    } catch (error) {
      toast.error('Failed to update event type');
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold">Event Types</h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-48 md:w-64 bg-card border-border"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative shrink-0">
              <Bell className="w-5 h-5" />
              {recentBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </Button>
            <Button onClick={() => navigate('/dashboard/events/new')} className="shrink-0">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Event Types Grid */}
          <div className="flex-1 order-2 lg:order-1">
            <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
              Create and manage your booking links. Share these links with people to let them book time with you.
            </p>

            {eventTypesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEventTypes.map((eventType, index) => (
                  <div
                    key={eventType.id}
                    className={cn(
                      "bg-card/50 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:border-primary/20 transition-all duration-300 group relative overflow-hidden active:scale-[0.98]",
                      !eventType.is_active && "opacity-70 grayscale",
                      "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Zap className="w-5 h-5 text-primary animate-pulse" />
                    </div>

                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        {eventType.is_active ? (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            {getLocationIcon(eventType.location_type)}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg leading-tight">{eventType.title}</h3>
                            {eventType.is_paid && (eventType.price || 0) > 0 && (
                              <Badge className="bg-primary text-primary-foreground border-none font-bold shadow-sm">
                                ₹{eventType.price}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {eventType.duration}m • One-on-One
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Button
                        variant="secondary"
                        className="rounded-xl h-10 bg-white/5 border border-white/5 hover:bg-white/10 group/btn"
                        onClick={() => copyLink(eventType.slug)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
                        Copy
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-xl h-10 bg-white/5 border border-white/5 hover:bg-white/10 group/btn"
                        onClick={() => navigate(`/dashboard/events/${eventType.id}`)}
                      >
                        <Settings className="w-3.5 h-3.5 mr-2 group-hover/btn:rotate-45 transition-transform" />
                        Edit
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Status
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          eventType.is_active ? "text-emerald-500" : "text-muted-foreground"
                        )}>
                          {eventType.is_active ? 'Active' : 'Disabled'}
                        </span>
                        <Switch
                          checked={eventType.is_active}
                          onCheckedChange={(checked) => toggleEventType(eventType.id, checked)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* New Event Type Card */}
                <button
                  onClick={async () => {
                    await triggerHaptic(ImpactStyle.Heavy);
                    navigate('/dashboard/events/new');
                  }}
                  className="bg-transparent rounded-[2rem] border-2 border-dashed border-border p-6 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] group active:scale-95"
                >
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 bg-gradient-to-br from-primary/10 to-orange-500/10">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-bold text-lg">New Event Type</span>
                  <p className="text-sm text-muted-foreground mt-2">Create a new booking link</p>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Upcoming Bookings */}
          <div className="w-full lg:w-96 order-1 lg:order-2">
            <div className="bg-card/30 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-6 md:p-8 sticky top-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-xl">Upcoming</h2>
                </div>
                {Capacitor.isNativePlatform() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 font-bold rounded-full"
                    onClick={() => registerPush()}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Push
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking, idx) => {
                    const bookingDate = new Date(booking.start_time);
                    const isBookingToday = isToday(bookingDate);

                    return (
                      <div
                        key={booking.id}
                        className="group cursor-pointer animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
                        style={{ animationDelay: `${idx * 150}ms` }}
                        onClick={() => navigate(`/dashboard/bookings?id=${booking.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isBookingToday ? "bg-primary shadow-[0_0_10px_rgba(255,145,36,0.8)]" : "bg-muted-foreground/30"
                          )}></div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                            {isBookingToday ? 'Today' : format(bookingDate, 'EEE, MMM d')} • {format(bookingDate, 'h:mm a')}
                          </span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-300 transform group-hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-sm text-foreground">{booking.attendee_name}</p>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Video className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{booking.event_type?.title || 'Meeting'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-6 rounded-3xl bg-white/5 border border-dashed border-white/10">
                    <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Waiting for your first booking...
                    </p>
                  </div>
                )}
              </div>

              {/* Stats / Pro Tip Card */}
              <div className="mt-8 bg-gradient-to-br from-primary/20 via-orange-500/10 to-transparent rounded-[2rem] p-6 border border-primary/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-20 h-20 text-primary rotate-12" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Growth Tip
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Share your unified profile link to let people choose from all your event types.
                  </p>
                  <Button
                    className="w-full rounded-xl bg-primary text-white font-bold h-10 hover:bg-primary/90 shadow-lg shadow-primary/20 group/copy"
                    onClick={async () => {
                      await triggerHaptic(ImpactStyle.Medium);
                      const username = profile?.username;
                      if (!username) {
                        toast.error('Set username in settings');
                        return;
                      }
                      const url = `${window.location.origin}/book/${username}`;
                      navigator.clipboard.writeText(url).then(() => toast.success('Profile Link Copied!'));
                    }}
                  >
                    Copy Profile Link
                    <Share2 className="ml-2 w-4 h-4 group-hover/copy:scale-110 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
