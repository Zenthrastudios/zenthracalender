import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { Loader2, ArrowRight, Check, Zap, Hash, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const NICHES = [
    "Tech & SaaS", "Lifestyle & Vlogs", "Finance & Crypto",
    "Health & Fitness", "Intimacy & Relationships", "Education & Coaching",
    "Gaming & Esports", "Art & Design", "Other"
];

const GOALS = [
    { id: 'monetize', label: 'Monetize Audience', icon: Zap },
    { id: 'bookings', label: 'Book More Calls', icon: Users },
    { id: 'courses', label: 'Sell Digital Products', icon: Target },
    { id: 'brand', label: 'Grow Personal Brand', icon: Hash },
];

export default function Onboarding() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        niche: '',
        instagramHandle: '',
        youtubeHandle: '',
        twitterHandle: '',
        primaryGoal: [] as string[],
    });

    const handleGoalToggle = (goalId: string) => {
        setFormData(prev => {
            if (prev.primaryGoal.includes(goalId)) {
                return { ...prev, primaryGoal: prev.primaryGoal.filter(id => id !== goalId) };
            } else {
                return { ...prev, primaryGoal: [...prev.primaryGoal, goalId] };
            }
        });
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            // 1. Calculate Trial End Date (4 Days from now)
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 4);

            // Check if user already has a plan (e.g. from Checkout)
            // Use maybeSingle() to avoid 406/PGRST116 if profile doesn't exist yet
            const { data: profileData } = await supabase.from('profiles').select('plan_id').eq('id', user.id).maybeSingle();
            const currentPlanId = user.user_metadata?.plan_id || profileData?.plan_id;

            const updatePayload: any = {
                onboarding_completed: true,
                creator_details: {
                    niche: formData.niche,
                    socials: {
                        instagram: formData.instagramHandle,
                        youtube: formData.youtubeHandle,
                        twitter: formData.twitterHandle
                    },
                    goals: formData.primaryGoal
                }
            };

            // Only apply Trial Protocol if no plan is active
            if (!currentPlanId) {
                updatePayload.trial_ends_at = trialEndsAt.toISOString();
                updatePayload.plan_id = '11111111-1111-1111-1111-111111111111';
            }

            // 2. Update Profile (Upsert to ensure existence)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...updatePayload,
                    updated_at: new Date().toISOString()
                });

            if (profileError) throw profileError;

            // 3. Elevate Role to Admin (Creator)
            // Safe upsert alternative: Check if exists, then update or insert
            const { data: existingRole } = await supabase.from('user_roles').select('*').eq('user_id', user.id).maybeSingle();

            if (existingRole) {
                const { error: updateError } = await supabase
                    .from('user_roles')
                    .update({ role: 'admin' })
                    .eq('id', existingRole.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('user_roles')
                    .insert({ user_id: user.id, role: 'admin' });
                if (insertError) throw insertError;
            }

            await refreshProfile();
            toast.success('Protocol Initialized: Welcome to the Pulse.');
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Onboarding error:', error);
            toast.error('Failed to initialize protocol. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans selection:bg-orange-600/10 relative overflow-hidden">
            {/* Background Architecture */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-2xl relative z-10">
                <div className="mb-10 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-600 shadow-xl shadow-orange-600/20 mb-4">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                        Initialize <span className="text-orange-600">Identity.</span>
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg max-w-lg mx-auto">
                        Configure your digital matrix to align the Zenthra infrastructure with your specific growth protocols.
                    </p>
                </div>

                <div className="relative">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-muted/50 rounded-full overflow-hidden mb-6">
                        <div
                            className="h-full bg-orange-600 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <Card className="border border-border/50 shadow-2xl shadow-black/[0.05] bg-card/50 backdrop-blur-xl mt-6">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-xl font-black uppercase tracking-tight flex justify-between items-center">
                                <span>Step {step} / 3</span>
                                <span className="text-sm text-muted-foreground font-bold tracking-widest">
                                    {step === 1 && "Niche Selection"}
                                    {step === 2 && "Social Matrix"}
                                    {step === 3 && "Protocol Goals"}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-6">
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Select your primary sector</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {NICHES.map((niche) => (
                                                <button
                                                    key={niche}
                                                    onClick={() => setFormData({ ...formData, niche })}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                                                        formData.niche === niche
                                                            ? "border-orange-600 bg-orange-600/5 shadow-lg shadow-orange-600/10"
                                                            : "border-border/50 bg-muted/20 hover:border-orange-600/30"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "font-bold text-sm",
                                                        formData.niche === niche ? "text-orange-600" : "text-muted-foreground"
                                                    )}>{niche}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            onClick={() => setStep(2)}
                                            disabled={!formData.niche}
                                            className="font-black uppercase tracking-widest rounded-xl h-12 px-8 bg-foreground hover:bg-foreground/90 text-background"
                                        >
                                            Next Phase <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Instagram Identity</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                                                <Input
                                                    value={formData.instagramHandle}
                                                    onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                                                    className="pl-8 h-12 bg-muted/20 border-border/50 rounded-xl font-medium focus-visible:ring-orange-600/50"
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">YouTube Channel (Optional)</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">/</span>
                                                <Input
                                                    value={formData.youtubeHandle}
                                                    onChange={(e) => setFormData({ ...formData, youtubeHandle: e.target.value })}
                                                    className="pl-8 h-12 bg-muted/20 border-border/50 rounded-xl font-medium focus-visible:ring-orange-600/50"
                                                    placeholder="channel_name"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">X / Twitter (Optional)</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                                                <Input
                                                    value={formData.twitterHandle}
                                                    onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                                                    className="pl-8 h-12 bg-muted/20 border-border/50 rounded-xl font-medium focus-visible:ring-orange-600/50"
                                                    placeholder="handle"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-between">
                                        <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground hover:text-foreground">Back</Button>
                                        <Button
                                            onClick={() => setStep(3)}
                                            disabled={!formData.instagramHandle}
                                            className="font-black uppercase tracking-widest rounded-xl h-12 px-8 bg-foreground hover:bg-foreground/90 text-background"
                                        >
                                            Next Phase <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Select Primary Objectives (Multi-select)</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {GOALS.map((goal) => (
                                                <button
                                                    key={goal.id}
                                                    onClick={() => handleGoalToggle(goal.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                                                        formData.primaryGoal.includes(goal.id)
                                                            ? "border-orange-600 bg-orange-600/5 shadow-lg shadow-orange-600/10"
                                                            : "border-border/50 bg-muted/20 hover:border-orange-600/30"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                        formData.primaryGoal.includes(goal.id) ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <goal.icon className="w-5 h-5" />
                                                    </div>
                                                    <span className={cn(
                                                        "font-bold text-sm",
                                                        formData.primaryGoal.includes(goal.id) ? "text-foreground" : "text-muted-foreground"
                                                    )}>{goal.label}</span>
                                                    {formData.primaryGoal.includes(goal.id) && <Check className="w-4 h-4 ml-auto text-orange-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-between items-center">
                                        <Button variant="ghost" onClick={() => setStep(2)} className="font-bold text-muted-foreground hover:text-foreground">Back</Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || formData.primaryGoal.length === 0}
                                            className="font-black uppercase tracking-widest rounded-xl h-14 px-10 bg-orange-600 hover:bg-orange-700 text-white shadow-2xl shadow-orange-600/30 transition-all hover:scale-105"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>Activate Protocol <Zap className="w-5 h-5 ml-2 fill-current" /></>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
