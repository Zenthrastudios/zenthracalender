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
  MoreHorizontal,
  Lock,
  Phone,
  MapPin,
  IndianRupee
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: eventTypes, isLoading: eventTypesLoading } = useEventTypes();
  const { data: upcomingBookings } = useBookings('upcoming');
  const updateEventType = useUpdateEventType();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredEventTypes = eventTypes?.filter(et =>
    et.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const recentBookings = upcomingBookings?.slice(0, 5) || [];

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/book/${profile?.username || 'user'}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const toggleEventType = async (id: string, isActive: boolean) => {
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
                {filteredEventTypes.map((eventType) => (
                  <div
                    key={eventType.id}
                    className={cn(
                      "bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-all duration-200 group",
                      !eventType.is_active && "opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {eventType.is_active ? (
                          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-background">
                            {getLocationIcon(eventType.location_type)}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyLink(eventType.slug)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/dashboard/events/${eventType.id}`)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{eventType.title}</h3>
                      {(eventType as any).is_paid && (eventType as any).price > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <IndianRupee className="w-3 h-3 mr-0.5" />
                          {(eventType as any).price}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {eventType.duration}m • One-on-One {!eventType.is_active && '• Hidden'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <button
                        onClick={() => copyLink(eventType.slug)}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        /{profile?.username || 'user'}/{eventType.slug}
                      </button>
                      <Switch
                        checked={eventType.is_active}
                        onCheckedChange={(checked) => toggleEventType(eventType.id, checked)}
                      />
                    </div>
                  </div>
                ))}

                {/* New Event Type Card */}
                <button
                  onClick={() => navigate('/dashboard/events/new')}
                  className="bg-transparent rounded-xl border-2 border-dashed border-border p-5 hover:border-primary/50 hover:bg-accent/30 transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] group"
                >
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-semibold">New Event Type</span>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Upcoming Bookings */}
          <div className="w-full lg:w-80 order-1 lg:order-2">
            <div className="bg-accent/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Upcoming</h2>
                <button
                  onClick={() => navigate('/dashboard/bookings')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => {
                    const bookingDate = new Date(booking.start_time);
                    const isBookingToday = isToday(bookingDate);

                    return (
                      <div key={booking.id} className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isBookingToday ? "bg-primary" : "bg-muted-foreground/30"
                          )}></div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {isBookingToday ? 'Today' : format(bookingDate, 'EEE, MMM d')}, {format(bookingDate, 'h:mm a')}
                          </span>
                        </div>
                        <div className="ml-4 bg-card rounded-lg p-3 shadow-sm">
                          <p className="font-medium text-sm">{booking.attendee_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Video className="w-3 h-3" />
                            <span>{booking.event_type?.title || 'Meeting'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming bookings
                  </p>
                )}
              </div>

              {/* Pro Tip */}
              <div className="mt-6 bg-accent rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                  <div>
                    <p className="font-medium text-sm">Pro Tip</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share your booking link: /{profile?.username || 'user'}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book/${profile?.username || 'user'}`);
                        toast.success('Link copied!');
                      }}
                      className="text-xs text-primary hover:underline font-medium mt-2"
                    >
                      Copy your link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
