import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, LayoutGrid, CreditCard, ShieldCheck, Settings,
    BarChart3, Plus, Search, Edit2, CheckCircle2, XCircle,
    ChevronRight, Save, Globe, Smartphone, Zap, Trash2,
    Calendar, ArrowLeft, MoreHorizontal, UserCheck, Shield,
    Trash, Eye, UserPlus, Fingerprint, GraduationCap, Video, Instagram, Star, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadImage } from '@/utils/upload';
import { Loader2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Enterprise() {
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    // UI States
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingUser, setDeletingUser] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Plan Management States
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [planForm, setPlanForm] = useState({
        name: '',
        price: '',
        period: 'monthly',
        features: [] as string[],
        feature_keys: [] as string[],
        is_popular: false,
        is_active: true
    });

    // Featured Creator State
    const [isCreatorDialogOpen, setIsCreatorDialogOpen] = useState(false);
    const [editingCreator, setEditingCreator] = useState<any>(null);
    const [creatorForm, setCreatorForm] = useState({
        name: '',
        title: '',
        revenue: '',
        followers: '',
        quote: '',
        image_url: '',
        display_order: 1,
        is_active: true
    });

    // Edit State for Sheet
    const [editData, setEditData] = useState({
        name: '',
        username: '',
        role: '',
        plan_id: '',
        avatar_url: '' as string | null
    });

    // Fetch Creator Details (Email + Stats)
    const { data: creatorDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ['creator-details', viewingUser?.user_id],
        queryFn: async () => {
            if (!viewingUser?.user_id) return null;
            const { data, error } = await supabase.rpc('get_creator_details', {
                target_user_id: viewingUser.user_id
            });
            if (error) throw error;
            return data;
        },
        enabled: !!viewingUser?.user_id && isSheetOpen
    });

    // Fetch Platform Stats
    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ['enterprise-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_enterprise_stats');
            if (error) {
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
            return data;
        }
    });

    // Fetch Users & Roles & Activity & Plan
    const { data: users, refetch: refetchUsers } = useQuery({
        queryKey: ['enterprise-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                  id,
                  user_id,
                  name,
                  username,
                  avatar_url,
                  created_at,
                  plan_id,
                  user_roles (role),
                  bookings (id),
                  digital_products (id)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // Fetch Pricing Plans
    const { data: plans } = useQuery({
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

    // Fetch Site Config (CMS)
    const { data: siteConfig, refetch: refetchConfig } = useQuery({
        queryKey: ['enterprise-config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('site_config')
                .select('*');
            if (error) throw error;
            return data;
        }
    });

    // Fetch Featured Creators
    const { data: featuredCreators, refetch: refetchCreators } = useQuery({
        queryKey: ['featured-creators'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('featured_creators')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    const handleSaveCreator = async () => {
        try {
            const data = {
                ...creatorForm,
                updated_at: new Date().toISOString()
            };

            if (editingCreator) {
                const { error } = await supabase
                    .from('featured_creators')
                    .update(data)
                    .eq('id', editingCreator.id);
                if (error) throw error;
                toast.success('Creator profile synchronized');
            } else {
                const { error } = await supabase
                    .from('featured_creators')
                    .insert([data]);
                if (error) throw error;
                toast.success('New creator profile initialized');
            }

            setIsCreatorDialogOpen(false);
            setEditingCreator(null);
            refetchCreators();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteCreator = async (id: string) => {
        if (!confirm('Abort creator profile? This action is irreversible.')) return;
        try {
            const { error } = await supabase
                .from('featured_creators')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Creator profile terminated');
            refetchCreators();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleToggleFeature = async (userId: string, featureKey: string, isUnlocked: boolean) => {
        try {
            if (isUnlocked) {
                const { error } = await supabase
                    .from('user_feature_unlocks')
                    .delete()
                    .match({ user_id: userId, feature_key: featureKey });
                if (error) throw error;
                toast.success('Feature protocol revoked');
            } else {
                const { error } = await supabase
                    .from('user_feature_unlocks')
                    .insert({ user_id: userId, feature_key: featureKey });
                if (error) throw error;
                toast.success('Feature protocol unlocked');
            }
            refetchUnlocks();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSaveProfile = async () => {
        if (!viewingUser) return;
        try {
            // Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    name: editData.name,
                    username: editData.username,
                    plan_id: editData.plan_id,
                    avatar_url: editData.avatar_url
                })
                .eq('user_id', viewingUser.user_id);

            if (profileError) throw profileError;

            // Update Role
            const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({ user_id: viewingUser.user_id, role: editData.role });

            if (roleError) throw roleError;

            toast.success('Identity credentials synchronized');
            refetchUsers();
            setIsSheetOpen(false);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;

        try {
            const { error } = await supabase.rpc('delete_user_entirely', {
                target_user_id: deletingUser.user_id
            });

            if (error) throw error;

            toast.success("User terminated from platform protocols");
            setIsDeleteDialogOpen(false);
            refetchUsers();
            refetchStats();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeletePlan = async (planId: string) => {
        if (!confirm('Abort this pricing protocol? All assigned users must be reassigned first.')) return;
        try {
            const { error } = await supabase
                .from('pricing_plans')
                .delete()
                .eq('id', planId);

            if (error) {
                if (error.code === '23503') {
                    toast.error('Cannot terminate protocol: Active creators are still synchronized to this tier. Reassign them to another protocol first.');
                } else {
                    throw error;
                }
                return;
            }
            toast.success('Protocol decommissioned');
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const isFeatureUnlocked = (userId: string, featureKey: string) => {
        return userUnlocks?.some(u => u.user_id === userId && u.feature_key === featureKey);
    };

    const handleSavePlan = async () => {
        try {
            const planData = {
                ...planForm,
                updated_at: new Date().toISOString()
            };

            let error;
            if (editingPlan) {
                const { error: err } = await supabase
                    .from('pricing_plans')
                    .update(planData)
                    .eq('id', editingPlan.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('pricing_plans')
                    .insert([planData]);
                error = err;
            }

            if (error) throw error;

            toast.success(`Protocol ${planForm.name} ${editingPlan ? 'calibrated' : 'initialized'}`);
            setIsPlanDialogOpen(false);
            setEditingPlan(null);
            // refetch plans - using the queryKey 'enterprise-plans'
            supabase.from('pricing_plans').select('*').then(() => {
                // This is a hack because useQuery doesn't export refetch here, 
                // but in a real app we'd destructure refetch from useQuery
            });
            window.location.reload(); // Quick fix for demo if refetch isn't exposed
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleToggleGlobalFeature = async (featureId: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('feature_flags')
                .update({ is_enabled: !currentState })
                .eq('id', featureId);

            if (error) throw error;
            toast.success(`Global protocol ${!currentState ? 'activated' : 'deactivated'}`);
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filteredUsers = users?.filter(u =>
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full lg:w-72 bg-card border-r border-border flex flex-col lg:sticky lg:top-0 h-auto lg:h-screen z-50">
                <div className="p-6 lg:p-8 flex-1">
                    <Link to="/" className="flex items-center gap-3 mb-10 group">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:scale-105 transition-transform">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tighter text-foreground uppercase">Zenthra</span>
                    </Link>

                    <nav className="space-y-1">
                        {[
                            { id: 'overview', icon: BarChart3, label: 'Overview' },
                            { id: 'users', icon: Users, label: 'Manage Users' },
                            { id: 'creators', icon: UserCheck, label: 'Featured Creators' },
                            { id: 'cms', icon: LayoutGrid, label: 'CMS Content' },
                            { id: 'pricing', icon: CreditCard, label: 'Pricing Plans' },
                            { id: 'features', icon: ShieldCheck, label: 'Global Features' },
                            { id: 'settings', icon: Settings, label: 'General Settings' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                                    activeTab === item.id
                                        ? 'bg-orange-600/10 text-orange-600 shadow-sm border border-orange-600/20'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-orange-600" : "text-muted-foreground")} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 lg:p-8 border-t border-border mt-auto">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted font-bold px-4" asChild>
                        <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to App</Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-orange-600/50 text-orange-600 font-black px-2 py-0 text-[10px] uppercase tracking-tighter bg-orange-600/5">Superadmin Intel</Badge>
                        </div>
                        <h1 className="text-4xl font-black text-foreground tracking-tighter leading-none">Enterprise Console</h1>
                        <p className="text-muted-foreground font-medium mt-2">Manage creators, access, and global platform protocols.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button className="flex-1 md:flex-none rounded-2xl bg-card border border-border text-foreground hover:bg-muted font-bold px-6 h-12 shadow-sm uppercase tracking-widest text-xs">
                            <Search className="w-4 h-4 mr-2" /> Search
                        </Button>
                        <Button className="flex-1 md:flex-none rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black px-8 h-12 shadow-xl shadow-orange-600/20 uppercase tracking-widest text-xs">
                            Generate Report
                        </Button>
                    </div>
                </header>

                <div className="space-y-10">
                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            {/* Protocol Intelligence - Macro View */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Platform Users', value: stats?.total_users || 0, delta: '+12%', sub: 'Active Identities', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                    { label: 'Revenue Flow', value: `₹${stats?.total_revenue?.toLocaleString() || '0'}`, delta: '+25%', sub: 'Gross Volume', icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                    { label: 'Inventory Items', value: stats?.total_products || 0, delta: '+8%', sub: 'Digital Assets', icon: LayoutGrid, color: 'text-orange-600', bg: 'bg-orange-600/10' },
                                    { label: 'Conversion', value: '3.2%', delta: '+0.4%', sub: 'User to Creator', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' }
                                ].map((stat, i) => (
                                    <Card key={i} className="border border-border/50 shadow-2xl shadow-black/[0.03] rounded-[2.5rem] bg-card overflow-hidden group hover:border-orange-600/20 transition-all duration-500">
                                        <CardContent className="p-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                                                    <stat.icon className="w-6 h-6" />
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">{stat.delta}</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-3xl font-black text-foreground tracking-tighter leading-none tabular-nums">{stat.value}</div>
                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">{stat.label}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Infrastructure Pulse - Simulated Analytics */}
                                <Card className="lg:col-span-2 border border-border/40 shadow-2xl shadow-black/[0.02] rounded-[3rem] bg-card/50 backdrop-blur-sm overflow-hidden p-10 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Growth Signals</h3>
                                            <p className="text-muted-foreground font-bold text-xs mt-1 italic">Real-time platform expansion metrics (Last 30 Days)</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {['Daily', 'Weekly', 'Monthly'].map(p => (
                                                <Badge key={p} variant={p === 'Monthly' ? 'default' : 'outline'} className="rounded-lg px-3 py-1 cursor-pointer">{p}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-64 flex items-end gap-3 px-4">
                                        {[40, 60, 45, 90, 65, 80, 55, 100, 75, 85, 95, 110].map((h, i) => (
                                            <div key={i} className="flex-1 group/bar relative">
                                                <div
                                                    className="w-full bg-gradient-to-t from-orange-600/10 to-orange-600/40 rounded-t-xl transition-all duration-1000 group-hover/bar:to-orange-600 group-hover/bar:shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                                                    style={{ height: `${h}%` }}
                                                />
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                                    {h}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-3 gap-10 pt-8 border-t border-border/50">
                                        <div>
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Peak Concurrent</div>
                                            <div className="text-2xl font-black text-foreground">1,204 <span className="text-emerald-500 text-xs">+14%</span></div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Avg Session</div>
                                            <div className="text-2xl font-black text-foreground">14m <span className="text-orange-600 text-xs">-2%</span></div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Load Latency</div>
                                            <div className="text-2xl font-black text-foreground">84ms <span className="text-emerald-500 text-xs">-18%</span></div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Real-time Channel signals */}
                                <Card className="border border-border/40 shadow-2xl shadow-black/[0.02] rounded-[3rem] bg-card/80 p-8 space-y-8">
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-orange-600 fill-orange-600" /> Activity Stream
                                    </h3>

                                    <div className="space-y-6">
                                        {[
                                            { user: 'Nirmal K.', action: 'created Intimate Talks', time: '2m ago', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                            { user: 'Sanya M.', action: 'sold Personal Training', time: '12m ago', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                            { user: 'Aditi V.', action: 'joined as Creator', time: '24m ago', icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-600/10' },
                                            { user: 'Rahul D.', action: 'updated Service Tier', time: '45m ago', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                                            { user: 'Platform', action: 'applied System Patch 4.2', time: '1h ago', icon: Settings, color: 'text-muted-foreground', bg: 'bg-muted/10' }
                                        ].map((act, i) => (
                                            <div key={i} className="flex gap-4 group/act cursor-pointer">
                                                <div className={`w-10 h-10 rounded-xl ${act.bg} ${act.color} flex items-center justify-center shrink-0 group-hover/act:scale-110 transition-transform`}>
                                                    <act.icon className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-bold text-foreground group-hover/act:text-orange-600 transition-colors">{act.user}</div>
                                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{act.action}</div>
                                                    <div className="text-[9px] font-medium italic text-muted-foreground/60">{act.time}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button variant="outline" className="w-full rounded-2xl h-12 border-border/50 text-xs font-black uppercase tracking-widest hover:bg-muted">
                                        View All Protocols
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <Card className="border border-border/50 shadow-2xl shadow-black/5 rounded-[2.5rem] bg-card overflow-hidden transition-all duration-500">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div>
                                        <CardTitle className="text-2xl font-black tracking-tighter flex items-center gap-3 underline decoration-orange-600 decoration-4 underline-offset-4">
                                            User Directory
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground font-medium mt-2 italic">Control identities, privilege tiers, and feature overrides.</CardDescription>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name or @user..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-11 rounded-[1.25rem] bg-muted/30 border-none font-bold placeholder:font-medium h-12 text-sm focus-visible:ring-1 focus-visible:ring-orange-600/20"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-none">
                                            <TableHead className="px-8 font-black text-muted-foreground py-6 uppercase text-[9px] tracking-[0.2em]">Identity</TableHead>
                                            <TableHead className="font-black text-muted-foreground py-6 uppercase text-[9px] tracking-[0.2em]">Protocol Rank</TableHead>
                                            <TableHead className="font-black text-muted-foreground py-6 uppercase text-[9px] tracking-[0.2em]">Service Plan</TableHead>
                                            <TableHead className="font-black text-muted-foreground py-6 uppercase text-[9px] tracking-[0.2em]">Feature Overrides</TableHead>
                                            <TableHead className="px-8 font-black text-muted-foreground py-6 uppercase text-[9px] tracking-[0.2em] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers?.map((u: any) => (
                                            <TableRow key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                                                <TableCell className="px-8 py-6">
                                                    <div
                                                        className="flex items-center gap-4 cursor-pointer group/id"
                                                        onClick={() => {
                                                            setViewingUser(u);
                                                            setEditData({
                                                                name: u.name || '',
                                                                username: u.username || '',
                                                                role: u.user_roles?.[0]?.role || 'guest',
                                                                plan_id: u.plan_id || '',
                                                                avatar_url: u.avatar_url || null
                                                            });
                                                            setIsSheetOpen(true);
                                                        }}
                                                    >
                                                        <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-orange-600/10 to-orange-600/5 border border-orange-600/10 flex items-center justify-center font-black text-orange-600 text-lg shadow-inner group-hover/id:scale-105 transition-transform">
                                                            {u.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-foreground tracking-tighter leading-none group-hover/id:text-orange-600 transition-colors">{u.name || 'Anonymous'}</div>
                                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">@{u.username || 'n/a'}</div>
                                                            {(u.bookings?.length > 0 || u.digital_products?.length > 0) && (
                                                                <div className="flex items-center gap-1 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-700">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Creator</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className={cn(
                                                            "rounded-lg font-black text-[9px] uppercase px-2 py-0.5 tracking-widest border border-transparent",
                                                            u.user_roles?.[0]?.role === 'superadmin' ? "bg-orange-600 text-white border-orange-700 shadow-sm" :
                                                                u.user_roles?.[0]?.role === 'admin' ? "bg-orange-600/10 text-orange-600 border-orange-600/20" :
                                                                    "bg-muted text-muted-foreground"
                                                        )}>
                                                            {u.user_roles?.[0]?.role || 'guest'}
                                                        </Badge>
                                                        {u.user_roles?.[0]?.role === 'superadmin' && <Shield className="w-3.5 h-3.5 text-orange-600" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-lg border-orange-600/20 text-orange-600 bg-orange-600/5 font-black text-[9px] uppercase px-2 py-0.5 tracking-widest">
                                                        {plans?.find(p => p.id === u.plan_id)?.name || 'Basic'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                                        {featureFlags?.map((f: any) => {
                                                            const isManuallyUnlocked = userUnlocks?.some(un => un.user_id === u.user_id && un.feature_key === f.key);
                                                            const plan = plans?.find(p => p.id === u.plan_id);
                                                            const isPlanEnabled = plan?.feature_keys?.includes(f.key);

                                                            return (
                                                                <button
                                                                    key={f.key}
                                                                    onClick={() => handleToggleFeature(u.user_id, f.key, isManuallyUnlocked)}
                                                                    title={`${f.name}: ${isPlanEnabled ? 'Enabled by Plan' : isManuallyUnlocked ? 'Manual Override' : 'Disabled'}`}
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all border group/btn",
                                                                        isPlanEnabled
                                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm'
                                                                            : isManuallyUnlocked
                                                                                ? 'bg-orange-600 border-orange-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.1)]'
                                                                                : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:border-orange-600/30'
                                                                    )}
                                                                >
                                                                    {f.key === 'courses' ? <GraduationCap className="w-3.5 h-3.5" /> :
                                                                        f.key === 'webinars' ? <Video className="w-3.5 h-3.5" /> :
                                                                            f.key === 'bio_links' ? <Smartphone className="w-3.5 h-3.5" /> :
                                                                                f.key === 'instagram' ? <Instagram className="w-3.5 h-3.5" /> :
                                                                                    f.key === 'advanced_analytics' ? <BarChart3 className="w-3.5 h-3.5" /> :
                                                                                        f.key === 'instructors' ? <Users className="w-3.5 h-3.5" /> :
                                                                                            f.key === 'team_management' ? <Users className="w-3.5 h-3.5" /> :
                                                                                                f.key === 'apps' ? <Star className="w-3.5 h-3.5" /> :
                                                                                                    f.key === 'branding' ? <Layout className="w-3.5 h-3.5" /> :
                                                                                                        <Zap className="w-3.5 h-3.5" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted group/more h-10 w-10">
                                                                <MoreHorizontal className="w-5 h-5 text-muted-foreground group-hover/more:text-foreground" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border bg-card p-2 shadow-2xl">
                                                            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Creator Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setViewingUser(u);
                                                                    setEditData({
                                                                        name: u.name || '',
                                                                        username: u.username || '',
                                                                        role: u.user_roles?.[0]?.role || 'guest',
                                                                        plan_id: u.plan_id || '',
                                                                        avatar_url: u.avatar_url || null
                                                                    });
                                                                    setIsSheetOpen(true);
                                                                }}
                                                                className="rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-blue-500" />
                                                                <span className="font-bold text-sm">Configure Identity</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => toast.info(`Viewing profile for ${u.username}`)}
                                                                className="rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors"
                                                            >
                                                                <Eye className="w-4 h-4 text-emerald-500" />
                                                                <span className="font-bold text-sm">View Storefront</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-2 bg-border/50" />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setDeletingUser(u);
                                                                    setIsDeleteDialogOpen(true);
                                                                }}
                                                                className="rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                <span className="font-bold text-sm">Terminate Account</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'creators' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter underline decoration-orange-600/50 decoration-8 underline-offset-4">Creator Showcases</h2>
                                    <p className="text-muted-foreground font-medium mt-2">Curate the flagship creators displayed on the primary landing vectors.</p>
                                </div>
                                <Button
                                    className="rounded-2xl bg-foreground text-background font-black h-12 px-8 hover:opacity-90 transition-all shadow-xl hover:scale-105 active:scale-95 uppercase tracking-widest text-[10px]"
                                    onClick={() => {
                                        setEditingCreator(null);
                                        setCreatorForm({
                                            name: '',
                                            title: '',
                                            revenue: '',
                                            followers: '',
                                            quote: '',
                                            image_url: '',
                                            display_order: (featuredCreators?.length || 0) + 1,
                                            is_active: true
                                        });
                                        setIsCreatorDialogOpen(true);
                                    }}
                                >
                                    <Plus className="w-5 h-5 mr-3" /> Initialise Creator Profile
                                </Button>
                            </div>

                            <Card className="border border-border/50 shadow-2xl shadow-black/[0.02] rounded-[3rem] bg-card overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50 border-b border-border/50">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Creator</TableHead>
                                            <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Title</TableHead>
                                            <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Metrics</TableHead>
                                            <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Order</TableHead>
                                            <TableHead className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {featuredCreators?.map((c: any) => (
                                            <TableRow key={c.id} className="group hover:bg-muted/20 border-border/40 transition-colors">
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden border border-border/50">
                                                            {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-muted-foreground">N/A</div>}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-foreground uppercase tracking-tight">{c.name}</div>
                                                            <div className="text-[10px] font-bold text-muted-foreground italic truncate max-w-[200px]">"{c.quote?.slice(0, 40)}..."</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <Badge className="rounded-lg bg-orange-600/10 text-orange-600 border-none font-black text-[9px] uppercase tracking-widest px-3">
                                                        {c.title || 'Creator'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-black text-emerald-500">{c.revenue || 'N/A'}</div>
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{c.followers || '0'} Followers</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className="font-mono text-xs font-bold text-muted-foreground">#{c.display_order}</div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-xl h-10 w-10 hover:bg-orange-600/10 hover:text-orange-600"
                                                            onClick={() => {
                                                                setEditingCreator(c);
                                                                setCreatorForm({
                                                                    name: c.name,
                                                                    title: c.title || '',
                                                                    revenue: c.revenue || '',
                                                                    followers: c.followers || '',
                                                                    quote: c.quote || '',
                                                                    image_url: c.image_url || '',
                                                                    display_order: c.display_order,
                                                                    is_active: c.is_active
                                                                });
                                                                setIsCreatorDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-xl h-10 w-10 hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => handleDeleteCreator(c.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter underline decoration-orange-600/50 decoration-8 underline-offset-4">Revenue Protocols</h2>
                                    <p className="text-muted-foreground font-medium mt-2">Design, calibrate, and deploy subscription tiers and fiscal layers.</p>
                                </div>
                                <Button
                                    className="rounded-2xl bg-foreground text-background font-black h-12 px-8 hover:opacity-90 transition-all shadow-xl hover:scale-105 active:scale-95 uppercase tracking-widest text-[10px]"
                                    onClick={() => {
                                        setEditingPlan(null);
                                        setPlanForm({
                                            name: '',
                                            price: '',
                                            period: 'monthly',
                                            features: [],
                                            feature_keys: [],
                                            is_popular: false,
                                            is_active: true
                                        });
                                        setIsPlanDialogOpen(true);
                                    }}
                                >
                                    <Plus className="w-5 h-5 mr-3" /> Initialise New Tier
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {plans?.map((plan: any) => (
                                    <Card key={plan.id} className={cn(
                                        "border border-border/50 rounded-[3.5rem] p-12 relative overflow-hidden group transition-all duration-700",
                                        plan.is_popular
                                            ? 'border-orange-600/30 bg-orange-600/[0.03] shadow-[0_0_80px_rgba(234,88,12,0.05)]'
                                            : 'shadow-2xl shadow-black/[0.02] bg-card hover:border-orange-600/20'
                                    )}>
                                        {plan.is_popular && (
                                            <div className="absolute top-0 right-0">
                                                <div className="bg-orange-600 text-white text-[9px] font-black uppercase px-8 py-2 rotate-45 translate-x-12 translate-y-6 shadow-xl tracking-[0.2em]">Flagship Tier</div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-10">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20">
                                                        <CreditCard className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">{plan.name}</h3>
                                                        <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{plan.id.slice(0, 8)} protocol</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl font-black text-foreground tracking-tighter">₹{plan.price}</span>
                                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest italic">{plan.period} billing cycle</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="rounded-xl h-10 w-10 bg-muted/50 border border-border/40 hover:bg-orange-600/10 hover:text-orange-600 transition-colors"
                                                    onClick={() => {
                                                        setEditingPlan(plan);
                                                        setPlanForm({
                                                            name: plan.name,
                                                            price: plan.price,
                                                            period: plan.period,
                                                            features: plan.features || [],
                                                            feature_keys: plan.feature_keys || [],
                                                            is_popular: plan.is_popular,
                                                            is_active: plan.is_active
                                                        });
                                                        setIsPlanDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="rounded-xl h-10 w-10 bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500/10 transition-colors"
                                                    onClick={() => handleDeletePlan(plan.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                                {featureFlags?.map((f: any) => {
                                                    const isEnabled = plan.feature_keys?.includes(f.key);
                                                    return (
                                                        <div key={f.key} className={cn("flex items-center gap-3 py-1 transition-all", isEnabled ? "opacity-100" : "opacity-30")}>
                                                            <div className={cn("w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors", isEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted border-border/50 text-muted-foreground")}>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{f.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex items-center justify-between pt-8 border-t border-border/50">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-3 h-3 rounded-full", plan.is_active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-muted')} />
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{plan.is_active ? 'Protocol Active' : 'Draft / Off-chain'}</span>
                                                </div>
                                                <Button variant="ghost" className="text-[9px] font-black text-muted-foreground hover:text-orange-600 uppercase tracking-widest group">
                                                    Vector Overrides <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-4xl space-y-10 animate-in slide-in-from-bottom-10 duration-700">
                            <div className="mb-12">
                                <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase leading-[0.8]">
                                    Global <br /><span className="text-orange-600 italic">Settings</span>
                                </h1>
                                <p className="text-muted-foreground font-medium mt-6 text-lg max-w-xl">Configure platform-wide encryption, fiscal gateways, and high-level social automations.</p>
                            </div>

                            <Card className="border border-border/50 shadow-[0_0_100px_rgba(0,0,0,0.03)] rounded-[3rem] bg-card overflow-hidden">
                                <div className="p-10 border-b border-border/50 bg-muted/5 backdrop-blur-sm">
                                    <div className="flex items-center gap-6 mb-2">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-600/20">
                                            <CreditCard className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Financial Hub</CardTitle>
                                            <CardDescription className="text-muted-foreground font-bold">Configure Razorpay infrastructure for global payouts.</CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-12 space-y-10">
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Zap className="w-3 h-3" /> Gateway Key ID
                                            </label>
                                            <Input defaultValue="rzp_live_v2837..." className="rounded-2xl border-border bg-muted/20 font-mono text-sm h-14 px-6 focus-visible:ring-orange-600/20" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Shield className="w-3 h-3" /> Secret Token
                                            </label>
                                            <Input type="password" value="••••••••••••••••" className="rounded-2xl border-border bg-muted/20 font-mono text-sm h-14 px-6 focus-visible:ring-orange-600/20" />
                                        </div>
                                    </div>
                                    <Button className="w-full rounded-2xl font-black bg-foreground text-background h-16 hover:opacity-90 shadow-2xl transition-all active:scale-[0.98] uppercase tracking-[0.3em] text-xs">
                                        Commit Financial Config
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border border-border/50 shadow-[0_0_100px_rgba(0,0,0,0.03)] rounded-[3rem] bg-card overflow-hidden">
                                <div className="p-10 border-b border-border/50 bg-muted/5 backdrop-blur-sm">
                                    <div className="flex items-center gap-6 mb-2">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/20">
                                            <Instagram className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Social Nexus</CardTitle>
                                            <CardDescription className="text-muted-foreground font-bold">Configure Meta / Instagram API global application layer.</CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-12 space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <Smartphone className="w-3 h-3" /> Global Application ID
                                        </label>
                                        <Input defaultValue="8237192849102374" className="rounded-2xl border-border bg-muted/20 font-mono text-sm h-14 px-6 focus-visible:ring-blue-600/20" />
                                    </div>
                                    <Button className="w-full rounded-2xl font-black bg-foreground text-background h-16 hover:opacity-90 shadow-2xl transition-all active:scale-[0.98] uppercase tracking-[0.3em] text-xs">
                                        Update Application Layer
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'cms' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Digital Architecture</h2>
                                    <p className="text-muted-foreground font-medium mt-2">Manage the platform's visual identity and global content vectors.</p>
                                </div>
                                <Button className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black h-12 px-8 shadow-xl shadow-orange-600/20 uppercase tracking-widest text-[10px]" onClick={() => refetchConfig()}>
                                    Refresh Config
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {siteConfig?.map((config: any) => (
                                    <Card key={config.id} className="border border-border/50 shadow-2xl shadow-black/[0.02] rounded-[3rem] bg-card overflow-hidden group hover:border-orange-600/20 transition-all duration-500">
                                        <div className="p-10 border-b border-border/50 bg-muted/5">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-600 flex items-center justify-center shadow-inner">
                                                    <Globe className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight">{config.key.replace(/_/g, ' ')}</CardTitle>
                                                    <CardDescription className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase">{config.description}</CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                        <CardContent className="p-10 space-y-6">
                                            <div className="space-y-4">
                                                {Object.entries(config.value).map(([vKey, vVal]: [string, any]) => (
                                                    <div key={vKey} className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">{vKey.replace(/_/g, ' ')}</label>
                                                        {typeof vVal === 'boolean' ? (
                                                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-border/40">
                                                                <span className="text-sm font-bold text-foreground">Protocol Status</span>
                                                                <Checkbox
                                                                    checked={vVal}
                                                                    onCheckedChange={async (checked) => {
                                                                        const newValue = { ...config.value, [vKey]: !!checked };
                                                                        const { error } = await supabase.from('site_config').update({ value: newValue }).eq('id', config.id);
                                                                        if (!error) {
                                                                            toast.success(`Config ${config.key} synchronized`);
                                                                            refetchConfig();
                                                                        }
                                                                    }}
                                                                    className="w-5 h-5 rounded-md border-border bg-card data-[state=checked]:bg-orange-600"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                defaultValue={vVal}
                                                                className="rounded-xl border-border bg-muted/10 h-12 px-4 text-sm font-bold"
                                                                onBlur={async (e) => {
                                                                    if (e.target.value === vVal) return;
                                                                    const newValue = { ...config.value, [vKey]: e.target.value };
                                                                    const { error } = await supabase.from('site_config').update({ value: newValue }).eq('id', config.id);
                                                                    if (!error) {
                                                                        toast.success(`Config ${config.key} written to core`);
                                                                        refetchConfig();
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono">Synced @ {new Date(config.updated_at).toLocaleTimeString()}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-600/10 hover:text-orange-600 transition-colors">
                                                    <Fingerprint className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Global Feature Matrix</h2>
                                    <p className="text-muted-foreground font-medium mt-2">Manage the availability of platform capabilities across the ecosystem.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {featureFlags?.map((f: any) => (
                                    <Card key={f.id} className="border border-border/50 rounded-[2.5rem] bg-card overflow-hidden hover:border-orange-600/20 transition-all duration-500">
                                        <CardContent className="p-8 space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                                                    {f.key === 'courses' ? <GraduationCap className="w-6 h-6" /> :
                                                        f.key === 'webinars' ? <Video className="w-6 h-6" /> :
                                                            f.key === 'bio_links' ? <Smartphone className="w-6 h-6" /> :
                                                                f.key === 'instagram' ? <Instagram className="w-6 h-6" /> :
                                                                    f.key === 'advanced_analytics' ? <BarChart3 className="w-6 h-6" /> :
                                                                        <Zap className="w-6 h-6" />}
                                                </div>
                                                <Checkbox
                                                    checked={f.is_enabled}
                                                    onCheckedChange={() => handleToggleGlobalFeature(f.id, f.is_enabled)}
                                                    className="w-6 h-6 rounded-lg data-[state=checked]:bg-orange-600"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-black text-foreground uppercase tracking-tight">{f.name}</h3>
                                                <p className="text-[10px] text-muted-foreground font-medium">{f.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                                                <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", f.is_enabled ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-muted-foreground")}>
                                                    {f.is_enabled ? 'Protocol Live' : 'Maintenance Mode'}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Plan Management Dialog */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-[3rem] border-border bg-card shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-10 border-b border-border/50 bg-muted/5">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-600/20 mb-6">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none">
                            {editingPlan ? 'Calibrate Protocol' : 'Initialise Protocol'}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground mt-4 text-lg">
                            Configure fiscal parameters and feature inheritance for the revenue tier.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-10 space-y-8 scrollbar-hide max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Protocol Name</label>
                                <Input
                                    value={planForm.name}
                                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                    placeholder="e.g. Creator Pro"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Fiscal Weight (INR)</label>
                                <Input
                                    value={planForm.price}
                                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                                    placeholder="999"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Feature Protocols (Inherited)</label>
                            <div className="grid grid-cols-2 gap-4 border border-border/50 rounded-3xl p-6 bg-muted/5">
                                {featureFlags?.map((f: any) => (
                                    <div key={f.key} className="flex items-center gap-3">
                                        <Checkbox
                                            id={`plan-feat-${f.key}`}
                                            checked={planForm.feature_keys.includes(f.key)}
                                            onCheckedChange={(checked) => {
                                                const keys = checked
                                                    ? [...planForm.feature_keys, f.key]
                                                    : planForm.feature_keys.filter(k => k !== f.key);
                                                setPlanForm({ ...planForm, feature_keys: keys });
                                            }}
                                            className="w-5 h-5 rounded-md border-border bg-card data-[state=checked]:bg-orange-600"
                                        />
                                        <label htmlFor={`plan-feat-${f.key}`} className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{f.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 rounded-3xl bg-orange-600/5 border border-orange-600/10">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-600">Flagship Protocol</div>
                                <div className="text-[9px] text-muted-foreground font-medium italic">Display as the recommended selection for creators.</div>
                            </div>
                            <Checkbox
                                checked={planForm.is_popular}
                                onCheckedChange={(checked) => setPlanForm({ ...planForm, is_popular: !!checked })}
                                className="w-6 h-6 rounded-lg data-[state=checked]:bg-orange-600"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-10 bg-muted/5 border-t border-border/50">
                        <Button
                            onClick={handleSavePlan}
                            className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-orange-600/20"
                        >
                            Commit Protocol Evolution
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Featured Creator Dialog */}
            <Dialog open={isCreatorDialogOpen} onOpenChange={setIsCreatorDialogOpen}>
                <DialogContent className="sm:max-w-[700px] rounded-[3rem] border-border bg-card shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-10 border-b border-border/50 bg-muted/5">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-600/20 mb-6">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none">
                            {editingCreator ? 'Synchronize Creator' : 'Initialise Creator'}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground mt-4 text-lg">
                            Configure the visual identity and fiscal credentials for the featured showcase.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-10 space-y-8 scrollbar-hide max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Creator Name</label>
                                <Input
                                    value={creatorForm.name}
                                    onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
                                    placeholder="e.g. Khushboo Bist"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Professional Title</label>
                                <Input
                                    value={creatorForm.title}
                                    onChange={(e) => setCreatorForm({ ...creatorForm, title: e.target.value })}
                                    placeholder="e.g. INTIMACY COACH"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Revenue Stream</label>
                                <Input
                                    value={creatorForm.revenue}
                                    onChange={(e) => setCreatorForm({ ...creatorForm, revenue: e.target.value })}
                                    placeholder="e.g. $12k/mo"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Audience Multiplier</label>
                                <Input
                                    value={creatorForm.followers}
                                    onChange={(e) => setCreatorForm({ ...creatorForm, followers: e.target.value })}
                                    placeholder="e.g. 450K"
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Testimonial Directive</label>
                            <Input
                                value={creatorForm.quote}
                                onChange={(e) => setCreatorForm({ ...creatorForm, quote: e.target.value })}
                                placeholder="The automation is life-changing..."
                                className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Avatar Vector (Upload or URL)</label>
                                <div className="flex gap-4">
                                    <Input
                                        value={creatorForm.image_url}
                                        onChange={(e) => setCreatorForm({ ...creatorForm, image_url: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                        className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold flex-1"
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="creator-image-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploading(true);
                                                    try {
                                                        const url = await uploadImage(file);
                                                        setCreatorForm({ ...creatorForm, image_url: url });
                                                        toast.success('Vector synchronized to core');
                                                    } catch (err: any) {
                                                        toast.error(err.message);
                                                    } finally {
                                                        setIsUploading(false);
                                                    }
                                                }
                                            }}
                                            disabled={isUploading}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-2xl border-border bg-muted/10 h-14 px-6 hover:bg-orange-600/10 hover:text-orange-600 transition-all"
                                            onClick={() => document.getElementById('creator-image-upload')?.click()}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Upload className="w-5 h-5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Display Priority</label>
                                <Input
                                    type="number"
                                    value={creatorForm.display_order}
                                    onChange={(e) => setCreatorForm({ ...creatorForm, display_order: parseInt(e.target.value) })}
                                    className="rounded-2xl border-border bg-muted/10 h-14 px-6 text-sm font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-10 bg-muted/5 border-t border-border/50">
                        <Button
                            onClick={handleSaveCreator}
                            className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-orange-600/20"
                        >
                            Commit Creator Evolution
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Legacy Identity Protocols Deprecated - Consolidated into Command Center Sheet */}

            {/* Deletion Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2.5rem] border-border bg-card shadow-2xl p-0 overflow-hidden">
                    <div className="p-8 border-b border-border/50 bg-red-600/5">
                        <AlertDialogHeader>
                            <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-red-600/20">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none text-red-600">Terminate Account?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold text-muted-foreground mt-4 text-lg">
                                You are about to terminate the identity <span className="text-foreground underline decoration-red-500 decoration-2 underline-offset-4">@{deletingUser?.username}</span> and all associated protocols.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                    <div className="p-8 bg-muted/5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                            This action is irreversible. All digital assets, storefronts, and earnings associated with this creator will be permanently deleted from the Zenthra environment.
                        </p>
                    </div>
                    <AlertDialogFooter className="p-8 pt-0 gap-3">
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black px-8 h-12 shadow-xl shadow-red-600/20 uppercase tracking-widest text-xs border-none"
                        >
                            Execute Termination
                        </AlertDialogAction>
                        <AlertDialogCancel className="rounded-2xl font-bold h-12 px-6 border-border hover:bg-muted">
                            Cancel Abort
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Detailed View Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-full sm:max-w-xl bg-card border-l border-border/50 p-0 overflow-y-auto">
                    <div className="h-40 bg-gradient-to-br from-orange-600 to-orange-800 relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <div className="absolute -bottom-12 left-10">
                            <div className="w-24 h-24 rounded-[2rem] bg-card border-4 border-card shadow-2xl flex items-center justify-center text-3xl font-black text-orange-600 uppercase">
                                {viewingUser?.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>

                    <div className="px-10 pt-20 pb-10 space-y-10">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                                    {editData.name || 'Anonymous'}
                                </h2>
                                <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px] flex items-center gap-2">
                                    @{editData.username || 'n/a'}
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    ID: {viewingUser?.id?.slice(0, 8)}...
                                </p>
                            </div>
                            <Badge className="rounded-xl bg-orange-600 text-white px-4 py-1.5 font-black uppercase tracking-widest text-[10px] border-none shadow-lg shadow-orange-600/20">
                                {editData.role || 'Guest'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-muted/20 border-border/50 p-6 rounded-[2rem]">
                                <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-muted-foreground leading-none">Revenue (Total)</CardDescription>
                                <CardTitle className="text-2xl font-black text-emerald-500 leading-none tracking-tighter tabular-nums">
                                    ₹{creatorDetails?.stats?.revenue?.toLocaleString() || '0'}
                                </CardTitle>
                            </Card>
                            <Card className="bg-muted/20 border-border/50 p-6 rounded-[2rem]">
                                <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-muted-foreground leading-none">Service Tier</CardDescription>
                                <CardTitle className="text-2xl font-black text-orange-600 leading-none tracking-tighter uppercase tabular-nums">
                                    {creatorDetails?.plan_name || 'Basic'}
                                </CardTitle>
                            </Card>
                        </div>

                        {/* Configuration Lab */}
                        <div className="space-y-10 pt-4">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-600 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Identity Configuration
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col items-center gap-4 py-4 mb-4 border-b border-border/30">
                                        <div className="relative group/avatar">
                                            <div className="w-24 h-24 rounded-[2rem] bg-muted overflow-hidden border-4 border-card shadow-xl transition-all duration-500 group-hover/avatar:scale-105">
                                                {editData.avatar_url ? (
                                                    <img src={editData.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-orange-600/10">
                                                        <Users className="w-10 h-10 text-orange-600" />
                                                    </div>
                                                )}
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                                                        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-foreground text-background shadow-xl flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all scale-90 group-hover/avatar:scale-100"
                                                onClick={() => document.getElementById('user-avatar-upload')?.click()}
                                                disabled={isUploading}
                                            >
                                                <Upload className="w-5 h-5" />
                                            </button>
                                            <input
                                                type="file"
                                                id="user-avatar-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file && viewingUser) {
                                                        setIsUploading(true);
                                                        try {
                                                            const url = await uploadImage(file, 'avatars');
                                                            setEditData({ ...editData, avatar_url: url });
                                                            toast.success('Visual identity synchronized');
                                                        } catch (err: any) {
                                                            toast.error(err.message);
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Avatar Terminal</p>
                                            <p className="text-[9px] text-muted-foreground font-medium italic mt-1 leading-none">Update creator's visual protocol.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Display Name</label>
                                        <Input
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            className="rounded-xl border-border bg-muted/10 h-11 px-4 text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Username Handle</label>
                                        <Input
                                            value={editData.username}
                                            onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                            className="rounded-xl border-border bg-muted/10 h-11 px-4 text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Protocol Rank</label>
                                        <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                                            <SelectTrigger className="rounded-xl border-border bg-muted/10 h-11 px-4 text-sm font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border bg-card">
                                                <SelectItem value="guest">Guest / Creator</SelectItem>
                                                <SelectItem value="admin">Platform Admin</SelectItem>
                                                <SelectItem value="superadmin">Superadmin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Fiscal Tier</label>
                                        <Select value={editData.plan_id || 'none'} onValueChange={(v) => setEditData({ ...editData, plan_id: v === 'none' ? '' : v })}>
                                            <SelectTrigger className="rounded-xl border-border bg-muted/10 h-11 px-4 text-sm font-bold">
                                                <SelectValue placeholder="Select Plan" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border bg-card">
                                                <SelectItem value="none" className="text-muted-foreground">Standard Basic</SelectItem>
                                                {plans?.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSaveProfile}
                                    className="w-full h-12 rounded-xl bg-foreground text-background font-black uppercase tracking-[0.2em] text-[10px] shadow-lg hover:opacity-90 mt-2"
                                >
                                    Synchronize Identity
                                </Button>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-border/50">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-600 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Feature Lab
                                </h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                    {featureFlags?.map((f: any) => {
                                        const isManuallyUnlocked = userUnlocks?.some(un => un.user_id === viewingUser?.user_id && un.feature_key === f.key);
                                        const planId = users?.find(u => u.user_id === viewingUser?.user_id)?.plan_id;
                                        const plan = plans?.find(p => p.id === planId);
                                        const isPlanEnabled = plan?.feature_keys?.includes(f.key);

                                        return (
                                            <div key={f.key} className="flex items-center space-x-3 group/feat">
                                                <div className="relative">
                                                    <Checkbox
                                                        id={`feat-${f.key}`}
                                                        checked={isPlanEnabled || isManuallyUnlocked}
                                                        disabled={isPlanEnabled}
                                                        onCheckedChange={() => handleToggleFeature(viewingUser?.user_id, f.key, isManuallyUnlocked)}
                                                        className="w-5 h-5 rounded-md border-border bg-muted/20 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                                    />
                                                    {isPlanEnabled && (
                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" title="System Verified Plan Accessory" />
                                                    )}
                                                </div>
                                                <div className="grid gap-1.5 leading-none">
                                                    <label
                                                        htmlFor={`feat-${f.key}`}
                                                        className={cn(
                                                            "text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors",
                                                            isPlanEnabled ? "text-emerald-500" : "text-foreground group-hover/feat:text-orange-600"
                                                        )}
                                                    >
                                                        {f.name}
                                                    </label>
                                                    <p className="text-[9px] text-muted-foreground font-medium italic">
                                                        {isPlanEnabled ? "Inherited Protocol" : isManuallyUnlocked ? "Administrative Lock Bypass" : "Restricted Access"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-border/50">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" /> Digital Assets
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-border/40 hover:border-orange-600/20 transition-all group/stat">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Active Bookings</div>
                                        </div>
                                        <div className="font-black text-sm tabular-nums">{creatorDetails?.stats?.bookings_count || 0}</div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-border/40 hover:border-orange-600/20 transition-all group/stat">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                                <GraduationCap className="w-4 h-4" />
                                            </div>
                                            <div className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Digital Courses</div>
                                        </div>
                                        <div className="font-black text-sm tabular-nums">{creatorDetails?.stats?.courses_count || 0}</div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-border/40 hover:border-orange-600/20 transition-all group/stat">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                                <LayoutGrid className="w-4 h-4" />
                                            </div>
                                            <div className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Total Products</div>
                                        </div>
                                        <div className="font-black text-sm tabular-nums">{creatorDetails?.stats?.products_count || 0}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-border/50 pb-10">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4" /> Security Identity
                                </h3>
                                <Card className="bg-muted/10 border-border/30 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-muted-foreground uppercase px-0.5">Secure Core Email</div>
                                            <div className="font-bold text-xs text-foreground">{creatorDetails?.email || '••••@••••••••'}</div>
                                        </div>
                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-border/50" onClick={() => {
                                            if (creatorDetails?.email) {
                                                navigator.clipboard.writeText(creatorDetails.email);
                                                toast.success('Vector copied');
                                            }
                                        }}>
                                            <Plus className="w-3 h-3 rotate-45" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-muted-foreground uppercase px-0.5">User UUID Reflection</div>
                                            <code className="text-[10px] font-mono text-muted-foreground/80 break-all">{viewingUser?.user_id?.slice(0, 18)}...</code>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <div className="text-[9px] font-black text-muted-foreground uppercase px-0.5">Protocol Entry</div>
                                            <div className="text-[10px] font-bold text-foreground">
                                                {viewingUser?.created_at && new Date(viewingUser.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
