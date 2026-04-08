import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users, Search, Plus, MoreVertical, Copy, RefreshCw, Ban, CheckCircle2,
    Trash2, Mail, Phone, IndianRupee, GraduationCap, Clock, PlayCircle,
    BookOpen, TrendingUp, UserCheck, UserX, ChevronRight, Link2, Loader2,
    AlertCircle, User, Calendar, Shield, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const db = supabase as any;

// ─── Types ──────────────────────────────────────────────────────────────────

interface CourseInfo {
    id: string;
    title: string;
    thumbnail_url: string | null;
    slug: string;
}

interface CoursePurchase {
    id: string;
    course_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    status: 'paid' | 'pending' | 'revoked';
    access_token: string;
    payment_provider: string;
    created_at: string;
    course: CourseInfo;
}

interface LessonProgress {
    lesson_id: string;
    progress_seconds: number;
    is_completed: boolean;
    last_watched_at: string;
}

interface CourseLesson {
    id: string;
    title: string;
    order_index: number;
    video_duration: number;
}

interface CustomerGroup {
    email: string;
    name: string;
    phone: string;
    purchases: CoursePurchase[];
    totalSpent: number;
    lastActivity: string;
    activeCourses: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string) {
    if (status === 'paid') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (status === 'revoked') return 'bg-red-500/15 text-red-400 border-red-500/20';
    return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
}

function statusLabel(status: string) {
    if (status === 'paid') return 'Active';
    if (status === 'revoked') return 'Revoked';
    return 'Pending';
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function avatarLetters(name: string, email: string) {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
}

function avatarColor(email: string) {
    const colors = [
        'from-violet-500 to-purple-600',
        'from-blue-500 to-cyan-600',
        'from-emerald-500 to-teal-600',
        'from-orange-500 to-amber-600',
        'from-pink-500 to-rose-600',
    ];
    let hash = 0;
    for (const c of email) hash = ((hash << 5) - hash) + c.charCodeAt(0);
    return colors[Math.abs(hash) % colors.length];
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <Card className="bg-zinc-900/60 border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-xs text-zinc-500 font-medium">{label}</p>
                    <p className="text-xl font-bold text-white">{value}</p>
                    {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Progress Detail Row ─────────────────────────────────────────────────────

function PurchaseProgressCard({
    purchase, lessons, progress,
}: {
    purchase: CoursePurchase;
    lessons: CourseLesson[];
    progress: LessonProgress[];
}) {
    const completed = progress.filter(p => p.is_completed).length;
    const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
    const lastWatched = progress
        .filter(p => p.last_watched_at)
        .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())[0];

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{completed}/{lessons.length} lessons complete</span>
                <span className="font-semibold text-white">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5 bg-zinc-800" />
            {lastWatched && (
                <p className="text-[11px] text-zinc-600">
                    Last watched {formatDistanceToNow(new Date(lastWatched.last_watched_at), { addSuffix: true })}
                </p>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Customers() {
    const { user } = useAuth();

    // Data
    const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
    const [adminCourses, setAdminCourses] = useState<CourseInfo[]>([]);
    const [loading, setLoading] = useState(true);

    // Per-customer detail
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailProgress, setDetailProgress] = useState<Record<string, LessonProgress[]>>({}); // purchaseId → progress[]
    const [detailLessons, setDetailLessons] = useState<Record<string, CourseLesson[]>>({}); // courseId → lessons[]
    const [detailLoading, setDetailLoading] = useState(false);

    // Add access dialog
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addTarget, setAddTarget] = useState<CustomerGroup | null>(null); // null = new customer
    const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', courseId: '', amount: '' });
    const [addLoading, setAddLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');

    // Action loading states
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // ─── Fetch data ───────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get admin's courses
            const { data: coursesData, error: coursesErr } = await supabase
                .from('courses')
                .select('id, title, thumbnail_url, slug')
                .eq('user_id', user.id)
                .order('title');
            if (coursesErr) throw coursesErr;
            const courses = (coursesData || []) as CourseInfo[];
            setAdminCourses(courses);

            if (courses.length === 0) {
                setPurchases([]);
                return;
            }

            const courseIds = courses.map(c => c.id);

            // Get all purchases for admin's courses
            const { data: purchasesData, error: purchasesErr } = await db
                .from('course_purchases')
                .select(`
                    id, course_id, customer_name, customer_email, customer_phone,
                    amount, status, access_token, payment_provider, created_at,
                    course:courses(id, title, thumbnail_url, slug)
                `)
                .in('course_id', courseIds)
                .order('created_at', { ascending: false });

            if (purchasesErr) throw purchasesErr;
            setPurchases((purchasesData || []) as CoursePurchase[]);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Group by customer ────────────────────────────────────────────────────

    const customers = useMemo<CustomerGroup[]>(() => {
        const groups: Record<string, CustomerGroup> = {};
        for (const p of purchases) {
            const key = p.customer_email.toLowerCase();
            if (!groups[key]) {
                groups[key] = {
                    email: p.customer_email,
                    name: p.customer_name || '',
                    phone: p.customer_phone || '',
                    purchases: [],
                    totalSpent: 0,
                    lastActivity: p.created_at,
                    activeCourses: 0,
                };
            }
            groups[key].purchases.push(p);
            groups[key].totalSpent += p.amount || 0;
            if (p.created_at > groups[key].lastActivity) groups[key].lastActivity = p.created_at;
            if (p.status === 'paid') groups[key].activeCourses++;
        }
        return Object.values(groups).sort((a, b) =>
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
    }, [purchases]);

    // ─── Filtered list ────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        return customers.filter(c => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                c.email.includes(q) ||
                c.name.toLowerCase().includes(q) ||
                c.phone.includes(q);
            const matchStatus = statusFilter === 'all' ||
                c.purchases.some(p => p.status === statusFilter);
            const matchCourse = courseFilter === 'all' ||
                c.purchases.some(p => p.course_id === courseFilter);
            return matchSearch && matchStatus && matchCourse;
        });
    }, [customers, search, statusFilter, courseFilter]);

    // ─── Stats ────────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const totalRevenue = purchases.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
        const activeCount = customers.filter(c => c.activeCourses > 0).length;
        const revokedCount = purchases.filter(p => p.status === 'revoked').length;
        return { totalRevenue, activeCount, revokedCount, totalCustomers: customers.length };
    }, [purchases, customers]);

    // ─── Open customer detail ─────────────────────────────────────────────────

    const openDetail = async (customer: CustomerGroup) => {
        setSelectedCustomer(customer);
        setIsDetailOpen(true);
        setDetailLoading(true);
        setDetailProgress({});
        setDetailLessons({});
        try {
            // Fetch progress for all purchases
            const purchaseIds = customer.purchases.map(p => p.id);
            const { data: progressData } = await db
                .from('course_progress')
                .select('purchase_id, lesson_id, progress_seconds, is_completed, last_watched_at')
                .in('purchase_id', purchaseIds);

            // Group progress by purchaseId
            const progressMap: Record<string, LessonProgress[]> = {};
            for (const row of (progressData || [])) {
                if (!progressMap[row.purchase_id]) progressMap[row.purchase_id] = [];
                progressMap[row.purchase_id].push(row);
            }
            setDetailProgress(progressMap);

            // Fetch lessons for each unique course
            const courseIds = [...new Set(customer.purchases.map(p => p.course_id))];
            const { data: lessonsData } = await db
                .from('course_lessons')
                .select('id, title, order_index, video_duration')
                .in('course_id', courseIds)
                .order('order_index');

            // Group lessons by courseId - we need to know which lesson belongs to which course
            // Fetch with course_id included
            const { data: lessonsWithCourse } = await db
                .from('course_lessons')
                .select('id, course_id, title, order_index, video_duration')
                .in('course_id', courseIds)
                .order('order_index');

            const lessonsMap: Record<string, CourseLesson[]> = {};
            for (const l of (lessonsWithCourse || [])) {
                if (!lessonsMap[l.course_id]) lessonsMap[l.course_id] = [];
                lessonsMap[l.course_id].push(l);
            }
            setDetailLessons(lessonsMap);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load customer details');
        } finally {
            setDetailLoading(false);
        }
    };

    // ─── Actions ─────────────────────────────────────────────────────────────

    const setAction = (id: string, val: boolean) =>
        setActionLoading(prev => ({ ...prev, [id]: val }));

    const handleRevokeAccess = async (purchaseId: string) => {
        setAction(purchaseId, true);
        try {
            await db.from('course_purchases').update({ status: 'revoked' }).eq('id', purchaseId);
            toast.success('Access revoked');
            await fetchData();
            // Refresh selected customer
            if (selectedCustomer) {
                const updated = customers.find(c => c.email === selectedCustomer.email);
                if (updated) setSelectedCustomer({ ...updated });
            }
        } catch { toast.error('Failed to revoke access'); }
        finally { setAction(purchaseId, false); }
    };

    const handleRestoreAccess = async (purchaseId: string) => {
        setAction(purchaseId, true);
        try {
            await db.from('course_purchases').update({ status: 'paid' }).eq('id', purchaseId);
            toast.success('Access restored');
            await fetchData();
        } catch { toast.error('Failed to restore access'); }
        finally { setAction(purchaseId, false); }
    };

    const handleRegenerateToken = async (purchaseId: string) => {
        setAction(`regen-${purchaseId}`, true);
        try {
            const newToken = crypto.randomUUID();
            await db.from('course_purchases').update({ access_token: newToken }).eq('id', purchaseId);
            toast.success('New access link generated');
            await fetchData();
        } catch { toast.error('Failed to regenerate link'); }
        finally { setAction(`regen-${purchaseId}`, false); }
    };

    const handleCopyLink = (accessToken: string) => {
        const url = `${window.location.origin}/course/${accessToken}`;
        navigator.clipboard.writeText(url);
        toast.success('Access link copied!');
    };

    const handleDeletePurchase = async (purchaseId: string) => {
        if (!confirm('Delete this purchase record? This cannot be undone.')) return;
        setAction(`del-${purchaseId}`, true);
        try {
            await db.from('course_purchases').delete().eq('id', purchaseId);
            toast.success('Purchase deleted');
            await fetchData();
            // If no more purchases, close detail
            if (selectedCustomer && selectedCustomer.purchases.length === 1) {
                setIsDetailOpen(false);
                setSelectedCustomer(null);
            }
        } catch { toast.error('Failed to delete purchase'); }
        finally { setAction(`del-${purchaseId}`, false); }
    };

    // ─── Add new access ───────────────────────────────────────────────────────

    const openAddDialog = (customer?: CustomerGroup) => {
        setAddTarget(customer || null);
        setAddForm({
            name: customer?.name || '',
            email: customer?.email || '',
            phone: customer?.phone || '',
            courseId: '',
            amount: '',
        });
        setIsAddOpen(true);
    };

    const handleAddAccess = async () => {
        const { name, email, phone, courseId, amount } = addForm;
        if (!email.trim() || !courseId) {
            toast.error('Email and course are required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Enter a valid email address');
            return;
        }

        setAddLoading(true);
        try {
            await db.from('course_purchases').insert({
                course_id: courseId,
                customer_name: name.trim(),
                customer_email: email.trim().toLowerCase(),
                customer_phone: phone.trim(),
                amount: parseFloat(amount) || 0,
                status: 'paid',
                payment_provider: 'manual',
            });
            toast.success('Customer access granted!');
            setIsAddOpen(false);
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add access');
        } finally {
            setAddLoading(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Customers
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage customer access, track progress, and grant or revoke course access.
                        </p>
                    </div>
                    <Button
                        onClick={() => openAddDialog()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers} color="bg-blue-600" />
                    <StatCard icon={UserCheck} label="Active" value={stats.activeCount} sub="with active access" color="bg-emerald-600" />
                    <StatCard icon={IndianRupee} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="bg-violet-600" />
                    <StatCard icon={UserX} label="Revoked" value={stats.revokedCount} sub="access revoked" color="bg-red-600" />
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email or phone…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 bg-background border-border"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40 bg-background border-border">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="paid">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="w-full sm:w-52 bg-background border-border">
                            <SelectValue placeholder="All Courses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {adminCourses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">
                            {search || statusFilter !== 'all' || courseFilter !== 'all'
                                ? 'No customers match your filters'
                                : 'No customers yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {search ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
                        </p>
                        {!search && statusFilter === 'all' && courseFilter === 'all' && (
                            <Button className="mt-4" onClick={() => openAddDialog()}>
                                <Plus className="w-4 h-4 mr-2" /> Add Customer
                            </Button>
                        )}
                    </div>
                ) : (
                    <Card className="bg-card border-border overflow-hidden">
                        {/* Table header */}
                        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span>Customer</span>
                            <span>Courses</span>
                            <span>Spent</span>
                            <span>Joined</span>
                            <span />
                        </div>

                        <div className="divide-y divide-border">
                            {filtered.map(customer => (
                                <div
                                    key={customer.email}
                                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center group"
                                    onClick={() => openDetail(customer)}
                                >
                                    {/* Customer info */}
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                                            avatarColor(customer.email)
                                        )}>
                                            {avatarLetters(customer.name, customer.email)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground text-sm truncate">
                                                {customer.name || <span className="text-muted-foreground italic">No name</span>}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                                            {customer.phone && (
                                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Courses */}
                                    <div className="flex flex-wrap gap-1">
                                        {customer.purchases.slice(0, 2).map(p => (
                                            <Badge
                                                key={p.id}
                                                variant="outline"
                                                className={cn('text-[10px] px-1.5 py-0 border', statusColor(p.status))}
                                            >
                                                {statusLabel(p.status)}
                                            </Badge>
                                        ))}
                                        {customer.purchases.length > 2 && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                +{customer.purchases.length - 2}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground ml-1 self-center">
                                            {customer.purchases.length} course{customer.purchases.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Revenue */}
                                    <div className="text-sm font-semibold text-foreground">
                                        {formatCurrency(customer.totalSpent)}
                                    </div>

                                    {/* Date */}
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(customer.lastActivity), 'dd MMM yyyy')}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={e => { e.stopPropagation(); openAddDialog(customer); }}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Access
                                        </Button>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                            Showing {filtered.length} of {customers.length} customers
                        </div>
                    </Card>
                )}
            </div>

            {/* ─── Customer Detail Sheet ─────────────────────────────────────── */}
            <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-white/5" side="right">
                    {selectedCustomer && (
                        <>
                            <SheetHeader className="p-6 border-b border-white/5 flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg flex-shrink-0',
                                        avatarColor(selectedCustomer.email)
                                    )}>
                                        {avatarLetters(selectedCustomer.name, selectedCustomer.email)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-white text-lg font-bold">
                                            {selectedCustomer.name || 'Unknown Name'}
                                        </SheetTitle>
                                        <SheetDescription className="text-zinc-400 text-sm mt-0.5">
                                            {selectedCustomer.email}
                                        </SheetDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/10 text-zinc-300 hover:bg-white/5 flex-shrink-0"
                                        onClick={() => openAddDialog(selectedCustomer)}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Course
                                    </Button>
                                </div>

                                {/* Customer meta */}
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                        <p className="text-lg font-bold text-white">{selectedCustomer.purchases.length}</p>
                                        <p className="text-[11px] text-zinc-500">Courses</p>
                                    </div>
                                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                        <p className="text-lg font-bold text-white">{selectedCustomer.activeCourses}</p>
                                        <p className="text-[11px] text-zinc-500">Active</p>
                                    </div>
                                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                        <p className="text-lg font-bold text-white">
                                            {formatCurrency(selectedCustomer.totalSpent)}
                                        </p>
                                        <p className="text-[11px] text-zinc-500">Spent</p>
                                    </div>
                                </div>

                                {/* Contact info */}
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                                    </span>
                                    {selectedCustomer.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Joined {format(new Date(selectedCustomer.lastActivity), 'dd MMM yyyy')}
                                    </span>
                                </div>
                            </SheetHeader>

                            <ScrollArea className="flex-1 p-6">
                                {detailLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                            Course Access
                                        </h3>

                                        {selectedCustomer.purchases.map(purchase => {
                                            const lessons = detailLessons[purchase.course_id] || [];
                                            const progress = detailProgress[purchase.id] || [];
                                            const completedCount = progress.filter(p => p.is_completed).length;
                                            const isActing = actionLoading[purchase.id];

                                            return (
                                                <Card key={purchase.id} className="bg-zinc-900/60 border-white/5 overflow-hidden">
                                                    <CardContent className="p-0">
                                                        {/* Course header */}
                                                        <div className="flex items-start gap-3 p-4">
                                                            {purchase.course?.thumbnail_url ? (
                                                                <img
                                                                    src={purchase.course.thumbnail_url}
                                                                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                                    <GraduationCap className="w-6 h-6 text-zinc-600" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="font-semibold text-white text-sm line-clamp-1">
                                                                        {purchase.course?.title || 'Unknown Course'}
                                                                    </p>
                                                                    <Badge className={cn('text-[10px] px-1.5 flex-shrink-0', statusColor(purchase.status))}>
                                                                        {statusLabel(purchase.status)}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        {completedCount}/{lessons.length} lessons
                                                                    </span>
                                                                    {purchase.amount > 0 && (
                                                                        <span className="flex items-center gap-1">
                                                                            <IndianRupee className="w-3 h-3" />
                                                                            {formatCurrency(purchase.amount)}
                                                                        </span>
                                                                    )}
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {format(new Date(purchase.created_at), 'dd MMM yy')}
                                                                    </span>
                                                                </div>

                                                                {/* Progress bar */}
                                                                {lessons.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <PurchaseProgressCard
                                                                            purchase={purchase}
                                                                            lessons={lessons}
                                                                            progress={progress}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Access link row */}
                                                        {purchase.access_token && (
                                                            <div className="px-4 pb-3 flex items-center gap-2">
                                                                <div className="flex-1 text-[10px] text-zinc-600 bg-zinc-800/50 rounded px-2 py-1 truncate font-mono">
                                                                    /course/{purchase.access_token}
                                                                </div>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="w-7 h-7 text-zinc-400 hover:text-white flex-shrink-0"
                                                                    onClick={() => handleCopyLink(purchase.access_token)}
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="w-7 h-7 text-zinc-400 hover:text-white flex-shrink-0"
                                                                    disabled={actionLoading[`regen-${purchase.id}`]}
                                                                    onClick={() => handleRegenerateToken(purchase.id)}
                                                                    title="Generate new access link"
                                                                >
                                                                    {actionLoading[`regen-${purchase.id}`]
                                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        : <RefreshCw className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Action row */}
                                                        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 bg-zinc-900/40">
                                                            {purchase.status === 'paid' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                                                                    disabled={isActing}
                                                                    onClick={() => handleRevokeAccess(purchase.id)}
                                                                >
                                                                    {isActing
                                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                                                        : <Ban className="w-3.5 h-3.5 mr-1" />}
                                                                    Revoke Access
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex-1"
                                                                    disabled={isActing}
                                                                    onClick={() => handleRestoreAccess(purchase.id)}
                                                                >
                                                                    {isActing
                                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                                                        : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                                                    Restore Access
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-zinc-500 hover:text-red-400"
                                                                disabled={actionLoading[`del-${purchase.id}`]}
                                                                onClick={() => handleDeletePurchase(purchase.id)}
                                                            >
                                                                {actionLoading[`del-${purchase.id}`]
                                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    : <Trash2 className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* ─── Add / Grant Access Dialog ─────────────────────────────────── */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md bg-background border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {addTarget ? `Grant Course Access` : 'Add New Customer'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {addTarget
                                ? `Grant ${addTarget.email} access to an additional course.`
                                : 'Manually create a customer and grant them course access.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Course selector */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-300">Course *</label>
                            <Select
                                value={addForm.courseId}
                                onValueChange={v => setAddForm(f => ({ ...f, courseId: v }))}
                            >
                                <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                                    <SelectValue placeholder="Select a course…" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    {adminCourses.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-white focus:bg-white/10">
                                            {c.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-300">Email *</label>
                            <Input
                                type="email"
                                placeholder="customer@example.com"
                                value={addForm.email}
                                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                                disabled={!!addTarget}
                                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                            />
                        </div>

                        {/* Name & Phone row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-300">Full Name</label>
                                <Input
                                    placeholder="Jane Doe"
                                    value={addForm.name}
                                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                    className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-300">Phone</label>
                                <Input
                                    placeholder="+91 9876543210"
                                    value={addForm.phone}
                                    onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                                    className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-300">Amount (₹)</label>
                            <Input
                                type="number"
                                placeholder="0 for free access"
                                value={addForm.amount}
                                onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                            />
                        </div>

                        {/* Info box */}
                        <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-300">
                                A unique access link will be auto-generated. The customer can use it to immediately access the course — no account required.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsAddOpen(false)}
                            className="text-zinc-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddAccess}
                            disabled={addLoading || !addForm.email || !addForm.courseId}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {addTarget ? 'Grant Access' : 'Add Customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
