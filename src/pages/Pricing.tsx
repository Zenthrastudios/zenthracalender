import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Calendar, Check, Star, Shield, Zap, Info, ArrowRight, Instagram, Globe, Loader2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Pricing() {
    const { data: plans, isLoading } = useQuery({
        queryKey: ['public-pricing-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-600/10">

            {/* Navigation */}
            <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">Zenthra</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-muted-foreground">
                        <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
                        <Link to="/pricing" className="text-orange-600">Pricing</Link>
                        <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
                        <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link to="/auth" className="text-[15px] font-semibold text-muted-foreground hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
                        <Button asChild className="rounded-full bg-foreground text-background hover:opacity-90 px-8 h-12 font-bold transition-all active:scale-95">
                            <Link to="/auth">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-24 pb-20 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <Badge variant="outline" className="border-orange-600/50 text-orange-600 px-4 py-1 mb-6 text-xs font-bold uppercase tracking-widest bg-orange-600/5">
                        Simple Pricing
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
                        One simple price <br />
                        for <span className="text-orange-600 italic underline decoration-8 underline-offset-8">Unlimited</span> ideas.
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                        No transaction fees. No hidden costs. 100% focused on your growth.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-32 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:px-20 min-h-[500px]">
                    {isLoading ? (
                        <div className="col-span-2 flex items-center justify-center p-20">
                            <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                        </div>
                    ) : (
                        plans?.map((plan, i) => (
                            <div key={i} className={cn(
                                "relative p-10 lg:p-14 rounded-[3.5rem] border-[3px] transition-all flex flex-col duration-500 hover:shadow-2xl hover:shadow-black/5",
                                plan.is_popular
                                    ? 'border-orange-600 bg-card shadow-2xl shadow-orange-600/10 scale-105 z-10'
                                    : 'border-border bg-muted/30'
                            )}>
                                {plan.is_popular && (
                                    <div className="absolute top-0 right-10 -translate-y-1/2 bg-orange-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-600/20">
                                        Most Popular
                                    </div>
                                )}
                                <div className="mb-10">
                                    <h3 className="text-2xl font-black mb-4 tracking-tight text-foreground">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-muted-foreground font-black text-3xl mr-1">₹</span>
                                        <span className="text-6xl font-black tracking-tighter text-foreground">{plan.price}</span>
                                        {plan.period && <span className="text-muted-foreground font-bold text-xl">{plan.period}</span>}
                                    </div>
                                    <p className="text-muted-foreground font-medium text-lg leading-relaxed">{plan.description}</p>
                                </div>

                                <div className="space-y-6 mb-12 flex-grow">
                                    {plan.features.map((feature: string, j: number) => (
                                        <div key={j} className="flex items-center gap-4 text-foreground font-bold">
                                            <div className={cn("rounded-full p-1", plan.is_popular ? 'bg-orange-600/10' : 'bg-muted')}>
                                                <Check className={cn("w-4 h-4", plan.is_popular ? 'text-orange-600' : 'text-muted-foreground')} />
                                            </div>
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <Button className={cn(
                                    "w-full h-16 rounded-full text-lg font-black transition-all active:scale-95",
                                    plan.is_popular
                                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/20'
                                        : 'bg-foreground text-background hover:opacity-90'
                                )} asChild>
                                    <Link to={`/checkout?planId=${plan.id}`}>{plan.button_text}</Link>
                                </Button>
                                <p className="mt-6 text-center text-sm font-bold text-muted-foreground italic">No credit card required to start</p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Comparison Detail Bar */}
            <section className="py-24 px-6 bg-muted/30 border-y border-border">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 lg:p-6 bg-card border border-border rounded-[2rem] shadow-sm mb-12">
                        <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center shrink-0">
                            <Zap className="w-6 h-6 text-orange-600" />
                        </div>
                        <p className="font-bold text-foreground text-lg">Zenthra creators earn an average of 3.5x more than traditional link tools.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "Transaction Fees", value: "0%" },
                            { label: "Setup Time", value: "60 Sec" },
                            { label: "Email Support", value: "24/7" },
                            { label: "Uptime", value: "99.9%" }
                        ].map((stat, i) => (
                            <div key={i}>
                                <p className="text-3xl font-black text-foreground mb-1">{stat.value}</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 px-6 max-w-3xl mx-auto">
                <h2 className="text-4xl font-black text-center mb-16 italic tracking-tight underline decoration-orange-600 decoration-4 underline-offset-8 uppercase">Frequent Questions</h2>
                <Accordion type="single" collapsible className="space-y-4">
                    {[
                        { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time from your settings panel. No questions asked." },
                        { q: "Is there a transaction fee?", a: "No, Zenthra does not take any cut of your sales. You keep 100% of what you earn (minus payment processor fees like Stripe/Razorpay)." },
                        { q: "Can I use my own domain?", a: "Absolutely. Pro users can connect their own custom domains (e.g., store.yourname.com) easily." },
                        { q: "How many products can I sell?", a: "Unlimited! Whether you have 1 e-book or 50 courses, we don't limit your potential." }
                    ].map((item, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="border border-border bg-card rounded-3xl px-8 transition-colors hover:bg-muted/10">
                            <AccordionTrigger className="hover:no-underline py-6 font-bold text-lg text-foreground text-left">{item.q}</AccordionTrigger>
                            <AccordionContent className="pb-6 text-muted-foreground font-medium leading-relaxed">
                                {item.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-20 px-6 bg-card">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16 lg:px-4">
                        <div className="space-y-6 max-w-sm">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight text-foreground">Zenthra</span>
                            </Link>
                            <p className="text-muted-foreground font-medium">The simplest all-in-one store for creators to sell digital products, book coaching calls, and automate social growth.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div>
                                <h4 className="font-black text-foreground mb-6 uppercase tracking-widest text-[10px]">Product</h4>
                                <ul className="space-y-4 text-xs font-bold text-muted-foreground">
                                    <li><Link to="/features" className="hover:text-orange-600 transition-colors uppercase">Features</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors uppercase">Pricing</Link></li>
                                    <li><Link to="/creators" className="hover:text-orange-600 transition-colors uppercase">Creators</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-black text-foreground mb-6 uppercase tracking-widest text-[10px]">Support</h4>
                                <ul className="space-y-4 text-xs font-bold text-muted-foreground">
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors uppercase">Contact Us</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors uppercase">FAQ</Link></li>
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors uppercase">Help Center</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-black text-foreground mb-6 uppercase tracking-widest text-[10px]">Legal</h4>
                                <ul className="space-y-4 text-xs font-bold text-muted-foreground">
                                    <li><Link to="/privacy" className="hover:text-orange-600 transition-colors uppercase">Privacy Policy</Link></li>
                                    <li><Link to="/terms" className="hover:text-orange-600 transition-colors uppercase">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-muted-foreground text-xs font-bold font-mono uppercase tracking-tighter">© {new Date().getFullYear()} ZENTHRA CALENDAR INC.</p>
                        <div className="flex gap-8 text-muted-foreground">
                            <Instagram className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                            <Zap className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                            <Globe className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
