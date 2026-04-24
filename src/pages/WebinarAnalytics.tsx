import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useWebinar, useWebinarRegistrations } from '@/hooks/useWebinars';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Download,
    Users,
    IndianRupee,
    CreditCard,
    Calendar,
    Search
} from 'lucide-react';
import { format, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function WebinarAnalytics() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: webinar, isLoading: isWebinarLoading } = useWebinar(id!);
    const { data: registrations, isLoading: isRegLoading } = useWebinarRegistrations(id!);
    const [searchTerm, setSearchTerm] = useState('');

    const isLoading = isWebinarLoading || isRegLoading;

    const stats = useMemo(() => {
        if (!webinar || !registrations) return null;

        const totalRegistrants = registrations.length;
        const paidRegistrants = registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'captured').length;
        // For free webinars, all are valid. For paid, only 'paid'/'captured'.
        // Actually, let's just count 'paid'/'captured' generally, or 'free' for free ones.
        // Or simpler: strictly count valid entries.

        const successRegistrations = registrations.filter(r =>
            r.payment_status === 'paid' || r.payment_status === 'captured' || r.payment_status === 'free'
        );

        const totalRevenue = successRegistrations.length * (webinar.price || 0);

        return {
            total: totalRegistrants,
            successful: successRegistrations.length,
            revenue: totalRevenue,
            pending: totalRegistrants - successRegistrations.length
        };
    }, [webinar, registrations]);

    const chartData = useMemo(() => {
        if (!registrations || registrations.length === 0) return [];

        // Group by date
        const grouped = registrations.reduce((acc, reg) => {
            const date = format(parseISO(reg.created_at), 'yyyy-MM-dd');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Fill in gaps if we wanted, or just show active days
        return Object.entries(grouped)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [registrations]);

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        return registrations.filter(reg =>
            reg.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.attendee_email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [registrations, searchTerm]);

    const downloadCSV = () => {
        if (!registrations) return;

        const headers = ['Name', 'Email', 'Status', 'Date', 'Payment ID'];
        const rows = registrations.map(reg => [
            reg.attendee_name,
            reg.attendee_email,
            reg.payment_status,
            format(parseISO(reg.created_at), 'yyyy-MM-dd HH:mm'),
            reg.payment_id || '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `webinar-registrants-${webinar?.title.substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!webinar) return null;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/webinars')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Analytics: {webinar.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>{format(parseISO(webinar.start_time), 'MMM d, yyyy')}</span>
                                <span>•</span>
                                <Badge variant={webinar.is_paid ? 'default' : 'secondary'}>
                                    {webinar.is_paid ? `₹${webinar.price}` : 'Free'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={downloadCSV}>
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                        <Button onClick={() => navigate(`/dashboard/webinars/${id}/edit`)}>
                            Edit Webinar
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Registrants</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats?.revenue || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.successful || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats?.pending} pending/failed
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Days Until Event</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Math.max(0, Math.ceil((new Date(webinar.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Registration Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[300px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(str) => format(new Date(str), 'MMM d')}
                                            />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip
                                                labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        No data available yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent or Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest registrations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {registrations?.slice(0, 5).map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{reg.attendee_name}</p>
                                            <p className="text-xs text-muted-foreground">{reg.attendee_email}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={
                                                reg.payment_status === 'paid' || reg.payment_status === 'free' ? 'outline' : 'secondary'
                                            } className={
                                                reg.payment_status === 'paid' ? 'text-green-600 border-green-200 bg-green-50' : ''
                                            }>
                                                {reg.payment_status}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {format(parseISO(reg.created_at), 'MMM d')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {!registrations?.length && (
                                    <div className="text-center text-sm text-muted-foreground">No registrations yet</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Registrations List</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search attendees..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No registrations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRegistrations.map((reg) => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium">{reg.attendee_name}</TableCell>
                                            <TableCell>{reg.attendee_email}</TableCell>
                                            <TableCell>{format(parseISO(reg.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    reg.payment_status === 'paid' || reg.payment_status === 'free' ? 'outline' : 'secondary'
                                                } className={
                                                    reg.payment_status === 'paid' ? 'text-green-600 border-green-200 bg-green-50' : ''
                                                }>
                                                    {reg.payment_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {reg.payment_status === 'paid' || reg.payment_status === 'captured' ? `₹${webinar.price}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
