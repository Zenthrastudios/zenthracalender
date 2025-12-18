import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useScheduling } from '@/contexts/SchedulingContext';
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
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { eventTypes, updateEventType, bookings, user } = useScheduling();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredEventTypes = eventTypes.filter(et => 
    et.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed' && new Date(b.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/book/${user?.username || 'alex'}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const toggleEventType = (id: string, isActive: boolean) => {
    updateEventType(id, { isActive });
    toast.success(isActive ? 'Event type enabled' : 'Event type disabled');
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
      case 'zoom':
        return <Video className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Event Types</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search event types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-card border-border"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
            </Button>
            <Button onClick={() => navigate('/dashboard/events/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Event Types Grid */}
          <div className="flex-1">
            <p className="text-muted-foreground mb-6">
              Create and manage your booking links. Share these links with people to let them book time with you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEventTypes.map((eventType) => (
                <div
                  key={eventType.id}
                  className={cn(
                    "bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-all duration-200 group",
                    !eventType.isActive && "opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {eventType.isActive ? (
                        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                          {getLocationIcon(eventType.locationType)}
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

                  <h3 className="font-semibold text-lg mb-1">{eventType.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {eventType.duration}m • One-on-One {!eventType.isActive && '• Hidden'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <button
                      onClick={() => copyLink(eventType.slug)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      /{user?.username || 'alex'}/{eventType.slug}
                    </button>
                    <Switch
                      checked={eventType.isActive}
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
          </div>

          {/* Sidebar - Upcoming Bookings */}
          <div className="w-80">
            <div className="bg-accent/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Upcoming</h2>
                <button className="text-sm text-primary hover:underline font-medium">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map((booking, index) => {
                    const isToday = format(new Date(booking.startTime), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const isTomorrow = format(new Date(booking.startTime), 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
                    
                    return (
                      <div key={booking.id} className="relative">
                        {index === 0 || format(new Date(upcomingBookings[index - 1].startTime), 'yyyy-MM-dd') !== format(new Date(booking.startTime), 'yyyy-MM-dd') ? (
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              isToday ? "bg-primary" : "bg-muted-foreground/30"
                            )}></div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(new Date(booking.startTime), 'EEE, MMM d')}, {format(new Date(booking.startTime), 'h:mm a')}
                            </span>
                          </div>
                        ) : null}
                        <div className="ml-4 bg-card rounded-lg p-3 shadow-sm">
                          <p className="font-medium text-sm">{booking.attendeeName}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Video className="w-3 h-3" />
                            <span>Google Meet</span>
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
                      Connect your calendar to avoid double bookings automatically.
                    </p>
                    <button className="text-xs text-primary hover:underline font-medium mt-2">
                      Connect Calendar
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
