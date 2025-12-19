import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Mail, Video, MapPin, LogOut, ExternalLink } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { toast } from 'sonner';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  meet_link: string | null;
  notes: string | null;
  attendee_timezone: string;
  reschedule_token: string | null;
  cancel_token: string | null;
  event_type: {
    title: string;
    duration: number;
    location_type: string;
  } | null;
  host: {
    name: string;
    username: string | null;
  } | null;
}

export default function GuestDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchBookings();
    }
  }, [user?.email]);

  const fetchBookings = async () => {
    if (!user?.email) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          status,
          meet_link,
          notes,
          attendee_timezone,
          reschedule_token,
          cancel_token,
          event_type:event_types(
            title,
            duration,
            location_type
          ),
          host:profiles!bookings_host_id_fkey(
            name,
            username
          )
        `)
        .ilike('attendee_email', user.email)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((booking: any) => ({
        ...booking,
        event_type: Array.isArray(booking.event_type) ? booking.event_type[0] : booking.event_type,
        host: Array.isArray(booking.host) ? booking.host[0] : booking.host,
      }));

      setBookings(transformed as Booking[]);
    } catch (error: any) {
      console.error('Error fetching guest bookings:', error);
      toast.error(error?.message || 'Failed to load your bookings');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && !isPast(parseISO(b.end_time))
  );
  const pastBookings = bookings.filter(
    b => b.status !== 'confirmed' || isPast(parseISO(b.end_time))
  );

  const getStatusBadge = (status: string, endTime: string) => {
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isPast(parseISO(endTime))) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    return <Badge className="bg-green-500">Confirmed</Badge>;
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
        return <Video className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">{profile?.name || 'Guest'}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">My Bookings</h2>
          <p className="text-muted-foreground">View and manage your scheduled sessions</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading your bookings...</div>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No bookings yet</h3>
              <p className="text-muted-foreground">
                You haven't booked any sessions. Check out available sessions to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Sessions ({upcomingBookings.length})
                </h3>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <Card key={booking.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">
                                {booking.event_type?.title || 'Session'}
                              </h4>
                              {getStatusBadge(booking.status, booking.end_time)}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(parseISO(booking.start_time), 'h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                              </div>
                              <div className="flex items-center gap-1">
                                {getLocationIcon(booking.event_types?.location_type || 'in_person')}
                                {booking.event_type?.duration} min
                              </div>
                            </div>

                            {booking.host && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                Host: {booking.host.name}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {booking.meet_link && (
                              <Button asChild>
                                <a href={booking.meet_link} target="_blank" rel="noopener noreferrer">
                                  <Video className="w-4 h-4 mr-2" />
                                  Join Meeting
                                </a>
                              </Button>
                            )}
                            {booking.reschedule_token && (
                              <Button variant="outline" asChild>
                                <Link to={`/reschedule/${booking.reschedule_token}`}>
                                  Reschedule
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Past Sessions ({pastBookings.length})
                </h3>
                <div className="space-y-4 opacity-75">
                  {pastBookings.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">
                                {booking.event_type?.title || 'Session'}
                              </h4>
                              {getStatusBadge(booking.status, booking.end_time)}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(booking.start_time), 'MMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(parseISO(booking.start_time), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
