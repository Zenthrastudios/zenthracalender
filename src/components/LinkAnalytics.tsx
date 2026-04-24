
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Loader2, MousePointerClick, Eye, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

import { LinkItem } from '@/hooks/useLinkPages';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function LinkAnalytics({ pageId, links }: { pageId: string, links: LinkItem[] }) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['linkAnalytics', pageId, links], // Add links to key to re-calc if names change
        queryFn: async () => {
            // 1. Get raw events (limiting to last 300 events for simple demo, or aggregate via RPC if real prod)
            // We'll just fetch all events for this page for now, assuming volume is low for MVP.
            // If volume is high, we MUST use an RPC/Edge function.
            const { data: events, error } = await supabase
                .from('link_events')
                .select('*')
                .eq('link_page_id', pageId)
                .order('created_at', { ascending: true }); // old to new for chart

            if (error) throw error;

            const views = events.filter(e => e.type === 'view');
            const clicks = events.filter(e => e.type === 'click');

            // Top Links
            const linkClicks: Record<string, number> = {};
            clicks.forEach(c => {
                if (c.link_id) {
                    linkClicks[c.link_id] = (linkClicks[c.link_id] || 0) + 1;
                }
            });

            // Map IDs to Titles
            const topLinksList = Object.entries(linkClicks).map(([id, count]) => {
                const linkDef = links.find(l => l.id === id);
                // If link was deleted, we might not find it, use fallback or metadata if available
                // For now, simple fallback
                return {
                    id,
                    title: linkDef?.title || 'Unknown/Deleted Link',
                    url: linkDef?.url || '#',
                    count
                };
            }).sort((a, b) => b.count - a.count);

            // Daily Trend (Last 7 days)
            // Group by date
            const dailyDataMap: Record<string, { views: number, clicks: number }> = {};
            // Initialize last 7 days with 0
            for (let i = 6; i >= 0; i--) {
                const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
                dailyDataMap[d] = { views: 0, clicks: 0 };
            }

            events.forEach(e => {
                const date = format(new Date(e.created_at), 'yyyy-MM-dd');
                if (dailyDataMap[date]) {
                    if (e.type === 'view') dailyDataMap[date].views++;
                    if (e.type === 'click') dailyDataMap[date].clicks++;
                }
            });

            const chartData = Object.keys(dailyDataMap).sort().map(date => ({
                date,
                views: dailyDataMap[date].views,
                clicks: dailyDataMap[date].clicks,
                label: format(new Date(date), 'MMM d')
            }));

            return {
                totalViews: views.length,
                totalClicks: clicks.length,
                ctr: views.length > 0 ? ((clicks.length / views.length) * 100).toFixed(1) : '0',
                topLinks: topLinksList,
                chartData
            };
        },
        enabled: !!links // Only run if we have links to map to
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalViews}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalClicks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Click Through Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.ctr}%</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance Trend (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="views" name="Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="clicks" name="Clicks" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {(stats?.topLinks || []).length > 0 ? (
                                stats?.topLinks.map((link, i) => (
                                    <div key={link.id} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-medium truncate max-w-[200px]" title={link.title}>
                                                {i + 1}. {link.title}
                                            </div>
                                            <span className="font-bold">{link.count}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(link.count / (stats?.totalClicks || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate" title={link.url}>
                                            {link.url}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No clicks yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
