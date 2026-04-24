import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Play,
  User,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useCreateSupportTicket } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input as UIInput } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CreatorProfile {
  user_id: string;
  name: string;
  username: string | null;
}

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
  host: CreatorProfile | null;
}

interface ProductPurchase {
  id: string;
  created_at: string;
  amount: number;
  access_token: string;
  product: {
    id: string;
    user_id: string;
    title: string;
    slug: string | null;
    description: string | null;
    thumbnail_url: string | null;
    file_type: string | null;
    price: number | null;
  } | null;
}

interface CoursePurchase {
  id: string;
  created_at: string;
  amount: number;
  access_token: string;
  course: {
    id: string;
    user_id: string;
    slug: string | null;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    instructor?: {
      name: string;
    } | null;
  } | null;
}

interface AvailableProduct {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnail_url: string | null;
  file_type: string | null;
  price: number | null;
  creator: CreatorProfile | null;
}

interface AvailableSession {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  duration: number;
  location_type: string;
  price: number | null;
  is_paid: boolean | null;
  creator: CreatorProfile | null;
}

const db = supabase as any;

const normalizeRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const formatPrice = (value: number | null | undefined) => {
  if (!value || value <= 0) {
    return 'Free';
  }

  return value.toLocaleString('en-IN');
};

const getLocationLabel = (type: string) => {
  switch (type) {
    case 'google_meet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom';
    case 'phone':
      return 'Phone Call';
    case 'in_person':
      return 'In Person';
    default:
      return type ? type.replace(/_/g, ' ') : 'Session';
  }
};

const getProductViewLabel = (fileType: string | null | undefined) => {
  return fileType?.toLowerCase() === 'pdf' ? 'View PDF' : 'View Content';
};

export default function GuestDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const createTicket = useCreateSupportTicket();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<ProductPurchase[]>([]);
  const [courses, setCourses] = useState<CoursePurchase[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.email) {
      void fetchData();
    }
  }, [user?.email]);

  const fetchData = async () => {
    if (!user?.email) return;

    setIsLoading(true);

    try {
      const [bookingsResult, productsResult, coursesResult] = await Promise.all([
        supabase
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
          .order('start_time', { ascending: true }),
        supabase
          .from('product_purchases')
          .select(`
            id,
            created_at,
            amount,
            access_token,
            product:digital_products(
              id,
              user_id,
              title,
              slug,
              description,
              thumbnail_url,
              file_type,
              price
            )
          `)
          .eq('customer_email', user.email)
          .eq('status', 'paid')
          .order('created_at', { ascending: false }),
        db
          .from('course_purchases')
          .select(`
            id,
            created_at,
            amount,
            access_token,
            course:courses(
              id,
              user_id,
              slug,
              title,
              description,
              thumbnail_url
            )
          `)
          .eq('customer_email', user.email)
          .eq('status', 'paid')
          .order('created_at', { ascending: false }),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (coursesResult.error) throw coursesResult.error;

      const bookingRows = (bookingsResult.data || []).map((booking: any) => ({
        ...booking,
        event_type: normalizeRelation(booking.event_type),
      }));

      const uniqueProducts = (productsResult.data || []).reduce((acc: ProductPurchase[], curr: any) => {
        const product = normalizeRelation(curr.product);

        if (product && !acc.some((purchase) => purchase.product?.id === product.id)) {
          acc.push({
            ...curr,
            product,
          });
        }

        return acc;
      }, []);

      const uniqueCourses = (coursesResult.data || []).reduce((acc: CoursePurchase[], curr: any) => {
        const course = normalizeRelation(curr.course);

        if (course && !acc.some((purchase) => purchase.course?.id === course.id)) {
          acc.push({
            ...curr,
            course,
          });
        }

        return acc;
      }, []);

      const [productCatalogResult, sessionCatalogResult] = await Promise.all([
        supabase
          .from('digital_products')
          .select('id, user_id, title, slug, description, thumbnail_url, file_type, price')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('event_types')
          .select('id, user_id, title, slug, description, duration, location_type, price, is_paid')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      if (productCatalogResult.error) throw productCatalogResult.error;
      if (sessionCatalogResult.error) throw sessionCatalogResult.error;

      const allProducts = productCatalogResult.data || [];
      const allSessions = sessionCatalogResult.data || [];

      const creatorIds = Array.from(
        new Set(
          [
            ...bookingRows.map((booking: any) => booking.host_id),
            ...uniqueProducts.map((purchase) => purchase.product?.user_id),
            ...uniqueCourses.map((purchase) => purchase.course?.user_id),
            ...allProducts.map((p: any) => p.user_id),
            ...allSessions.map((s: any) => s.user_id),
          ].filter((id): id is string => Boolean(id))
        )
      );

      let creatorById = new Map<string, CreatorProfile>();

      if (creatorIds.length > 0) {
        const { data: creatorProfiles, error: creatorProfilesError } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', creatorIds);

        if (creatorProfilesError) throw creatorProfilesError;

        creatorById = new Map(
          (creatorProfiles || []).map((creator: any) => [
            creator.user_id,
            {
              user_id: creator.user_id,
              name: creator.name,
              username: creator.username,
            } as CreatorProfile,
          ])
        );
      }

      const transformedBookings = bookingRows.map((booking: any) => ({
        ...booking,
        host: creatorById.get(booking.host_id) || null,
      }));

      const purchasedProductIds = new Set(
        uniqueProducts
          .map((purchase) => purchase.product?.id)
          .filter((id): id is string => Boolean(id))
      );

      const discoverProducts = allProducts
        .filter((product: any) => !purchasedProductIds.has(product.id))
        .map((product: any) => ({
          ...product,
          creator: creatorById.get(product.user_id) || null,
        }))
        .filter(
          (product: AvailableProduct) =>
            Boolean(product.slug) && Boolean(product.creator?.username)
        );

      const discoverSessions = allSessions
        .map((session: any) => ({
          ...session,
          creator: creatorById.get(session.user_id) || null,
        }))
        .filter(
          (session: AvailableSession) =>
            Boolean(session.slug) && Boolean(session.creator?.username)
        );

      setBookings(transformedBookings as Booking[]);
      setProducts(uniqueProducts);
      setCourses(uniqueCourses);
      setAvailableProducts(discoverProducts);
      setAvailableSessions(discoverSessions);
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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmittingTicket(true);

    try {
      await createTicket.mutateAsync({
        customer_name: profile?.name || 'Guest',
        customer_email: user?.email || '',
        subject: ticketSubject,
        message: ticketMessage,
        status: 'pending',
        user_id: bookings[0]?.host_id || undefined,
      });

      toast.success('Support ticket created! We will get back to you soon.');
      setTicketSubject('');
      setTicketMessage('');
      setIsContactOpen(false);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const upcomingBookings = bookings.filter(
    (booking) => booking.status === 'confirmed' && !isPast(parseISO(booking.end_time))
  );
  const pastBookings = bookings.filter(
    (booking) => booking.status !== 'confirmed' || isPast(parseISO(booking.end_time))
  );
  const overviewProducts = availableProducts.slice(0, 3);
  const overviewSessions = availableSessions.slice(0, 3);
  const hasDiscoverContent = overviewProducts.length > 0 || overviewSessions.length > 0;

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
      case 'zoom':
        return <Video className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getJoinLink = (booking: Booking) => {
    const meetLink = booking.meet_link;
    if (meetLink) return meetLink;

    const locationValue = booking.event_type?.location_value;
    if (locationValue && /^https?:\/\//i.test(locationValue)) return locationValue;

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
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

      <div className="bg-primary/5 border-b border-primary/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-primary/80 text-center sm:text-left">
            Need help with your bookings or courses? Our support team is here for you.
          </p>
          <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="bg-primary hover:bg-primary/90 text-white border-none shadow-sm whitespace-nowrap"
              >
                Contact Support <MessageSquare className="w-3 h-3 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Contact Support</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Send a message below, or contact us directly via WhatsApp/Phone at <a href="https://wa.me/917708867107" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">+91 7708867107</a>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSupportSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <UILabel htmlFor="subject" className="text-foreground">
                    Subject
                  </UILabel>
                  <UIInput
                    id="subject"
                    placeholder="What do you need help with?"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="bg-muted border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <UILabel htmlFor="message" className="text-foreground">
                    Message
                  </UILabel>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="bg-muted border-border text-foreground min-h-[120px]"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="w-full bg-primary text-white hover:bg-primary/90"
                  >
                    {isSubmittingTicket ? 'Sending...' : 'Send Message'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">My Library</h2>
          <p className="text-muted-foreground">
            Access your bookings, purchases, and resources.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="products">Digital Products</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 hide-scrollbar">
              <button
                onClick={() => setActiveTab('bookings')}
                className="flex-1 min-w-[130px] text-left bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/50 transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                    Upcoming Sessions
                  </span>
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">{upcomingBookings.length}</div>
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className="flex-1 min-w-[130px] text-left bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/50 transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                    Enrolled Courses
                  </span>
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">{courses.length}</div>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className="flex-1 min-w-[130px] text-left bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/50 transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                    Digital Products
                  </span>
                  <Package className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">{products.length}</div>
              </button>
            </div>

            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Next Session</h3>
                <Card className="overflow-hidden border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {upcomingBookings[0].event_type?.title}
                        </h4>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(
                            parseISO(upcomingBookings[0].start_time),
                            'EEEE, MMMM d, yyyy - h:mm a'
                          )}
                        </p>
                      </div>
                      {getJoinLink(upcomingBookings[0]) && (
                        <Button asChild>
                          <a
                            href={getJoinLink(upcomingBookings[0]) as string}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Join Session
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {courses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Jump Back In</h3>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-64 aspect-video bg-muted relative shrink-0">
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
                      <div className="p-5 sm:p-6 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg leading-tight">
                            {courses[0].course?.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {courses[0].course?.description}
                          </p>
                        </div>
                        <Button className="w-full md:w-auto shrink-0" asChild>
                          <Link to={`/course/${courses[0].access_token}`}>
                            <Play className="w-4 h-4 mr-2" fill="currentColor" />
                            Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isLoading && hasDiscoverContent && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Explore More</h3>
                  <p className="text-sm text-muted-foreground">
                    More sessions and digital products from creators you&apos;ve already connected with.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {overviewSessions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Book Another Session
                        </CardTitle>
                        <CardDescription>
                          Choose another session from the same creators.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {overviewSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-4"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{session.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {session.creator?.name}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{session.duration} min</span>
                                <span>{getLocationLabel(session.location_type)}</span>
                                <span>
                                  {session.is_paid && session.price && session.price > 0
                                    ? `INR ${formatPrice(session.price)}`
                                    : 'Free'}
                                </span>
                              </div>
                            </div>
                            <Button asChild size="sm">
                              <Link to={`/book/${session.creator?.username}/${session.slug}`}>
                                Book
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {overviewProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          Unpurchased Digital Products
                        </CardTitle>
                        <CardDescription>
                          Digital products you can open and purchase from your creators.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {overviewProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-4"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{product.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.creator?.name}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{(product.file_type || 'file').toUpperCase()}</span>
                                <span>
                                  {product.price && product.price > 0
                                    ? `INR ${formatPrice(product.price)}`
                                    : 'Free'}
                                </span>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/store/${product.creator?.username}/${product.slug}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading bookings...</div>
              </div>
            ) : (
              <div className="space-y-8">
                {bookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No bookings yet
                      </h3>
                      <p className="text-muted-foreground">
                        You haven&apos;t booked any sessions yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {upcomingBookings.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          Upcoming
                        </h3>
                        {upcomingBookings.map((booking) => (
                          <Card key={booking.id}>
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold">{booking.event_type?.title}</h4>
                                    {getStatusBadge(booking.status, booking.end_time)}
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      {format(parseISO(booking.start_time), 'MMM d, h:mm a')} -{' '}
                                      {format(parseISO(booking.end_time), 'h:mm a')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getLocationIcon(booking.event_type?.location_type || '')}
                                      {getLocationLabel(booking.event_type?.location_type || '')}
                                    </div>
                                    {booking.host?.name && (
                                      <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {booking.host.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getJoinLink(booking) && (
                                    <Button asChild size="sm">
                                      <a
                                        href={getJoinLink(booking) as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Join
                                      </a>
                                    </Button>
                                  )}
                                  {booking.reschedule_token && (
                                    <Button variant="outline" size="sm" asChild>
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
                    )}

                    {pastBookings.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-5 h-5" />
                          Past
                        </h3>
                        {pastBookings.map((booking) => (
                          <Card key={booking.id} className="opacity-75">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center gap-4">
                                <div>
                                  <p className="font-medium">{booking.event_type?.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(booking.start_time), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                {getStatusBadge(booking.status, booking.end_time)}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {availableSessions.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Available Sessions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Book another session from creators you already know.
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {availableSessions.map((session) => (
                        <Card key={session.id} className="flex flex-col">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <CardTitle className="text-lg">{session.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {session.creator?.name}
                                </CardDescription>
                              </div>
                              <Badge variant="outline">
                                {session.is_paid && session.price && session.price > 0
                                  ? 'Paid'
                                  : 'Free'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {session.description || 'Book this session to continue with your creator.'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{session.duration} min</Badge>
                              <Badge variant="secondary">
                                {getLocationLabel(session.location_type)}
                              </Badge>
                              <Badge variant="secondary">
                                {session.price && session.price > 0 ? (
                                  <span className="inline-flex items-center gap-1">
                                    <IndianRupee className="w-3 h-3" />
                                    {formatPrice(session.price)}
                                  </span>
                                ) : (
                                  'Free'
                                )}
                              </Badge>
                            </div>
                          </CardContent>
                          <CardFooter className="mt-auto">
                            <Button className="w-full" asChild>
                              <Link to={`/book/${session.creator?.username}/${session.slug}`}>
                                Book Session
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
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
                  <p className="text-muted-foreground">
                    You haven&apos;t enrolled in any courses yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((purchase) => (
                  <Card
                    key={purchase.id}
                    className="overflow-hidden flex flex-col group hover:shadow-lg transition-all border-zinc-800"
                  >
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
                      <Badge className="absolute top-2 right-2 bg-blue-500/90 hover:bg-blue-500">
                        Enrolled
                      </Badge>
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="line-clamp-1 text-lg">
                        {purchase.course?.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {purchase.course?.description}
                      </CardDescription>
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
            ) : (
              <div className="space-y-8">
                {products.length === 0 && availableProducts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No products found</h3>
                      <p className="text-muted-foreground">
                        You don&apos;t have any digital products available yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          Purchased Products
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Open your purchased PDFs and digital downloads.
                        </p>
                      </div>

                      {products.length === 0 ? (
                        <Card>
                          <CardContent className="py-10 text-center">
                            <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                            <h4 className="font-medium mb-1">No purchased products yet</h4>
                            <p className="text-sm text-muted-foreground">
                              Your bought products will appear here with direct PDF access.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {products.map((purchase) => (
                            <Card
                              key={purchase.id}
                              className="overflow-hidden flex flex-col group hover:shadow-lg transition-all"
                            >
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
                                <Badge className="absolute top-2 right-2 bg-green-500/90 hover:bg-green-500">
                                  Purchased
                                </Badge>
                              </div>
                              <CardHeader>
                                <CardTitle className="line-clamp-1 text-lg">
                                  {purchase.product?.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {purchase.product?.description}
                                </CardDescription>
                              </CardHeader>
                              <CardFooter className="mt-auto pt-0">
                                <Button
                                  className="w-full"
                                  onClick={() => navigate(`/view/${purchase.access_token}`)}
                                >
                                  {getProductViewLabel(purchase.product?.file_type)}
                                  <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {availableProducts.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Unpurchased Digital Products
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Products from your creators that you can still buy and open.
                          </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {availableProducts.map((product) => (
                            <Card
                              key={product.id}
                              className="overflow-hidden flex flex-col group hover:shadow-lg transition-all"
                            >
                              <div className="aspect-video w-full bg-muted relative overflow-hidden">
                                {product.thumbnail_url ? (
                                  <img
                                    src={product.thumbnail_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-muted-foreground/30" />
                                  </div>
                                )}
                                <Badge variant="secondary" className="absolute top-2 right-2">
                                  {(product.file_type || 'file').toUpperCase()}
                                </Badge>
                              </div>
                              <CardHeader>
                                <CardTitle className="line-clamp-1 text-lg">
                                  {product.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {product.description}
                                </CardDescription>
                                <p className="text-xs text-muted-foreground">
                                  by {product.creator?.name}
                                </p>
                              </CardHeader>
                              <CardFooter className="mt-auto pt-0 flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
                                  {product.price && product.price > 0 ? (
                                    <>
                                      <IndianRupee className="w-4 h-4" />
                                      {formatPrice(product.price)}
                                    </>
                                  ) : (
                                    'Free'
                                  )}
                                </div>
                                <Button asChild>
                                  <Link to={`/store/${product.creator?.username}/${product.slug}`}>
                                    View Product
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
