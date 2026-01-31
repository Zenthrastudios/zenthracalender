import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, LayoutGrid, CreditCard, ShieldCheck, Settings,
    BarChart3, Plus, Search, Edit2, CheckCircle2, XCircle,
    ChevronRight, Save, Globe, Smartphone, Zap, Trash2,
    Calendar, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Enterprise() {
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch Platform Stats
    const { data: stats } = useQuery({
        queryKey: ['enterprise-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_enterprise_stats');
            if (error) {
                // Fallback to manual queries if RPC doesn't exist
                const [users, bookings, products, courses, payments] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }),
                    supabase.from('bookings').select('id', { count: 'exact', head: true }),
                    supabase.from('digital_products').select('id', { count: 'exact', head: true }),
                    supabase.from('courses').select('id', { count: 'exact', head: true }),
                    supabase.from('payments').select('amount').eq('status', 'completed')
                ]);

                return {
                    total_users: users.count || 0,
                    total_bookings: bookings.count || 0,
                    total_products: (products.count || 0) + (courses.count || 0),
                    total_revenue: payments.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
                };
            }
            return data[0];
        }
    });

    // Fetch Users & Roles & Activity
    const { data: users, refetch: refetchUsers } = useQuery({
        queryKey: ['enterprise-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          name,
          username,
          created_at,
          user_roles (role),
          bookings (id),
          digital_products (id)
        `);
            if (error) throw error;
            return data;
        }
    });

    // Fetch Pricing Plans
    const { data: plans, refetch: refetchPlans } = useQuery({
        queryKey: ['enterprise-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    // Fetch Site Settings
    const { data: siteSettings } = useQuery({
        queryKey: ['enterprise-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*');
            if (error) throw error;
            return data;
        }
    });

    // Fetch Features
    const { data: featureFlags } = useQuery({
        queryKey: ['enterprise-features'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('*');
            if (error) throw error;
            return data;
        }
    });

    // Fetch Unlocks
    const { data: userUnlocks, refetch: refetchUnlocks } = useQuery({
        queryKey: ['enterprise-unlocks'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_feature_unlocks')
                .select('*');
            if (error) throw error;
            return data;
        }
    });

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .upsert({ user_id: userId, role: newRole as any });
            if (error) throw error;
            toast.success("User role updated successfully");
            refetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleToggleFeature = async (userId: string, featureKey: string, isUnlocked: boolean) => {
        try {
            if (isUnlocked) {
                const { error } = await supabase
                    .from('user_feature_unlocks')
                    .delete()
                    .eq('user_id', userId)
                    .eq('feature_key', featureKey);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_feature_unlocks')
                    .insert([{ user_id: userId, feature_key: featureKey }]);
                if (error) throw error;
            }
            toast.success(`Feature ${isUnlocked ? 'revoked' : 'unlocked'} successfully`);
            refetchUnlocks();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const isFeatureUnlocked = (userId: string, featureKey: string) => {
        return userUnlocks?.some(u => u.user_id === userId && u.feature_key === featureKey);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Sidebar */}
            <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
                <div className="p-8 border-b border-white/10">
                    <Link to="/" className="flex items-center gap-2 mb-10">
                        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Enterprise</span>
                    </Link>

                    <nav className="space-y-2">
                        {[
                            { id: 'overview', icon: BarChart3, label: 'Overview' },
                            { id: 'users', icon: Users, label: 'Manage Users' },
                            { id: 'cms', icon: LayoutGrid, label: 'CMS Content' },
                            { id: 'pricing', icon: CreditCard, label: 'Pricing Plans' },
                            { id: 'features', icon: ShieldCheck, label: 'Global Features' },
                            { id: 'settings', icon: Settings, label: 'General Settings' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-8">
                    <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5 font-bold px-4" asChild>
                        <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to App</Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-10 max-w-7xl mx-auto w-full">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Admin</h1>
                        <p className="text-slate-500 font-medium">Manage Zenthra global configurations and user access.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button className="rounded-full bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 font-bold px-6 shadow-sm">
                            <Search className="w-4 h-4 mr-2" /> Global Search
                        </Button>
                        <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-xl shadow-orange-100">
                            Generate Report
                        </Button>
                    </div>
                </header>

                <div className="space-y-8">
                    {activeTab === 'overview' && (
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { label: 'Total Creators', value: stats?.total_users || 0, delta: '+100% (Real)', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Active Products', value: stats?.total_products || 0, delta: 'Live Inventory', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
                                { label: 'Platform Revenue', value: `$${stats?.total_revenue?.toFixed(2) || '0.00'}`, delta: 'Total Gross', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                            ].map((stat, i) => (
                                <Card key={i} className="border-none shadow-sm rounded-[2rem]">
                                    <CardHeader className="pb-2">
                                        <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-black text-slate-900 mb-2">{stat.value}</div>
                                        <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <ChevronRight className="w-3 h-3 rotate-[-90deg]" /> {stat.delta}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 bg-white border-b border-slate-50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl font-bold">Creator Directory</CardTitle>
                                        <CardDescription className="text-slate-500 font-medium mt-1">Manage user roles and unlock specific features.</CardDescription>
                                    </div>
                                    <Input placeholder="Search users..." className="max-w-xs rounded-xl bg-slate-50 border-none font-medium h-12" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 border-none">
                                            <TableHead className="px-8 font-bold text-slate-400 py-6 uppercase text-[10px] tracking-widest">Creator</TableHead>
                                            <TableHead className="font-bold text-slate-400 py-6 uppercase text-[10px] tracking-widest">Role</TableHead>
                                            <TableHead className="font-bold text-slate-400 py-6 uppercase text-[10px] tracking-widest">Unlocked Features</TableHead>
                                            <TableHead className="font-bold text-slate-400 py-6 uppercase text-[10px] tracking-widest">Joined</TableHead>
                                            <TableHead className="px-8 font-bold text-slate-400 py-6 uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users?.map((u: any) => (
                                            <TableRow key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-500">
                                                            {u.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{u.name || 'Anonymous User'}</div>
                                                            <div className="text-xs font-medium text-slate-400">@{u.username || 'n/a'}</div>
                                                        </div>
                                                    </div>
                                                    {(u.bookings?.length > 0 || u.digital_products?.length > 0) && (
                                                        <Badge className="mt-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase px-2 py-0">Active Creator</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <select
                                                        className="bg-slate-100 border-none rounded-lg text-xs font-bold px-2 py-1 outline-none appearance-none"
                                                        value={u.user_roles?.[0]?.role || 'guest'}
                                                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                                    >
                                                        <option value="guest">Guest</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="superadmin">SuperAdmin</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {featureFlags?.map((f: any) => {
                                                            const unlocked = isFeatureUnlocked(u.id, f.key);
                                                            return (
                                                                <Badge
                                                                    key={f.key}
                                                                    onClick={() => handleToggleFeature(u.id, f.key, unlocked)}
                                                                    className={`cursor-pointer transition-all border-none ${unlocked ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                                >
                                                                    {f.name}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-slate-500">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="px-8 text-right">
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-sm">
                                                        <Edit2 className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold tracking-tight">Public Pricing Tiers</h2>
                                <Button className="rounded-full bg-slate-900 text-white font-bold h-12 px-6">
                                    <Plus className="w-5 h-5 mr-2" /> Add New Tier
                                </Button>
                            </div>
                            <div className="grid lg:grid-cols-2 gap-8">
                                {plans?.map((plan: any) => (
                                    <Card key={plan.id} className={`border-2 rounded-[2.5rem] p-10 transition-all ${plan.is_popular ? 'border-orange-600 bg-white shadow-xl shadow-orange-100' : 'border-slate-100 bg-white shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h3 className="text-xl font-black mb-2">{plan.name}</h3>
                                                <Badge className={`${plan.is_popular ? 'bg-orange-600' : 'bg-slate-200 text-slate-600'}`}>
                                                    {plan.price}{plan.period}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="secondary" className="rounded-xl h-10 w-10 p-0"><Edit2 className="w-4 h-4" /></Button>
                                                <Button variant="secondary" className="rounded-xl h-10 w-10 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            {plan.features.map((f: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {f}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 pt-6 border-t border-slate-50">
                                            <span className={`w-3 h-3 rounded-full ${plan.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.is_active ? 'Active on public site' : 'Draft Mode'}</span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-3xl space-y-8">
                            <h2 className="text-2xl font-bold tracking-tight">Platform Configuration</h2>

                            <Card className="border-none shadow-sm rounded-[2rem]">
                                <CardHeader>
                                    <CardTitle className="text-lg">Payment Gateway (Razorpay)</CardTitle>
                                    <CardDescription>Global keys used for creator commission payouts and platform subs.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Key ID</label>
                                        <Input defaultValue="rzp_live_..." className="rounded-xl border-slate-100 bg-slate-50 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Key Secret</label>
                                        <Input type="password" value="••••••••••••••••" className="rounded-xl border-slate-100 bg-slate-50 font-mono" />
                                    </div>
                                    <Button className="rounded-full font-bold bg-slate-900 text-white mt-4">Update Razorpay Config</Button>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-[2rem]">
                                <CardHeader>
                                    <CardTitle className="text-lg">Meta API (Instagram Automation)</CardTitle>
                                    <CardDescription>Global App ID and Secret for IG DM Automation functionalities.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">App ID</label>
                                        <Input defaultValue="8237192...." className="rounded-xl border-slate-100 bg-slate-50 font-mono" />
                                    </div>
                                    <Button className="rounded-full font-bold bg-slate-900 text-white mt-4 border-none">Update Meta Config</Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Placeholder for other tabs */}
                    {['cms', 'features'].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
                                <LayoutGrid className="w-10 h-10 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Module Under Construction</h3>
                                <p className="text-slate-500 font-medium">The {activeTab.toUpperCase()} management tools are currently being synchronized.</p>
                            </div>
                            <Button variant="outline" className="rounded-full font-bold px-8 h-12" onClick={() => setActiveTab('overview')}>
                                Go Back to Overview
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
