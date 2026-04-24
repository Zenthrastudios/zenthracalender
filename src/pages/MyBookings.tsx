import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  Search,
  ArrowLeft,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
  History,
  Sparkles,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserBranding } from '@/hooks/useProfile';
import { FileText, Download as DownloadIcon } from 'lucide-react';

interface Booking {
  id: string;
  host_id: string;
  start_time: string;
  end_time: string;
  status: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string | null;
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

type BookingQueryRow = Omit<Booking, 'event_type' | 'host'> & {
  event_type: Booking['event_type'] | Booking['event_type'][];
};

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // For demonstration, use a default accent color since we don't have a single host here
  const accentColor = "#FF9124";

  const getJoinLink = (booking: Booking) => {
    if (booking.meet_link) return booking.meet_link;
    const lv = booking.event_type?.location_value;
    if (lv && /^https?:\/\//i.test(lv)) return lv;
    return null;
  };

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
          attendee_phone,
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

      const rows = ((data || []) as unknown as BookingQueryRow[]).map((booking) => ({
        ...booking,
        event_type: Array.isArray(booking.event_type) ? booking.event_type[0] : booking.event_type,
      }));

      const hostIds = Array.from(new Set(rows.map((b) => b.host_id).filter(Boolean)));
      const hostByUserId = new Map<string, { name: string; username: string | null }>();

      if (hostIds.length > 0) {
        const { data: hostProfiles, error: hostError } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', hostIds);

        if (hostError) throw hostError;

        (hostProfiles || []).forEach((p: { user_id: string; name: string; username: string | null }) => {
          hostByUserId.set(p.user_id, { name: p.name, username: p.username });
        });
      }

      const transformedBookings = rows.map((b) => ({
        ...b,
        host: hostByUserId.get(b.host_id) || null,
      }));

      setBookings(transformedBookings as Booking[]);

      // Also fetch purchased products for this email
      console.log('Fetching products for email:', searchEmail.trim());
      const { data: productData, error: productError } = await supabase
        .from('product_purchases')
        .select('id, created_at, amount, access_token, product:digital_products(id, title, description, thumbnail_url)')
        .eq('customer_email', searchEmail.trim())
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      console.log('Product query result:', { productData, productError });

      if (productError) {
        console.error('Error fetching products:', productError);
      } else {
        console.log('Setting purchases:', productData);
        setPurchases(productData as unknown as ProductPurchase[] || []);
      }
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

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.start_time) > new Date()
  );
  const pastBookings = bookings.filter(
    b => b.status !== 'confirmed' || new Date(b.start_time) <= new Date()
  );

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white selection:bg-primary/30 pb-20">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] opacity-[0.03] blur-[120px] pointer-events-none rounded-full bg-primary"></div>

      {/* Header */}
      <header className="w-full px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#0B0B0F]/80">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">CalSchedule</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/dashboard">
              <Button variant="ghost" className="text-gray-400 font-bold hover:text-white gap-2">
                <User className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button className="rounded-xl font-bold bg-white text-black hover:bg-gray-200">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 font-bold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">My Bookings</h1>
              <p className="text-gray-500 font-medium">Manage and view all your scheduled appointments in one place.</p>
            </div>
            {user && (
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-bold text-gray-400">Authenticated as <span className="text-white">{user.email}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Search Experience - Only for non-logged in */}
        {!user && !hasSearched && (
          <div className="bg-[#1C1C1E] rounded-[2.5rem] border border-white/5 p-10 md:p-16 text-center shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-10 mx-auto">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-6">Find your bookings</h2>
            <p className="text-gray-500 mb-12 max-w-md mx-auto font-medium leading-relaxed">
              Enter the email address you used to book your meetings to see your upcoming schedule.
            </p>

            <form onSubmit={handleSearch} className="max-w-lg mx-auto flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-16 rounded-2xl border-white/5 bg-white/[0.02] px-6 text-lg font-bold focus:ring-primary focus:border-primary transition-all group-hover:border-white/10"
                  required
                />
              </div>
              <Button type="submit" className="h-16 px-10 rounded-2xl font-black text-lg bg-white text-black hover:bg-gray-200 transition-all active:scale-95" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Search Bookings'}
              </Button>
            </form>
          </div>
        )}

        {/* Search bar for after search / for logged in */}
        {(hasSearched || user) && (
          <div className="mb-12">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="email"
                  placeholder="Change email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-white/5 bg-white/[0.02] pl-14 pr-6 text-sm font-bold focus:ring-primary/20 backdrop-blur-xl"
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="h-14 px-6 rounded-2xl border-white/5 bg-white/[0.02] hover:bg-white/5 font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </form>
          </div>
        )}

        {/* Results Grid */}
        {(hasSearched || user) && !isLoading && (
          <div className="space-y-16">
            {bookings.length === 0 && purchases.length === 0 ? (
              <div className="bg-[#1C1C1E] rounded-[2.5rem] border border-white/5 p-20 text-center shadow-inner">
                <Calendar className="w-16 h-16 mx-auto text-gray-800 mb-6" />
                <h3 className="text-2xl font-black text-white mb-2">No bookings or purchases found</h3>
                <p className="text-gray-500 font-medium">We couldn't find any appointments or digital products for this email.</p>
              </div>
            ) : (
              <div className="grid gap-16">
                {/* Digital Products Section */}
                {purchases.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-tight">My Digital Products</h2>
                      <div className="h-px flex-1 bg-white/5"></div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white/[0.02] px-3 py-1 rounded-full border border-white/5">{purchases.length} Total</span>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {purchases.map((purchase) => (
                        <div key={purchase.id} className="group bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300 hover:shadow-2xl">
                          {/* Thumbnail */}
                          <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                            {purchase.product?.thumbnail_url ? (
                              <img
                                src={purchase.product.thumbnail_url}
                                alt={purchase.product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-12 h-12 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute top-3 right-3">
                              <span className="px-3 py-1 rounded-lg bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest">Purchased</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6 space-y-4">
                            <div>
                              <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors">{purchase.product?.title || 'Digital Product'}</h3>
                              <p className="text-xs text-gray-500 font-medium">{format(new Date(purchase.created_at), 'MMM d, yyyy')}</p>
                            </div>

                            <p className="text-sm text-gray-400 line-clamp-2">{purchase.product?.description || 'Digital product'}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <span className="text-sm font-bold text-white">₹{purchase.amount}</span>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/view/${purchase.access_token}`)}
                                className="rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-all active:scale-95"
                              >
                                View Product
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Section */}
                {upcomingBookings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-tight">Upcoming Sessions</h2>
                      <div className="h-px flex-1 bg-white/5"></div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white/[0.02] px-3 py-1 rounded-full border border-white/5">{upcomingBookings.length} Total</span>
                    </div>

                    <div className="grid gap-6">
                      {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="group relative bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-8 md:p-10 shadow-xl overflow-hidden hover:border-white/10 transition-all duration-300">
                          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 opacity-40"></div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div className="flex-1 space-y-6">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Confirmed</span>
                                <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                                <span className="text-gray-500 text-xs font-bold px-2 py-1 bg-white/[0.02] rounded-md">ID: {booking.id.split('-')[0]}</span>
                              </div>

                              <div>
                                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">{booking.event_type?.title || 'Meeting'}</h3>
                                <p className="flex items-center gap-2 text-gray-500 font-bold">
                                  <span>with</span>
                                  <span className="text-white bg-white/[0.05] px-2 py-0.5 rounded-md text-sm">{booking.host?.name || 'Host'}</span>
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                <div className="flex items-center gap-3 text-gray-400">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">DATE</p>
                                    <p className="font-bold text-sm text-gray-200">{format(new Date(booking.start_time), 'EEE, MMM d, yyyy')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">TIME</p>
                                    <p className="font-bold text-sm text-gray-200">{format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                                    {getLocationIcon(booking.event_type?.location_type || 'google_meet')}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">LOCATION</p>
                                    <p className="font-bold text-sm text-gray-200 capitalize">{booking.event_type?.location_type?.replace('_', ' ')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[200px]">
                              {getJoinLink(booking) ? (
                                <Button asChild className="h-14 rounded-2xl font-black bg-white text-black hover:bg-gray-200 shadow-xl transition-all active:scale-95 group/btn">
                                  <a href={getJoinLink(booking) as string} target="_blank" rel="noopener noreferrer">
                                    Join Meeting
                                    <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:scale-110 transition-transform" />
                                  </a>
                                </Button>
                              ) : (
                                <Button disabled className="h-14 rounded-2xl font-black bg-white/5 text-gray-500 border border-white/5">
                                  Link Pending
                                </Button>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                {booking.reschedule_token && (
                                  <Link to={`/reschedule/${booking.reschedule_token}`} className="flex-1">
                                    <Button variant="outline" className="w-full h-12 rounded-xl border-white/5 bg-white/[0.02] hover:bg-white/[0.05] font-bold text-xs uppercase tracking-widest">
                                      Reschedule
                                    </Button>
                                  </Link>
                                )}
                                {booking.cancel_token && (
                                  <Link to={`/cancel/${booking.cancel_token}`} className="flex-1">
                                    <Button variant="ghost" className="w-full h-12 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/5 font-bold text-xs uppercase tracking-widest">
                                      Cancel
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Section */}
                {pastBookings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                        <History className="w-5 h-5 text-gray-600" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-500 tracking-tight">Past Activity</h2>
                      <div className="h-px flex-1 bg-white/5"></div>
                    </div>

                    <div className="grid gap-3">
                      {pastBookings.map((booking) => (
                        <div key={booking.id} className="group bg-white/[0.01] rounded-2xl border border-white/5 p-6 hover:bg-white/[0.02] transition-all flex items-center justify-between gap-6 opacity-60 hover:opacity-100">
                          <div className="flex items-center gap-6 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center shrink-0">
                              <Calendar className="w-5 h-5 text-gray-700" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white mb-1 truncate">{booking.event_type?.title}</h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-bold">
                                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {format(new Date(booking.start_time), 'MMM d, yyyy')}</span>
                                <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {booking.host?.name}</span>
                                {booking.status === 'cancelled' && <span className="text-red-500/80 bg-red-500/5 px-2 py-0.5 rounded uppercase tracking-tighter">Cancelled</span>}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-xl text-gray-700 hover:text-white hover:bg-white/5">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-xs">Accessing Schedule...</p>
          </div>
        )}

        {/* Support Section */}
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-col items-center gap-8">
          <div className="flex items-center gap-4 text-gray-600">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-medium">Need help with your bookings? Reach out to support.</span>
          </div>

          <div className="flex items-center gap-1 opacity-20 transform scale-90">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Powerhouse Technology</span>
            <span className="text-xs font-black text-white italic">CalSchedule</span>
          </div>
        </div>
      </main>
    </div>
  );
}
