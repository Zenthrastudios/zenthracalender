import { useMemo, useState } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, getHours, getDay } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  Calendar,
  Users,
  Clock,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  ShoppingBag,
  FileText,
  Timer,
  BarChart3,
  GraduationCap,
  CheckCircle,
  Megaphone,
  MousePointerClick,
  Percent,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const COLORS = ['#F5A623', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS_RANGE = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function Analytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');

  // Fetch all bookings for analytics
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['analytics-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          event_type:event_types(title, duration, location_type, is_paid, price)
        `)
        .eq('host_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch product analytics
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['analytics-products', user?.id],
    queryFn: async () => {
      if (!user) return { products: [], purchases: [], analytics: [] };

      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from('digital_products')
        .select('*')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      // Fetch all purchases for user's products
      const productIds = (products || []).map(p => p.id);
      if (productIds.length === 0) {
        return { products: products || [], purchases: [], analytics: [] };
      }

      const { data: purchases, error: purchasesError } = await supabase
        .from('product_purchases')
        .select('*, product:digital_products(id, title)')
        .in('product_id', productIds)
        .eq('status', 'paid');

      if (purchasesError) throw purchasesError;

      // Fetch analytics data
      const purchaseIds = (purchases || []).map(p => p.id);
      let analytics: any[] = [];

      if (purchaseIds.length > 0) {
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('product_analytics')
          .select('*, purchase:product_purchases(customer_email, product_id)')
          .in('purchase_id', purchaseIds);

        if (!analyticsError) {
          analytics = analyticsData || [];
        }
      }

      return {
        products: products || [],
        purchases: purchases || [],
        analytics: analytics
      };
    },
    enabled: !!user,
  });

  // Fetch course analytics
  const { data: courseData, isLoading: coursesLoading } = useQuery({
    queryKey: ['analytics-courses', user?.id],
    queryFn: async () => {
      if (!user) return { courses: [], purchases: [], progress: [] };

      // Fetch all courses
      const { data: courses, error: coursesError } = await (supabase as any)
        .from('courses')
        .select('*, lessons:course_lessons(id)')
        .eq('user_id', user.id);

      if (coursesError) throw coursesError;

      const courseIds = (courses || []).map(c => c.id);
      if (courseIds.length === 0) {
        return { courses: courses || [], purchases: [], progress: [] };
      }

      // Fetch all purchases for user's courses
      const { data: purchases, error: purchasesError } = await (supabase as any)
        .from('course_purchases')
        .select('*')
        .in('course_id', courseIds)
        .eq('status', 'paid');

      if (purchasesError) throw purchasesError;

      // Fetch all progress for these purchases
      const purchaseIds = (purchases || []).map(p => p.id);
      let progress: any[] = [];
      if (purchaseIds.length > 0) {
        const { data: progressData, error: progressError } = await (supabase as any)
          .from('course_progress')
          .select('*')
          .in('purchase_id', purchaseIds);

        if (!progressError) progress = progressData || [];
      }

      return {
        courses: courses || [],
        purchases: purchases || [],
        progress: progress
      };
    },
    enabled: !!user,
  });

  // Fetch Ad Analytics
  const { data: adData, isLoading: adsLoading } = useQuery({
    queryKey: ['analytics-ads', user?.id],
    queryFn: async () => {
      if (!user) return { events: [], daily: [] };

      // Fetch all ad events for user's courses
      const { data: events, error } = await supabase
        .from('lesson_ad_events')
        .select('*, course:courses(title), lesson:course_lessons(title)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ad events:', error);
        return { events: [], daily: [] };
      }

      return { events: events || [] };
    },
    enabled: !!user,
  });

  // Calculate Ad Stats
  const adStats = useMemo(() => {
    if (!adData?.events) return null;

    const events = adData.events;
    const views = events.filter((e: any) => e.event_type === 'view').length;
    const clicks = events.filter((e: any) => e.event_type === 'click').length;
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : 0;

    // Daily stats for chart
    const dailyData = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    }).map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayEvents = events.filter((e: any) => {
        const date = new Date(e.created_at);
        return date >= dayStart && date <= dayEnd;
      });

      return {
        date: format(day, 'MMM d'),
        views: dayEvents.filter((e: any) => e.event_type === 'view').length,
        clicks: dayEvents.filter((e: any) => e.event_type === 'click').length,
      };
    });

    return {
      views,
      clicks,
      ctr,
      dailyData
    };
  }, [adData]);

  // Calculate booking stats
  const bookingStats = useMemo(() => {
    const now = new Date();

    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const thisMonth = bookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo);
    const lastMonth = bookings.filter(b => {
      const date = new Date(b.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const totalBookings = thisMonth.length;
    const previousTotal = lastMonth.length;
    const bookingChange = previousTotal > 0
      ? ((totalBookings - previousTotal) / previousTotal * 100).toFixed(1)
      : totalBookings > 0 ? 100 : 0;

    const confirmed = thisMonth.filter(b => b.status === 'confirmed').length;
    const cancelled = thisMonth.filter(b => b.status === 'cancelled').length;
    const cancellationRate = totalBookings > 0
      ? ((cancelled / totalBookings) * 100).toFixed(1)
      : 0;

    const previousCancelled = lastMonth.filter(b => b.status === 'cancelled').length;
    const previousCancellationRate = previousTotal > 0
      ? ((previousCancelled / previousTotal) * 100).toFixed(1)
      : 0;

    const avgDuration = thisMonth.length > 0
      ? Math.round(thisMonth.reduce((acc, b) => {
        const duration = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000;
        return acc + duration;
      }, 0) / thisMonth.length)
      : 0;

    const thisMonthRevenue = thisMonth
      .filter(b => b.status === 'confirmed' && (b.event_type as any)?.is_paid)
      .reduce((acc, b) => acc + ((b.event_type as any)?.price || 0), 0);

    const lastMonthRevenue = lastMonth
      .filter(b => b.status === 'confirmed' && (b.event_type as any)?.is_paid)
      .reduce((acc, b) => acc + ((b.event_type as any)?.price || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed' && (b.event_type as any)?.is_paid)
      .reduce((acc, b) => acc + ((b.event_type as any)?.price || 0), 0);

    return {
      totalBookings,
      bookingChange: Number(bookingChange),
      confirmed,
      cancelled,
      cancellationRate: Number(cancellationRate),
      previousCancellationRate: Number(previousCancellationRate),
      avgDuration,
      uniqueAttendees: new Set(thisMonth.map(b => b.attendee_email)).size,
      thisMonthRevenue,
      revenueChange: Number(revenueChange),
      totalRevenue,
    };
  }, [bookings]);

  // Calculate product stats
  const productStats = useMemo(() => {
    if (!productData) return null;

    const { products, purchases, analytics } = productData;
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // This month purchases
    const thisMonthPurchases = purchases.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const lastMonthPurchases = purchases.filter(p => {
      const date = new Date(p.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const thisMonthRevenue = thisMonthPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const lastMonthRevenue = lastMonthPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Total views from analytics
    const totalViews = analytics.length;
    const thisMonthViews = analytics.filter(a => new Date(a.viewed_at) >= thirtyDaysAgo).length;

    // Average view duration
    const viewsWithDuration = analytics.filter(a => a.duration_seconds && a.duration_seconds > 0);
    const avgViewDuration = viewsWithDuration.length > 0
      ? Math.round(viewsWithDuration.reduce((sum, a) => sum + a.duration_seconds, 0) / viewsWithDuration.length)
      : 0;

    // Unique customers
    const uniqueCustomers = new Set(purchases.map(p => p.customer_email)).size;

    // Per-product breakdown
    const productBreakdown = products.map(product => {
      const productPurchases = purchases.filter(p => p.product_id === product.id);
      const purchaseIds = productPurchases.map(p => p.id);
      const productAnalytics = analytics.filter(a => purchaseIds.includes(a.purchase_id));

      const productViewsWithDuration = productAnalytics.filter(a => a.duration_seconds > 0);
      const avgDuration = productViewsWithDuration.length > 0
        ? Math.round(productViewsWithDuration.reduce((sum, a) => sum + a.duration_seconds, 0) / productViewsWithDuration.length)
        : 0;

      return {
        id: product.id,
        title: product.title,
        price: product.price,
        purchases: productPurchases.length,
        revenue: productPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        views: productAnalytics.length,
        avgViewDuration: avgDuration,
        uniqueViewers: new Set(productAnalytics.map(a => a.purchase?.customer_email)).size,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Recent purchases list with view data
    const recentPurchases = [...purchases]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(p => {
        const purchaseAnalytics = analytics.filter(a => a.purchase_id === p.id);
        const viewsCount = purchaseAnalytics.length;
        const totalDuration = purchaseAnalytics.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);

        return {
          ...p,
          viewsCount,
          avgDuration: viewsCount > 0 ? Math.round(totalDuration / viewsCount) : 0,
          productTitle: p.product?.title || 'Unknown Product'
        };
      });

    // Daily purchase data for chart
    const dailyData = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    }).map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayPurchases = purchases.filter(p => {
        const date = new Date(p.created_at);
        return date >= dayStart && date <= dayEnd;
      });

      const dayViews = analytics.filter(a => {
        const date = new Date(a.viewed_at);
        return date >= dayStart && date <= dayEnd;
      });

      return {
        date: format(day, 'MMM d'),
        purchases: dayPurchases.length,
        revenue: dayPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        views: dayViews.length,
      };
    });

    return {
      totalProducts: products.length,
      totalPurchases: purchases.length,
      thisMonthPurchases: thisMonthPurchases.length,
      totalRevenue,
      thisMonthRevenue,
      revenueChange: Number(revenueChange),
      totalViews,
      thisMonthViews,
      avgViewDuration,
      uniqueCustomers,
      productBreakdown,
      recentPurchases,
      dailyData,
    };
  }, [productData]);

  // Calculate course stats
  const courseStats = useMemo(() => {
    if (!courseData) return null;

    const { courses, purchases, progress } = courseData;
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const thisMonthPurchases = purchases.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const lastMonthPurchases = purchases.filter(p => {
      const date = new Date(p.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const thisMonthRevenue = thisMonthPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const lastMonthRevenue = lastMonthPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Completion rate
    const totalLessons = courses.reduce((sum, c) => sum + (c.lessons?.length || 0), 0);
    const completedLessons = progress.filter(p => p.is_completed).length;
    const overallCompletionRate = totalLessons > 0 ? (completedLessons / (purchases.length * totalLessons) * 100) : 0;

    // Breakdown per course
    const courseBreakdown = courses.map(course => {
      const coursePurchases = purchases.filter(p => p.course_id === course.id);
      const courseRevenue = coursePurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const purchaseIds = coursePurchases.map(p => p.id);
      const courseProgress = progress.filter(p => purchaseIds.includes(p.purchase_id));
      const courseLessonsCount = course.lessons?.length || 0;

      const completedCount = courseProgress.filter(p => p.is_completed).length;
      const completionRate = (coursePurchases.length > 0 && courseLessonsCount > 0)
        ? (completedCount / (coursePurchases.length * courseLessonsCount) * 100)
        : 0;

      return {
        id: course.id,
        title: course.title,
        price: course.price,
        enrollments: coursePurchases.length,
        revenue: courseRevenue,
        completionRate: Math.round(completionRate),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Recent enrollments with progress
    const recentEnrollments = [...purchases]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(p => {
        const course = courses.find(c => c.id === p.course_id);
        const courseLessonsCount = course?.lessons?.length || 0;
        const userProgress = progress.filter(pr => pr.purchase_id === p.id);
        const completedCount = userProgress.filter(pr => pr.is_completed).length;
        const completionRate = courseLessonsCount > 0 ? (completedCount / courseLessonsCount * 100) : 0;

        return {
          ...p,
          courseTitle: course?.title || 'Unknown Course',
          completionRate: Math.round(completionRate),
          lastWatched: userProgress.sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())[0]?.last_watched_at
        };
      });

    // Daily trend
    const dailyData = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    }).map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayPurchases = purchases.filter(p => {
        const date = new Date(p.created_at);
        return date >= dayStart && date <= dayEnd;
      });

      return {
        date: format(day, 'MMM d'),
        enrollments: dayPurchases.length,
        revenue: dayPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      };
    });

    return {
      totalCourses: courses.length,
      totalEnrollments: purchases.length,
      thisMonthEnrollments: thisMonthPurchases.length,
      totalRevenue,
      thisMonthRevenue,
      revenueChange: Number(revenueChange),
      overallCompletionRate: Math.round(overallCompletionRate),
      courseBreakdown,
      recentEnrollments,
      dailyData,
    };
  }, [courseData]);

  // Popular time slots for bookings
  const timeSlotData = useMemo(() => {
    const slots: Record<number, number> = {};

    bookings.forEach(booking => {
      const hour = getHours(new Date(booking.start_time));
      slots[hour] = (slots[hour] || 0) + 1;
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: format(new Date().setHours(i, 0), 'ha'),
      bookings: slots[i] || 0,
    })).filter(slot => slot.bookings > 0 || (slot.hour >= 8 && slot.hour <= 18));
  }, [bookings]);

  // Bookings by day (last 30 days)
  const dailyBookingData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      });

      return {
        date: format(day, 'MMM d'),
        bookings: dayBookings.length,
        confirmed: dayBookings.filter(b => b.status === 'confirmed').length,
        cancelled: dayBookings.filter(b => b.status === 'cancelled').length,
      };
    });
  }, [bookings]);

  // Status breakdown
  const statusData = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const rescheduled = bookings.filter(b => b.status === 'rescheduled').length;

    return [
      { name: 'Confirmed', value: confirmed, color: '#10B981' },
      { name: 'Cancelled', value: cancelled, color: '#EF4444' },
      { name: 'Rescheduled', value: rescheduled, color: '#F5A623' },
    ].filter(item => item.value > 0);
  }, [bookings]);

  // Heatmap data for bookings
  const heatmapData = useMemo(() => {
    const data: Record<string, Record<number, number>> = {};
    DAYS_SHORT.forEach(day => {
      data[day] = {};
      HOURS_RANGE.forEach(hour => {
        data[day][hour] = 0;
      });
    });

    bookings.forEach(booking => {
      const date = new Date(booking.start_time);
      const dayName = DAYS_SHORT[getDay(date)];
      const hour = getHours(date);
      const hourBucket = Math.floor(hour / 2) * 2;
      if (data[dayName] && hourBucket in data[dayName]) {
        data[dayName][hourBucket]++;
      }
    });

    return data;
  }, [bookings]);

  const maxHeatmapValue = useMemo(() => {
    let max = 0;
    Object.values(heatmapData).forEach(hours => {
      Object.values(hours).forEach(val => {
        if (val > max) max = val;
      });
    });
    return max || 1;
  }, [heatmapData]);

  const getHeatmapColor = (value: number) => {
    if (value === 0) return 'bg-blue-50 dark:bg-blue-950/30';
    const intensity = value / maxHeatmapValue;
    if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/40';
    if (intensity < 0.5) return 'bg-blue-200 dark:bg-blue-800/50';
    if (intensity < 0.75) return 'bg-blue-300 dark:bg-blue-700/60';
    return 'bg-blue-400 dark:bg-blue-600/70';
  };

  const totalBookingsAll = bookings.length;
  const isLoading = bookingsLoading || productsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                Ads
              </TabsTrigger>
            </TabsList>

            {/* BOOKINGS TAB */}
            <TabsContent value="bookings" className="space-y-6">
              {/* Top Section: Stats + Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: 2x2 Stat Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Bookings Card */}
                  <Card className="bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Bookings</p>
                      <p className="text-2xl font-bold mt-1">{bookingStats.totalBookings}</p>
                      <div className={cn(
                        "flex items-center text-xs mt-2",
                        bookingStats.bookingChange >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {bookingStats.bookingChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        <span className="font-medium">{Math.abs(bookingStats.bookingChange)}%</span>
                        <span className="text-muted-foreground ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue Card */}
                  <Card className="bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IndianRupee className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Revenue</p>
                      <p className="text-2xl font-bold mt-1 text-foreground">₹{bookingStats.thisMonthRevenue.toLocaleString('en-IN')}</p>
                      <div className={cn(
                        "flex items-center text-xs mt-2",
                        bookingStats.revenueChange >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {bookingStats.revenueChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        <span className="font-medium">{Math.abs(bookingStats.revenueChange)}%</span>
                        <span className="text-muted-foreground ml-1">from last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attendees Card */}
                  <Card className="bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Attendees</p>
                      <p className="text-2xl font-bold mt-1">{bookingStats.uniqueAttendees}</p>
                      <div className="flex items-center text-xs mt-2 text-muted-foreground">
                        <span>Last 30 days</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Duration Card */}
                  <Card className="bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Clock className="h-5 w-5 text-violet-500" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Avg Duration</p>
                      <p className="text-2xl font-bold mt-1">{bookingStats.avgDuration}m</p>
                      <div className="flex items-center text-xs mt-2 text-muted-foreground">
                        <span>Per meeting</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Heatmap */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bookings by time of day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-[400px]">
                        {/* Hour labels */}
                        <div className="flex mb-1 ml-10">
                          {HOURS_RANGE.map(hour => (
                            <div key={hour} className="flex-1 text-[10px] text-muted-foreground text-center">
                              {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                            </div>
                          ))}
                        </div>
                        {/* Heatmap grid */}
                        {DAYS_SHORT.map(day => (
                          <div key={day} className="flex items-center mb-1">
                            <span className="w-10 text-xs text-muted-foreground">{day}</span>
                            <div className="flex flex-1 gap-0.5">
                              {HOURS_RANGE.map(hour => (
                                <div
                                  key={hour}
                                  className={cn(
                                    "flex-1 h-6 rounded-sm transition-colors",
                                    getHeatmapColor(heatmapData[day]?.[hour] || 0)
                                  )}
                                  title={`${day} ${hour}:00 - ${heatmapData[day]?.[hour] || 0} bookings`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        {/* Legend */}
                        <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-muted-foreground">
                          <span>Less</span>
                          <div className="w-3 h-3 rounded-sm bg-blue-50 dark:bg-blue-950/30" />
                          <div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40" />
                          <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800/50" />
                          <div className="w-3 h-3 rounded-sm bg-blue-300 dark:bg-blue-700/60" />
                          <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-600/70" />
                          <span>More</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Section: Area Chart + Donut Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Area Chart - Takes 3 columns */}
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Booking Trends</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyBookingData}>
                          <defs>
                            <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="bookings"
                            stroke="#F5A623"
                            strokeWidth={2}
                            fill="url(#colorBookings)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Donut Chart - Takes 2 columns */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bookings by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className="relative h-48 w-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData.length > 0 ? statusData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {(statusData.length > 0 ? statusData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold">{totalBookingsAll}</span>
                          <span className="text-xs text-muted-foreground">Total</span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="mt-4 space-y-2 w-full">
                        {(statusData.length > 0 ? statusData : [{ name: 'No bookings', value: 0, color: '#e5e7eb' }]).map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {totalBookingsAll > 0 ? ((item.value / totalBookingsAll) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* COURSES TAB */}
            <TabsContent value="courses" className="space-y-6">
              {/* Course Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-orange-500/10 w-fit">
                      <Users className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Total Enrollments</p>
                    <p className="text-2xl font-bold mt-1">{courseStats?.totalEnrollments || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {courseStats?.thisMonthEnrollments || 0} this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 w-fit">
                      <IndianRupee className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Course Revenue</p>
                    <p className="text-2xl font-bold mt-1">₹{(courseStats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                    <div className={cn(
                      "flex items-center text-xs mt-1",
                      (courseStats?.revenueChange || 0) >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {(courseStats?.revenueChange || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      <span>{Math.abs(courseStats?.revenueChange || 0)}% from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-blue-500/10 w-fit">
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Completion Rate</p>
                    <p className="text-2xl font-bold mt-1">{courseStats?.overallCompletionRate || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Average across all users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-violet-500/10 w-fit">
                      <GraduationCap className="h-5 w-5 text-violet-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Total Courses</p>
                    <p className="text-2xl font-bold mt-1">{courseStats?.totalCourses || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active digital courses</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enrollment Trends */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Enrollment Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={courseStats?.dailyData || []}>
                          <defs>
                            <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F56565" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F56565" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#F56565" strokeWidth={2} fill="url(#colorEnrollments)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Course Breakdown Table */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top Courses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-right text-xs">Rev</TableHead>
                          <TableHead className="text-right text-xs">Cmpl%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseStats?.courseBreakdown.slice(0, 5).map((course) => (
                          <TableRow key={course.id}>
                            <TableCell className="text-xs font-medium line-clamp-1">{course.title}</TableCell>
                            <TableCell className="text-right text-xs">₹{course.revenue}</TableCell>
                            <TableCell className="text-right text-xs">{course.completionRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Enrollment Activity Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base text-primary">Student Activity</CardTitle>
                      <CardDescription>Track individual student progress and engagement</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Course</TableHead>
                        <TableHead className="text-right text-xs">Progress</TableHead>
                        <TableHead className="text-right text-xs">Last Activity</TableHead>
                        <TableHead className="text-right text-xs">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseStats?.recentEnrollments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No student activity tracked yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        courseStats?.recentEnrollments.map((enrollment) => (
                          <TableRow key={enrollment.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-sm truncate max-w-[150px]">{enrollment.customer_email}</span>
                                <span className="text-[10px] text-muted-foreground">{enrollment.customer_phone || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{enrollment.courseTitle}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[10px] font-medium">{enrollment.completionRate}%</span>
                                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{ width: `${enrollment.completionRate}%` }} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">
                              {enrollment.lastWatched ? format(new Date(enrollment.lastWatched), 'MMM d, p') : 'Never'}
                            </TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">
                              {format(new Date(enrollment.created_at), 'MMM d')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PRODUCTS TAB */}
            <TabsContent value="products" className="space-y-6">
              {/* Product Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-primary/10 w-fit">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Total Sales</p>
                    <p className="text-2xl font-bold mt-1">{productStats?.totalPurchases || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {productStats?.thisMonthPurchases || 0} this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 w-fit">
                      <IndianRupee className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Product Revenue</p>
                    <p className="text-2xl font-bold mt-1">₹{(productStats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                    <div className={cn(
                      "flex items-center text-xs mt-1",
                      (productStats?.revenueChange || 0) >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {(productStats?.revenueChange || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      <span>{Math.abs(productStats?.revenueChange || 0)}% from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-blue-500/10 w-fit">
                      <Eye className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Total Views</p>
                    <p className="text-2xl font-bold mt-1">{productStats?.totalViews || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {productStats?.thisMonthViews || 0} this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="p-2 rounded-lg bg-violet-500/10 w-fit">
                      <Timer className="h-5 w-5 text-violet-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Avg View Time</p>
                    <p className="text-2xl font-bold mt-1">{formatDuration(productStats?.avgViewDuration || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {productStats?.uniqueCustomers || 0} unique customers
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales & Views Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Sales & Views Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={productStats?.dailyData || []}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area type="monotone" dataKey="purchases" name="Sales" stroke="#10B981" strokeWidth={2} fill="url(#colorSales)" />
                          <Area type="monotone" dataKey="views" name="Views" stroke="#3B82F6" strokeWidth={2} fill="url(#colorViews)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Product */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Revenue by Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productStats?.productBreakdown?.slice(0, 5) || []} layout="vertical">
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                          <YAxis type="category" dataKey="title" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={100} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          />
                          <Bar dataKey="revenue" fill="#F5A623" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Product Performance
                  </CardTitle>
                  <CardDescription>Detailed breakdown of each product's performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {productStats?.productBreakdown?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No products yet. Create your first digital product to see analytics.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Purchases</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Avg View Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productStats?.productBreakdown?.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.title}</TableCell>
                              <TableCell className="text-right">₹{product.price}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{product.purchases}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-emerald-600">
                                ₹{product.revenue.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="text-right">{product.views}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatDuration(product.avgViewDuration)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity & Sales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    Customer Activity
                  </CardTitle>
                  <CardDescription>Latest customer engagement and sales tracking</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-right text-xs">Engagement</TableHead>
                        <TableHead className="text-right text-xs">Revenue</TableHead>
                        <TableHead className="text-right text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productStats?.recentPurchases?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No product activity tracked yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        productStats?.recentPurchases?.map((purchase: any) => (
                          <TableRow key={purchase.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-sm truncate max-w-[150px]">{purchase.customer_email}</span>
                                <span className="text-[10px] text-muted-foreground">{purchase.customer_phone || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{purchase.productTitle}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs font-medium">{purchase.viewsCount} views</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-violet-500" />
                                  <span className="text-[10px] text-muted-foreground">{formatDuration(purchase.avgDuration)} avg</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600 truncate">₹{purchase.amount}</TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">
                              {format(new Date(purchase.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            {/* ADS TAB */}
            <TabsContent value="ads" className="space-y-6">
              {adStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Views */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-500" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Total Ad Views</p>
                        <h3 className="text-2xl font-bold mt-1">{adStats.views}</h3>
                      </CardContent>
                    </Card>

                    {/* Clicks */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <MousePointerClick className="w-5 h-5 text-green-500" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Total Clicks</p>
                        <h3 className="text-2xl font-bold mt-1">{adStats.clicks}</h3>
                      </CardContent>
                    </Card>

                    {/* CTR */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Percent className="w-5 h-5 text-purple-500" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                        <h3 className="text-2xl font-bold mt-1">{adStats.ctr}%</h3>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ad Performance (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={adStats.dailyData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                          <Area type="monotone" dataKey="views" stroke="#3B82F6" fillOpacity={1} fill="url(#colorViews)" name="Views" strokeWidth={2} />
                          <Area type="monotone" dataKey="clicks" stroke="#10B981" fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Detailed Ad Events Log */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-zinc-500" />
                        Detailed Ad Activity
                      </CardTitle>
                      <CardDescription>Real-time log of ad interactions and user details</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs">User / Participant</TableHead>
                              <TableHead className="text-xs">Course & Lesson</TableHead>
                              <TableHead className="text-xs">Event</TableHead>
                              <TableHead className="text-xs">Context</TableHead>
                              <TableHead className="text-right text-xs">Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {adData.events.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                  No ad activity recorded yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              adData.events.slice(0, 50).map((event: any) => (
                                <TableRow key={event.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{event.customer_email || 'Anonymous'}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                        {event.metadata?.device || 'Desktop'} • {event.metadata?.language || 'en'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">
                                        {event.course?.title || 'Unknown Course'}
                                      </span>
                                      <span className="text-sm">{event.lesson?.title || 'Untitled Lesson'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={event.event_type === 'click' ? 'default' : 'secondary'} className="rounded-md font-bold px-2 py-0">
                                      {event.event_type === 'click' ? (
                                        <MousePointerClick className="w-3 h-3 mr-1 inline" />
                                      ) : (
                                        <Eye className="w-3 h-3 mr-1 inline" />
                                      )}
                                      {event.event_type.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={event.metadata?.userAgent}>
                                      {event.metadata?.screen || 'N/A'} • {event.metadata?.type || 'ad'}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-sm">{format(new Date(event.created_at), 'h:mm a')}</span>
                                      <span className="text-[10px] text-muted-foreground">{format(new Date(event.created_at), 'MMM d')}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-10">No ad data available yet.</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout >
  );
}