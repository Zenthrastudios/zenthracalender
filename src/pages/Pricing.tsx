import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Calendar, Check, Star, Shield, Zap, Info, ArrowRight, Instagram, Globe
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PRICING_PLANS = [
    {
        name: "Starter",
        price: "$0",
        desc: "Everything you need to start your creator journey.",
        button: "Get Started for Free",
        features: [
            "1 Storefront Page",
            "Unlimited Products",
            "Instagram DM Automation (100 msgs)",
            "Standard Analytics",
            "Email Support",
            "Zenthra Branding"
        ],
        popular: false
    },
    {
        name: "Creator Pro",
        price: "$29",
        period: "/mo",
        desc: "Scale your business with advanced tools and no transaction fees.",
        button: "Start 14-Day Free Trial",
        features: [
            "Everything in Starter",
            "Custom Domains",
            "Unlimited DM Automation",
            "Deep Analytics & Pixel Tracking",
            "Priority 24/7 Support",
            "No Zenthra Branding",
            "WhatsApp Notification Hub"
        ],
        popular: true
    }
];

export default function Pricing() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-100">

            {/* Navigation */}
            <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">Zenthra</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-slate-600">
                        <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
                        <Link to="/pricing" className="text-orange-600">Pricing</Link>
                        <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
                        <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link to="/auth" className="text-[15px] font-semibold text-slate-600 hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
                        <Button asChild className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 font-bold transition-all active:scale-95">
                            <Link to="/auth">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-24 pb-20 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-4 py-1 mb-6 text-xs font-bold uppercase tracking-widest">
                        Simple Pricing
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                        One simple price <br />
                        for <span className="text-orange-600 italic underline decoration-8 underline-offset-8">Unlimited</span> ideas.
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed">
                        No transaction fees. No hidden costs. 100% focused on your growth.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-32 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:px-20">
                    {PRICING_PLANS.map((plan, i) => (
                        <div key={i} className={`relative p-10 lg:p-14 rounded-[3.5rem] border-[3px] transition-all flex flex-col ${plan.popular ? 'border-orange-600 bg-white shadow-2xl shadow-orange-100 scale-105 z-10' : 'border-slate-100 bg-slate-50'}`}>
                            {plan.popular && (
                                <div className="absolute top-0 right-10 -translate-y-1/2 bg-orange-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-10">
                                <h3 className="text-2xl font-black mb-4 tracking-tight">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-6xl font-black tracking-tighter">{plan.price}</span>
                                    {plan.period && <span className="text-slate-400 font-bold text-xl">{plan.period}</span>}
                                </div>
                                <p className="text-slate-500 font-medium text-lg leading-relaxed">{plan.desc}</p>
                            </div>

                            <div className="space-y-6 mb-12 flex-grow">
                                {plan.features.map((feature, j) => (
                                    <div key={j} className="flex items-center gap-4 text-slate-700 font-bold">
                                        <div className={`rounded-full p-1 ${plan.popular ? 'bg-orange-100' : 'bg-slate-200'}`}>
                                            <Check className={`w-4 h-4 ${plan.popular ? 'text-orange-600' : 'text-slate-500'}`} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <Button className={`w-full h-16 rounded-full text-lg font-black transition-all active:scale-95 ${plan.popular ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-200' : 'bg-slate-900 hover:bg-slate-800 text-white'}`} asChild>
                                <Link to="/auth">{plan.button}</Link>
                            </Button>
                            <p className="mt-6 text-center text-sm font-bold text-slate-400 italic">No credit card required to start</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Comparison Detail Bar */}
            <section className="py-24 px-6 bg-slate-50 border-y border-slate-100">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm mb-12">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="font-bold text-slate-900 text-lg">Zenthra users earn 3.5x more than traditional link tools.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "Transaction Fees", value: "0%" },
                            { label: "Setup Time", value: "60 Sec" },
                            { label: "Email Support", value: "24/7" },
                            { label: "Uptime", value: "99.9%" }
                        ].map((stat, i) => (
                            <div key={i}>
                                <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 px-6 max-w-3xl mx-auto">
                <h2 className="text-4xl font-extrabold text-center mb-16 italic tracking-tight underline decoration-orange-600 decoration-4 underline-offset-8">Frequent Questions</h2>
                <Accordion type="single" collapsible className="space-y-4">
                    {[
                        { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time from your settings panel. No questions asked." },
                        { q: "Is there a transaction fee?", a: "No, Zenthra does not take any cut of your sales. You keep 100% of what you earn (minus payment processor fees like Stripe/Razorpay)." },
                        { q: "Can I use my own domain?", a: "Absolutely. Pro users can connect their own custom domains (e.g., store.yourname.com) easily." },
                        { q: "How many products can I sell?", a: "Unlimited! Whether you have 1 e-book or 50 courses, we don't limit your potential." }
                    ].map((item, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="border-none bg-slate-50 rounded-3xl px-8">
                            <AccordionTrigger className="hover:no-underline py-6 font-bold text-lg text-slate-900">{item.q}</AccordionTrigger>
                            <AccordionContent className="pb-6 text-slate-500 font-medium leading-relaxed">
                                {item.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            {/* Footer - Master Stan.store Style */}
            <footer className="border-t border-slate-100 py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16 px-4">
                        <div className="space-y-6 max-w-sm">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">Zenthra</span>
                            </Link>
                            <p className="text-slate-400 font-medium">The simplest all-in-one store for creators to sell their digital products and book coaching calls.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div>
                                <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Product</h4>
                                <ul className="space-y-4 text-sm font-bold text-slate-400">
                                    <li><Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link></li>
                                    <li><Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Support</h4>
                                <ul className="space-y-4 text-sm font-bold text-slate-400">
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Contact Us</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">FAQ</Link></li>
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Help Center</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Legal</h4>
                                <ul className="space-y-4 text-sm font-bold text-slate-400">
                                    <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                                    <li><Link to="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} Zenthra Calendar Inc. All rights reserved.</p>
                        <div className="flex gap-8 text-slate-400">
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
