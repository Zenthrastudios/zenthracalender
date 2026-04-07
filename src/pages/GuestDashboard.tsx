import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, LogOut, Video, MapPin, FileText, ExternalLink, Package, GraduationCap, Play } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { toast } from 'sonner';

interface Booking {
  id: string;
  host_id: string;
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
    location_value?: string | null;
  } | null;
  host: {
    name: string;
    username: string | null;
  } | null;
}

interface ProductPurchase {
  id: string;
  created_at: string;
  amount: number;
  access_token: string;
  product: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
  } | null;
}

interface CoursePurchase {
  id: string;
  created_at: string;
  amount: number;
  access_token: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    instructor: {
      name: string;
    } | null;
  } | null;
}

const db = supabase as any;

export default function GuestDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<ProductPurchase[]>([]);
  const [courses, setCourses] = useState<CoursePurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchData();
    }
  }, [user?.email]);

  const fetchData = async () => {
    if (!user?.email) return;

    setIsLoading(true);

    try {
      // Fetch Bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          host_id,
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
            location_type,
            location_value
          )
        `)
        .ilike('attendee_email', user.email)
        .order('start_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Transform Bookings
      const bookingRows = (bookingsData || []).map((booking: any) => ({
        ...booking,
        event_type: Array.isArray(booking.event_type) ? booking.event_type[0] : booking.event_type,
      }));

      const hostIds = Array.from(new Set(bookingRows.map((b: any) => b.host_id).filter(Boolean)));
      let hostByUserId = new Map<string, { name: string; username: string | null }>();

      if (hostIds.length > 0) {
        const { data: hostProfiles, error: hostError } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', hostIds);

        if (!hostError && hostProfiles) {
          hostProfiles.forEach((p: any) => {
            hostByUserId.set(p.user_id, { name: p.name, username: p.username });
          });
        }
      }

      const transformedBookings = bookingRows.map((b: any) => ({
        ...b,
        host: hostByUserId.get(b.host_id) || null,
      }));

      setBookings(transformedBookings as Booking[]);

      // Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from('product_purchases')
        .select('id, created_at, amount, access_token, product:digital_products(id, title, description, thumbnail_url)')
        .eq('customer_email', user.email)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Deduplicate products by product.id
      const uniqueProducts = (productsData || []).reduce((acc: ProductPurchase[], curr: any) => {
        if (curr.product && !acc.some(p => p.product?.id === curr.product?.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setProducts(uniqueProducts);

      // Fetch Courses
      const { data: coursesData, error: coursesError } = await db
        .from('course_purchases')
        .select(`
          id, 
          created_at, 
          amount, 
          access_token, 
          course:courses(
            id, 
            title, 
            description, 
            thumbnail_url
          )
        `)
        .eq('customer_email', user.email)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Deduplicate courses by course.id
      const uniqueCourses = (coursesData || []).reduce((acc: CoursePurchase[], curr: any) => {
        if (curr.course && !acc.some(p => p.course?.id === curr.course?.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setCourses(uniqueCourses);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // ... helpers ...
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

  const getJoinLink = (booking: Booking) => {
    const meetLink = booking.meet_link;
    if (meetLink) return meetLink;
    const lv = booking.event_type?.location_value;
    if (lv && /^https?:\/\//i.test(lv)) return lv;
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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

      {/* Creator Nudge */}
      <div className="bg-orange-600/5 border-b border-orange-600/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-200 text-center sm:text-left">
            Looking to create your own booking page and sell products?
          </p>
          <Button
            size="sm"
            variant="default"
            className="bg-orange-600 hover:bg-orange-700 text-white border-none shadow-sm whitespace-nowrap"
            onClick={() => navigate('/onboarding')}
          >
            Become a Creator <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">My Library</h2>
          <p className="text-muted-foreground">Access your bookings, purchases, and resources.</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="products">Digital Products</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Quick Overview Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingBookings.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courses.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Digital Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                </CardContent>
              </Card>
            </div>

            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Next Session</h3>
                <Card className="overflow-hidden border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    {/* Render just the first upcoming booking as a summary */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{upcomingBookings[0].event_type?.title}</h4>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(parseISO(upcomingBookings[0].start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      {getJoinLink(upcomingBookings[0]) && (
                        <Button asChild>
                          <a href={getJoinLink(upcomingBookings[0]) as string} target="_blank" rel="noopener noreferrer">Download / Join</a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Course Access Prompt */}
            {courses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Jump Back In</h3>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-48 h-32 bg-muted relative">
                        {courses[0].course?.thumbnail_url ? (
                          <img
                            src={courses[0].course?.thumbnail_url}
                            alt={courses[0].course?.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <GraduationCap className="w-8 h-8 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                          <h4 className="font-semibold text-lg">{courses[0].course?.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{courses[0].course?.description}</p>
                        </div>
                        <Button asChild>
                          <Link to={`/course/${courses[0].access_token}`}>
                            <Play className="w-4 h-4 mr-2" /> Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading bookings...</div>
              </div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground">You haven't booked any sessions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Upcoming Bookings Listing (Reuse existing logic) */}
                {upcomingBookings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" /> Upcoming
                    </h3>
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{booking.event_type?.title}</h4>
                                {getStatusBadge(booking.status, booking.end_time)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {format(parseISO(booking.start_time), 'MMM d, h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getLocationIcon(booking.event_type?.location_type || '')}
                                  {booking.event_type?.location_type}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getJoinLink(booking) && (
                                <Button asChild size="sm">
                                  <a href={getJoinLink(booking) as string} target="_blank" rel="noopener noreferrer">
                                    Join
                                  </a>
                                </Button>
                              )}
                              {booking.reschedule_token && (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/reschedule/${booking.reschedule_token}`}>Reschedule</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {pastBookings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5" /> Past
                    </h3>
                    {pastBookings.map((booking) => (
                      <Card key={booking.id} className="opacity-75">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{booking.event_type?.title}</p>
                              <p className="text-sm text-muted-foreground">{format(parseISO(booking.start_time), 'MMM d, yyyy')}</p>
                            </div>
                            {getStatusBadge(booking.status, booking.end_time)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">Loading courses...</div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No courses found</h3>
                  <p className="text-muted-foreground">You haven't enrolled in any courses yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((purchase) => (
                  <Card key={purchase.id} className="overflow-hidden flex flex-col group hover:shadow-lg transition-all border-zinc-800">
                    <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden">
                      {purchase.course?.thumbnail_url ? (
                        <img
                          src={purchase.course.thumbnail_url}
                          alt={purchase.course.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <GraduationCap className="w-12 h-12 text-zinc-600" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-blue-500/90 hover:bg-blue-500">Enrolled</Badge>
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="line-clamp-1 text-lg">{purchase.course?.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">{purchase.course?.description}</CardDescription>
                      {purchase.course?.instructor?.name && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {purchase.course.instructor.name}
                        </div>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto p-4 pt-0">
                      <Button className="w-full" asChild>
                        <Link to={`/course/${purchase.access_token}`}>
                          Go to Course <Play className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">Loading products...</div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No products found</h3>
                  <p className="text-muted-foreground">You haven't purchased any digital products yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((purchase) => (
                  <Card key={purchase.id} className="overflow-hidden flex flex-col group hover:shadow-lg transition-all">
                    <div className="aspect-video w-full bg-muted relative overflow-hidden">
                      {purchase.product?.thumbnail_url ? (
                        <img
                          src={purchase.product.thumbnail_url}
                          alt={purchase.product.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-500/90 hover:bg-green-500">Purchased</Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1 text-lg">{purchase.product?.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{purchase.product?.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="mt-auto pt-0">
                      <Button className="w-full" onClick={() => navigate(`/view/${purchase.access_token}`)}>
                        View Content <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
