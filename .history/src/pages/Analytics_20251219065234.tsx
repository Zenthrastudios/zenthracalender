import { useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, getHours, getDay } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const COLORS = ['#F5A623', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS_RANGE = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function Analytics() {
  const { user } = useAuth();

  // Fetch all bookings for analytics
  const { data: bookings = [], isLoading } = useQuery({
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

  // Calculate stats
  const stats = useMemo(() => {
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

    // Calculate average duration
    const avgDuration = thisMonth.length > 0
      ? Math.round(thisMonth.reduce((acc, b) => {
        const duration = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000;
        return acc + duration;
      }, 0) / thisMonth.length)
      : 0;

    // Calculate revenue (only for confirmed paid bookings)
    const thisMonthRevenue = thisMonth
      .filter(b => b.status === 'confirmed' && (b.event_type as any)?.is_paid)
      .reduce((acc, b) => acc + ((b.event_type as any)?.price || 0), 0);

    const lastMonthRevenue = lastMonth
      .filter(b => b.status === 'confirmed' && (b.event_type as any)?.is_paid)
      .reduce((acc, b) => acc + ((b.event_type as any)?.price || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Total revenue (all time)
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

  // Popular time slots
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
  const dailyData = useMemo(() => {
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

  // Event type breakdown
  const eventTypeData = useMemo(() => {
    const breakdown: Record<string, number> = {};

    bookings.forEach(booking => {
      const title = booking.event_type?.title || 'Unknown';
      breakdown[title] = (breakdown[title] || 0) + 1;
    });

    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value,
    }));
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
              <p className="text-sm text-muted-foreground sm:text-base">Track your booking performance and trends</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{stats.totalBookings}</p>
                    <div className={cn(
                      "flex items-center text-sm mt-1",
                      stats.bookingChange >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {stats.bookingChange >= 0 ? (
                        <ArrowUp className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(stats.bookingChange)}% vs last month
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-primary/10 p-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue (30 days)</p>
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">₹{stats.thisMonthRevenue.toLocaleString('en-IN')}</p>
                    <div className={cn(
                      "flex items-center text-sm mt-1",
                      stats.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {stats.revenueChange >= 0 ? (
                        <ArrowUp className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(stats.revenueChange)}% vs last month
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-green-500/10 p-3">
                    <IndianRupee className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unique Attendees</p>
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{stats.uniqueAttendees}</p>
                    <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-blue-500/10 p-3">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{stats.cancellationRate}%</p>
                    <div className={cn(
                      "flex items-center text-sm mt-1",
                      stats.cancellationRate <= stats.previousCancellationRate ? "text-emerald-600" : "text-red-600"
                    )}>
                      {stats.cancellationRate <= stats.previousCancellationRate ? (
                        <ArrowDown className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowUp className="w-4 h-4 mr-1" />
                      )}
                      vs {stats.previousCancellationRate}% last month
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-red-500/10 p-3">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Duration</p>
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{stats.avgDuration}m</p>
                    <p className="text-sm text-muted-foreground mt-1">Per meeting</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-emerald-500/10 p-3">
                    <Clock className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Bookings Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings Over Time</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-72 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke="#F5A623"
                        fill="#F5A623"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Popular Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Time Slots</CardTitle>
                <CardDescription>When people book most</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-72 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSlotData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="label"
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="bookings"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Event Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Event Type Breakdown</CardTitle>
                <CardDescription>Bookings by event type</CardDescription>
              </CardHeader>
              <CardContent>
                {eventTypeData.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
                    <div className="h-64 sm:h-72 lg:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={eventTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {eventTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                    </div>

                    <div className="max-h-64 overflow-auto rounded-md border bg-muted/10 p-3 sm:max-h-[18rem]">
                      <div className="space-y-2">
                        {eventTypeData
                          .slice()
                          .sort((a, b) => b.value - a.value)
                          .map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                                <span className="truncate text-sm text-foreground">{item.name}</span>
                              </div>
                              <span className="shrink-0 text-sm text-muted-foreground">{item.value}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 sm:h-72 lg:h-80 flex items-center justify-center text-muted-foreground">
                    No booking data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
                <CardDescription>Overall status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
                    <div className="h-64 sm:h-72 lg:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
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
                    </div>

                    <div className="rounded-md border bg-muted/10 p-3">
                      <div className="space-y-2">
                        {statusData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm text-foreground">{item.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 sm:h-72 lg:h-80 flex items-center justify-center text-muted-foreground">
                    No booking data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}