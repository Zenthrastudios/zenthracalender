import { useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, getHours } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#F5A623', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

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
          event_type:event_types(title, duration, location_type)
        `)
        .eq('host_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch event types for breakdown
  const { data: eventTypes = [] } = useQuery({
    queryKey: ['analytics-event-types', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', user.id);

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

    return {
      totalBookings,
      bookingChange: Number(bookingChange),
      confirmed,
      cancelled,
      cancellationRate: Number(cancellationRate),
      previousCancellationRate: Number(previousCancellationRate),
      avgDuration,
      uniqueAttendees: new Set(thisMonth.map(b => b.attendee_email)).size,
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
        <div className="p-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your booking performance and trends</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-3xl font-bold">{stats.totalBookings}</p>
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
                <div className="p-3 bg-primary/10 rounded-full">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unique Attendees</p>
                  <p className="text-3xl font-bold">{stats.uniqueAttendees}</p>
                  <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
                  <p className="text-3xl font-bold">{stats.cancellationRate}%</p>
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
                <div className="p-3 bg-red-500/10 rounded-full">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Duration</p>
                  <p className="text-3xl font-bold">{stats.avgDuration}m</p>
                  <p className="text-sm text-muted-foreground mt-1">Per meeting</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <Clock className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bookings Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings Over Time</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
              <div className="h-[300px]">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Event Type Breakdown</CardTitle>
              <CardDescription>Bookings by event type</CardDescription>
            </CardHeader>
            <CardContent>
              {eventTypeData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
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
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No booking data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}