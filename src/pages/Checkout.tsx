import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar, Check, ArrowLeft, Loader2, ShieldCheck,
    Zap, CreditCard, Lock, Globe, Sparkles, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';



export default function Checkout() {
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('planId');
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.name || '',
        email: user?.email || '',
        username: '',
        password: ''
    });

    useEffect(() => {
        if (profile?.username) {
            setFormData(prev => ({ ...prev, username: profile.username }));
        }
    }, [profile]);

    const { data: plan, isLoading: planLoading } = useQuery({
        queryKey: ['checkout-plan', planId],
        queryFn: async () => {
            if (!planId) return null;
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .eq('id', planId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!planId
    });

    const { signUp } = useAuth();

    const handlePayment = async () => {
        let activeUser = user;

        if (!activeUser) {
            if (!formData.email || !formData.password || !formData.name || !formData.username) {
                toast.error('Identity incomplete. Please provide all credentials.');
                return;
            }

            setIsProcessing(true);
            try {
                const { data: signUpData, error: signUpError } = await signUp(formData.email, formData.password, formData.name);
                if (signUpError) throw signUpError;

                // Wait for session to be established or use the returned user
                activeUser = signUpData.user;
                if (!activeUser) throw new Error("Synchronization failed. Please try again.");

                toast.success('Identity Secured: Welcome to the Pulse.');
            } catch (err: any) {
                toast.error(err.message || 'Identity synchronization failed');
                setIsProcessing(false);
                return;
            }
        } else {
            if (!formData.name || !formData.username) {
                toast.error('Identity details required for synchronization.');
                return;
            }
        }

        setIsProcessing(true);
        try {
            // 1. Create Order via Edge Function
            const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-payment', {
                body: {
                    action: 'create-order',
                    amount: parseInt(plan.price),
                    planId: plan.id,
                    userId: activeUser.id,
                    customerName: formData.name,
                    customerEmail: formData.email,
                    currency: 'INR',
                    receipt: `plan_${plan.id}_${activeUser.id.slice(0, 8)}`,
                    notes: {
                        plan_id: plan.id,
                        user_id: activeUser.id,
                        username: formData.username
                    }
                }
            });

            if (orderError) throw orderError;

            // 2. Initialize Razorpay Checkout
            const options = {
                key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Intimatecare.in',
                description: `${plan.name} Subscription`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment & Grant Access
                        const { error: verifyError } = await supabase.functions.invoke('razorpay-payment', {
                            body: {
                                action: 'verify-payment',
                                ...response,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                                planId: plan.id,
                                userId: activeUser.id,
                                username: formData.username
                            }
                        });

                        if (verifyError) throw verifyError;

                        toast.success(`Protocol Activated: Welcome to ${plan.name}`);
                        navigate('/dashboard');
                    } catch (err: any) {
                        toast.error('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: formData.name,
                    email: formData.email
                },
                theme: {
                    color: '#ea580c'
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error: any) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    if (planLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-3xl font-black text-foreground mb-4 uppercase">Protocol Misaligned</h2>
                <p className="text-muted-foreground mb-8">The requested subscription tier could not be identified.</p>
                <Button asChild className="rounded-2xl">
                    <Link to="/pricing">Return to Matrix</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-600/10">
            {/* Background Architecture */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-6xl mx-auto px-6 py-12 lg:py-24">
                <Link to="/pricing" className="inline-flex items-center gap-2 text-muted-foreground hover:text-orange-600 transition-colors font-black uppercase text-[10px] tracking-widest mb-12">
                    <ArrowLeft className="w-4 h-4" /> Abort Transaction
                </Link>

                <div className="grid lg:grid-cols-2 gap-16 items-start">
                    {/* Left: Branding & Plan Summary */}
                    <div className="space-y-10">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-xl shadow-orange-600/20">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-black text-3xl tracking-tighter uppercase">Intimatecare.in</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground mb-6 leading-none">
                                SECURE YOUR <br />
                                <span className="text-orange-600 italic underline decoration-8 underline-offset-8">PROTOCOL.</span>
                            </h1>
                            <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-md">
                                You are initializing the <span className="text-foreground font-black">{plan.name}</span> environment. All features will be synchronized to your identity instantly upon payment.
                            </p>
                        </div>

                        <Card className="border border-orange-600/20 bg-orange-600/[0.02] rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 border-b border-orange-600/10">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">{plan.name} Summary</CardTitle>
                                    <Badge className="bg-orange-600 text-white border-none font-black text-[10px] uppercase tracking-widest">Active Tier</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black tracking-tighter text-foreground">₹{plan.price}</span>
                                    <span className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{plan.period}</span>
                                </div>
                                <ul className="space-y-4">
                                    {plan.features?.slice(0, 4).map((f: string, i: number) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-bold text-foreground/80">
                                            <div className="bg-orange-600/10 rounded-full p-1"><Check className="w-3 h-3 text-orange-600" /></div>
                                            {f}
                                        </li>
                                    ))}
                                    {plan.features?.length > 4 && (
                                        <li className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">+ {plan.features.length - 4} More Advanced Protocols</li>
                                    )}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SSL Encrypted</span>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <Lock className="w-5 h-5 text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure Payouts</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Checkout Form */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-foreground/[0.02] rounded-[3.5rem] -rotate-1 scale-105" />
                        <Card className="relative border border-border/60 shadow-2xl shadow-black/[0.02] rounded-[3.5rem] bg-card overflow-hidden">
                            <CardHeader className="p-10 lg:p-14 border-b border-border/40">
                                <CardTitle className="text-3xl font-black uppercase tracking-tighter">Identity Details</CardTitle>
                                <CardDescription className="text-muted-foreground font-medium pt-2">Provide your professional credentials to synchronize with the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 lg:p-14 space-y-10">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Professional Name</Label>
                                        <Input
                                            placeholder="e.g. Elena Chen"
                                            className="h-16 rounded-2xl border-border/60 bg-muted/30 font-black text-lg focus-visible:ring-orange-600/50"
                                            value={formData.name}
                                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Digital Identity (Username)</Label>
                                        <div className="relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-black pointer-events-none">intimatecare.in/</div>
                                            <Input
                                                placeholder="username"
                                                className="h-16 rounded-2xl border-border/60 bg-muted/30 font-black text-lg pl-[110px] focus-visible:ring-orange-600/50"
                                                value={formData.username}
                                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                                            />
                                        </div>
                                    </div>
                                    <div className={cn("space-y-3", user && "opacity-60")}>
                                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Email (Verified)</Label>
                                        <Input
                                            disabled={!!user}
                                            value={formData.email}
                                            placeholder="name@digital-empire.com"
                                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                            className={cn(
                                                "h-16 rounded-2xl border-border/60 font-black text-lg focus-visible:ring-orange-600/50",
                                                user ? "bg-muted/20 cursor-not-allowed" : "bg-muted/30"
                                            )}
                                        />
                                    </div>
                                    {!user && (
                                        <div className="space-y-3">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pulse Link (Password)</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                                    className="h-16 rounded-2xl border-border/60 bg-muted/30 font-black text-lg focus-visible:ring-orange-600/50 pr-14"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <Button
                                        className="w-full h-20 rounded-[2rem] bg-orange-600 hover:bg-orange-700 text-white text-xl font-black uppercase tracking-widest shadow-2xl shadow-orange-600/30 transition-all active:scale-[0.98]"
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>Confirm & Pay ₹{plan.price} <ArrowRight className="ml-3 w-6 h-6" /></>
                                        )}
                                    </Button>
                                    <div className="flex items-center justify-center gap-6 text-muted-foreground pt-4">
                                        <Zap className="w-5 h-5 text-orange-600 fill-orange-600 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em]">Instant Activation Protocol Active</p>
                                        <Zap className="w-5 h-5 text-orange-600 fill-orange-600 opacity-20" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="mt-24 pt-12 border-t border-border/30 text-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-4">Secured by Intimatecare.in Banking Infrastructure</p>
                    <div className="flex justify-center gap-12 opacity-30 grayscale transition-all hover:grayscale-0">
                        <CreditCard className="w-6 h-6" />
                        <Globe className="w-6 h-6" />
                        <Sparkles className="w-6 h-6" />
                        <Check className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>
    );
}
