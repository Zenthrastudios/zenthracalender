import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, BarChart3, UserCheck, Hash, Filter, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { InstagramAgentChat } from '@/components/InstagramAgentChat';
import { AlertCircle } from "lucide-react";

export default function InstagramAnalytics() {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState("all");

    const generateReport = async () => {
        setLoading(true);
        setAiLoading(false);
        setError(null);
        setReport(null);

        try {
            // STEP 1: Fetch Data (Fast)
            const { data: fetchRes, error: fetchErr } = await supabase.functions.invoke('instagram-analytics');

            if (fetchErr) throw fetchErr;
            if (!fetchRes.success) throw new Error(fetchRes.error || 'Failed to fetch Instagram data');

            // Show Data Immediately
            setReport(fetchRes);
            setLoading(false);
            setAiLoading(true);

            // STEP 2: Analyze with AI (Background)
            const { data: aiRes, error: aiErr } = await supabase.functions.invoke('instagram-analytics', {
                body: {
                    action: 'analyze_ai',
                    posts: fetchRes.recent_posts,
                    stats: fetchRes.stats
                }
            });

            if (aiErr) throw aiErr;

            // Merge AI results
            setReport((prev: any) => ({
                ...prev,
                ai_analysis: aiRes.ai_analysis
            }));

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate report');
        } finally {
            setLoading(false);
            setAiLoading(false);
        }
    };

    // Auto-load data on mount
    useEffect(() => {
        generateReport();
    }, []);

    // Filter logic for Charts
    const filteredPosts = report?.recent_posts?.filter((post: any) => {
        if (timeRange === 'all') return true;
        const date = new Date(post.timestamp);
        const days = timeRange === '7days' ? 7 : 30;
        return isAfter(date, subDays(new Date(), days));
    }).reverse() || [];

    // Chart Data Preparation
    const engagementData = filteredPosts.map((post: any) => ({
        date: format(new Date(post.timestamp), 'MMM dd'),
        likes: post.likes,
        comments: post.comments,
        total: post.likes + post.comments
    }));

    const typeDistribution = filteredPosts.reduce((acc: any, post: any) => {
        const type = post.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.keys(typeDistribution).map(key => ({
        name: key.replace('_', ' '),
        value: typeDistribution[key]
    }));

    const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#10b981'];

    const isBasicAccount = report?.account_type === 'BASIC';

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                            AI Content Command Center
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Advanced strategy intelligence and audience profiling.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {report && (
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filter Date" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Analyzed Data</SelectItem>
                                    <SelectItem value="30days">Last 30 Days</SelectItem>
                                    <SelectItem value="7days">Last 7 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Button
                            onClick={generateReport}
                            disabled={loading || aiLoading}
                            size="lg"
                            className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl relative overflow-hidden"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Fetching Data...
                                </>
                            ) : aiLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    AI Thinking...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                                    Generate New Analysis
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Analysis Failed</AlertTitle>
                        <AlertDescription className="flex flex-col gap-2">
                            <p>{error}</p>
                            <Button variant="outline" size="sm" onClick={generateReport} className="w-fit bg-white text-red-600 hover:bg-zinc-100 border-red-200">
                                Retry Analysis
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {isBasicAccount && (
                    <Alert className="bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Limited Data Access</AlertTitle>
                        <AlertDescription>
                            You are using a Personal Instagram Account. Engagement metrics (Likes, Comments) are not available via the API.
                            <strong> Switch to a Professional (Business/Creator) Account</strong> to see full analytics.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Dashboard Content */}
                {report ? (
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="overview" className="rounded-lg">Overview & Strategy</TabsTrigger>
                            <TabsTrigger value="audience" className="rounded-lg">Audience & Topics</TabsTrigger>
                            <TabsTrigger value="content" className="rounded-lg">Content Library</TabsTrigger>
                        </TabsList>

                        {/* TAB 1: OVERVIEW & STRATEGY */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium text-muted-foreground">Total Engagement</p>
                                        <h3 className="text-3xl font-bold text-violet-600 mt-2">
                                            {isBasicAccount ? 'N/A' : (report.stats.total_likes + report.stats.total_comments).toLocaleString()}
                                        </h3>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-pink-500/5 to-transparent border-pink-500/20">
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium text-muted-foreground">Avg. Likes</p>
                                        <h3 className="text-3xl font-bold text-pink-600 mt-2">
                                            {isBasicAccount ? 'N/A' : report.stats.avg_likes.toLocaleString()}
                                        </h3>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/20">
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium text-muted-foreground">Comments</p>
                                        <h3 className="text-3xl font-bold text-orange-600 mt-2">
                                            {isBasicAccount ? 'N/A' : report.stats.total_comments.toLocaleString()}
                                        </h3>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                                    <CardContent className="pt-6">
                                        <p className="text-sm font-medium text-muted-foreground">Analyzed Posts</p>
                                        <h3 className="text-3xl font-bold text-emerald-600 mt-2">
                                            {report.recent_posts.length}
                                        </h3>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Engagement Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Engagement Velocity</CardTitle>
                                        <CardDescription>Likes & Comments trend over time</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={engagementData}>
                                                <defs>
                                                    <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                                <Area type="monotone" dataKey="likes" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorLikes)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Format Mix</CardTitle>
                                        <CardDescription>Content type distribution</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Winning vs Losing Factors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-l-4 border-l-emerald-500">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="text-emerald-500" />
                                            <CardTitle>Winning Factors</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {aiLoading ? (
                                            <div className="space-y-3 animate-pulse">
                                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                                <div className="h-4 bg-muted rounded w-1/2"></div>
                                                <div className="h-4 bg-muted rounded w-2/3"></div>
                                            </div>
                                        ) : (
                                            <ul className="space-y-3">
                                                {report.ai_analysis?.winning_factors?.map((f: string, i: number) => (
                                                    <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                                                        <span className="text-emerald-500 font-bold">✓</span> {f}
                                                    </li>
                                                )) || <p className="text-sm text-muted-foreground">No insights yet.</p>}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-red-500">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="text-red-500 rotate-180" />
                                            <CardTitle>Friction Points</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {aiLoading ? (
                                            <div className="space-y-3 animate-pulse">
                                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                                <div className="h-4 bg-muted rounded w-1/2"></div>
                                                <div className="h-4 bg-muted rounded w-2/3"></div>
                                            </div>
                                        ) : (
                                            <ul className="space-y-3">
                                                {report.ai_analysis?.losing_factors?.map((f: string, i: number) => (
                                                    <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                                                        <span className="text-red-500 font-bold">✕</span> {f}
                                                    </li>
                                                )) || <p className="text-sm text-muted-foreground">No insights yet.</p>}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Best Performer Deep Dive */}
                            <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-none shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-yellow-500 text-black hover:bg-yellow-400">STAR PERFORMER</Badge>
                                    </div>
                                    <CardTitle className="text-2xl">Why Your Top Post Went Viral</CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold">The Content</p>
                                            <p className="font-medium italic">"{report.recent_posts[0]?.caption.substring(0, 100)}..."</p>
                                            <div className="flex gap-4 mt-2">
                                                <div className="text-center">
                                                    <span className="block text-2xl font-bold">{report.recent_posts[0]?.likes}</span>
                                                    <span className="text-xs text-zinc-500">Likes</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-2xl font-bold">{report.recent_posts[0]?.comments}</span>
                                                    <span className="text-xs text-zinc-500">Comments</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                            {aiLoading ? (
                                                <div className="space-y-3 animate-pulse">
                                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                                    <div className="h-4 bg-white/10 rounded w-full"></div>
                                                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                                                </div>
                                            ) : (
                                                <p className="text-zinc-300 leading-relaxed text-sm">
                                                    {report.ai_analysis?.best_performer_analysis || "Analysis unavailable."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: AUDIENCE & TOPICS */}
                        <TabsContent value="audience" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                                <UserCheck className="w-5 h-5" />
                                            </div>
                                            <CardTitle>Inferred Audience Persona</CardTitle>
                                        </div>
                                        <CardDescription>Based on engagement patterns & comment sentiment</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {aiLoading ? (
                                            <div className="space-y-3 animate-pulse p-4">
                                                <div className="h-4 bg-muted rounded w-full"></div>
                                                <div className="h-4 bg-muted rounded w-full"></div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-muted/50 rounded-xl">
                                                <p className="text-lg font-medium leading-relaxed">
                                                    {report.ai_analysis?.audience_persona || "Data insufficient for persona generation."}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                                <Hash className="w-5 h-5" />
                                            </div>
                                            <CardTitle>Topic Clusters</CardTitle>
                                        </div>
                                        <CardDescription>What you talk about vs. what performs</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {aiLoading ? (
                                            <div className="space-y-3 animate-pulse">
                                                <div className="h-8 bg-muted rounded w-full"></div>
                                                <div className="h-8 bg-muted rounded w-full"></div>
                                                <div className="h-8 bg-muted rounded w-full"></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {report.ai_analysis?.topic_clusters?.map((cluster: any, i: number) => (
                                                    <div key={i} className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium">{cluster.name}</span>
                                                            <span className="text-muted-foreground">{cluster.count} posts</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-purple-500 rounded-full"
                                                                style={{ width: `${(cluster.count / 15) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )) || <p className="text-muted-foreground italic">No topic clusters identified.</p>}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* TAB 3: CONTENT LIBRARY */}
                        <TabsContent value="content">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Content Performance Library</CardTitle>
                                    <CardDescription>Granular view of all analyzed posts</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative w-full overflow-auto">
                                        <table className="w-full caption-bottom text-sm text-left">
                                            <thead className="[&_tr]:border-b">
                                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Media</th>
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[400px]">Caption</th>
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Likes</th>
                                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Comments</th>
                                                </tr>
                                            </thead>
                                            <tbody className="[&_tr:last-child]:border-0">
                                                {filteredPosts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="h-24 text-center text-muted-foreground">
                                                            No posts found in this date range. Try selecting "All Analyzed Data".
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredPosts.map((post: any, i: number) => (
                                                        <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                                            <td className="p-4 align-middle">
                                                                {post.media_url ? (
                                                                    <img src={post.media_url} alt="Thumbnail" className="w-12 h-12 object-cover rounded-md border" />
                                                                ) : (
                                                                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs">N/A</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 align-middle">
                                                                <p className="line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
                                                            </td>
                                                            <td className="p-4 align-middle">{format(new Date(post.timestamp), 'MMM dd, yyyy')}</td>
                                                            <td className="p-4 align-middle">
                                                                <Badge variant="outline" className="text-xs capitalize">{post.type.replace('_', ' ')}</Badge>
                                                            </td>
                                                            <td className="p-4 align-middle text-right font-medium">
                                                                {isBasicAccount ? 'N/A' : post.likes.toLocaleString()}
                                                            </td>
                                                            <td className="p-4 align-middle text-right font-medium">
                                                                {isBasicAccount ? 'N/A' : post.comments.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                ) : (
                    // EMPTY STATE
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed border-muted rounded-3xl">
                        <div className="p-6 bg-violet-100 dark:bg-violet-900/20 rounded-full mb-6 relative">
                            <Sparkles className="w-10 h-10 text-violet-600 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Ready to Analyze</h2>
                        <p className="text-muted-foreground text-center max-w-md mb-8">
                            Connect your Instagram data to unlock AI-powered insights, audience personas, and content strategy optimization.
                        </p>
                        <Button
                            onClick={generateReport}
                            size="lg"
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-500/20"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Start Strategy Analysis
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
