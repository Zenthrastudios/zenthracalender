import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, MapPin, Phone, Search, ArrowLeft, User, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Booking {
  id: string;
  host_id: string;
  start_time: string;
  end_time: string;
  status: string;
  attendee_name: string;
  attendee_email: string;
  attendee_timezone: string;
  notes: string | null;
  meet_link: string | null;
  cancel_token: string | null;
  reschedule_token: string | null;
  event_type: {
    title: string;
    duration: number;
    location_type: string;
    location_value: string | null;
  } | null;
  host: {
    name: string;
    username: string | null;
  } | null;
}

export default function MyBookings() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-fetch bookings if user is logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      fetchBookings(user.email);
    }
  }, [user]);

  const fetchBookings = async (searchEmail: string) => {
    if (!searchEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          host_id,
          start_time,
          end_time,
          status,
          attendee_name,
          attendee_email,
          attendee_timezone,
          notes,
          meet_link,
          cancel_token,
          reschedule_token,
          event_type:event_types(title, duration, location_type, location_value),
          host_id
        `)
        .ilike('attendee_email', searchEmail.trim())
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Transform data to handle the joined relations
      const rows = (data || []).map((booking: any) => ({
        ...booking,
        event_type: Array.isArray(booking.event_type) ? booking.event_type[0] : booking.event_type,
      }));

      const hostIds = Array.from(new Set(rows.map((b: any) => b.host_id).filter(Boolean)));
      let hostByUserId = new Map<string, { name: string; username: string | null }>();

      if (hostIds.length > 0) {
        const { data: hostProfiles, error: hostError } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', hostIds);

        if (hostError) throw hostError;

        (hostProfiles || []).forEach((p: any) => {
          hostByUserId.set(p.user_id, { name: p.name, username: p.username });
        });
      }

      const transformedBookings = rows.map((b: any) => ({
        ...b,
        host: hostByUserId.get(b.host_id) || null,
      }));

      setBookings(transformedBookings as Booking[]);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings(email);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'google_meet':
        return <Video className="w-4 h-4" />;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.start_time) > new Date()
  );
  const pastBookings = bookings.filter(
    b => b.status !== 'confirmed' || new Date(b.start_time) <= new Date()
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Calendar className="w-5 h-5 text-background" />
          </div>
          <span className="font-semibold text-lg">CalSchedule</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your scheduled meetings
          </p>
        </div>

        {/* Search Form */}
        {!user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Find Your Bookings</CardTitle>
              <CardDescription>
                Enter the email address you used when booking to see your appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                <Button type="submit" className="h-12 px-6" disabled={isLoading}>
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Find Bookings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Logged in user info */}
        {user && (
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Showing bookings for: <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasSearched && (
          <>
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find any bookings associated with this email address.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Upcoming Bookings */}
                {upcomingBookings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Upcoming ({upcomingBookings.length})
                    </h2>
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getStatusBadge(booking.status)}
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {booking.event_type?.title || 'Meeting'}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                  with {booking.host?.name || 'Host'}
                                </p>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getLocationIcon(booking.event_type?.location_type || 'google_meet')}
                                    {booking.event_type?.location_type === 'google_meet' ? 'Google Meet' :
                                     booking.event_type?.location_type === 'zoom' ? 'Zoom' :
                                     booking.event_type?.location_type === 'phone' ? 'Phone Call' :
                                     booking.event_type?.location_type === 'in_person' ? 'In Person' : 'Video Call'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                {booking.meet_link && (
                                  <a href={booking.meet_link} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" className="w-full">
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Join Meeting
                                    </Button>
                                  </a>
                                )}
                                {booking.reschedule_token && (
                                  <Link to={`/reschedule/${booking.reschedule_token}`}>
                                    <Button variant="outline" size="sm" className="w-full">
                                      Reschedule
                                    </Button>
                                  </Link>
                                )}
                                {booking.cancel_token && (
                                  <Link to={`/cancel/${booking.cancel_token}`}>
                                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                                      Cancel
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past/Cancelled Bookings */}
                {pastBookings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                      Past & Cancelled ({pastBookings.length})
                    </h2>
                    <div className="space-y-4">
                      {pastBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden opacity-75">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getStatusBadge(booking.status)}
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {booking.event_type?.title || 'Meeting'}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                  with {booking.host?.name || 'Host'}
                                </p>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(booking.start_time), 'h:mm a')}
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
          </>
        )}

        {/* Initial state for non-logged in users */}
        {!hasSearched && !user && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Enter your email to find bookings</h3>
              <p className="text-muted-foreground">
                Use the search form above to find appointments booked with your email address.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
