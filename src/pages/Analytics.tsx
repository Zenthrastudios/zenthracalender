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

  // Heatmap data for bookings by day of week and hour
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
        <div className="mx-auto w-full max-w-7xl space-y-6">
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
                  <p className="text-2xl font-bold mt-1">{stats.totalBookings}</p>
                  <div className={cn(
                    "flex items-center text-xs mt-2",
                    stats.bookingChange >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {stats.bookingChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(stats.bookingChange)}%</span>
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
                  <p className="text-2xl font-bold mt-1 text-foreground">₹{stats.thisMonthRevenue.toLocaleString('en-IN')}</p>
                  <div className={cn(
                    "flex items-center text-xs mt-2",
                    stats.revenueChange >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {stats.revenueChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    <span className="font-medium">{Math.abs(stats.revenueChange)}%</span>
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
                  <p className="text-2xl font-bold mt-1">{stats.uniqueAttendees}</p>
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
                  <p className="text-2xl font-bold mt-1">{stats.avgDuration}m</p>
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
                    <AreaChart data={dailyData}>
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
        </div>
      </div>
    </DashboardLayout>
  );
}