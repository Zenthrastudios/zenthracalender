import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/contexts/BrandContext';
import {
    Calendar, Clock, Users, Zap, Check, Star, Shield,
    Smartphone, Video, MessageSquare, CreditCard, Globe,
    BarChart3, Sparkles, MapPin, BookOpen, ShoppingBag, Instagram,
    LayoutGrid, MousePointer2, Code, Share2, Sparkle, CheckCircle2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/ThemeToggle';

const IMAGES = {
    hero: "/freepik__a-highend-professional-uilifestyle-hybrid-illustra__36060.png",
    workshops: "/freepik__prompt-a-professional-uiux-conceptual-illustration__36063.png",
    linkInBio: "/freepik__mpt-a-professional-highfidelity-linkinbio-mobile-e__36064.png",
    products: "/freepik__prompt-a-professional-3dlayered-grid-of-digital-pr__36061.png",
    analytics: "/freepik__prompt-a-highend-advanced-analytics-data-marketing__36065.png",
    automation: "/freepik__prompt-a-sophisticated-saas-growth-marketing-illus__36062.png",
    branding: "/freepik__ompt-a-highfidelity-illustration-for-custom-brandi__36068.png",
    team: "/freepik__prompt-a-professional-saas-team-collaboration-inte__36066.png"
};

const FEATURES_LIST = [
    {
        icon: Calendar,
        title: "1-Tap Booking",
        desc: "Seamless calendar integration with Google, Outlook, and Apple.",
        image: IMAGES.hero,
        tags: ["Timezone Auto-sync", "Limit Bookings", "Buffer Times"]
    },
    {
        icon: ShoppingBag,
        title: "Digital Storefront",
        desc: "Sell E-books, Presets, and Templates in a mobile-optimized store.",
        image: IMAGES.products,
        tags: ["Instant Delivery", "Secure Payments", "No Coding Required"]
    },
    {
        icon: Instagram,
        title: "Auto-DM Growth",
        desc: "Turn comments into customers with automated Instagram DM replies.",
        image: IMAGES.automation,
        tags: ["Keyword Triggers", "Conversion Tracking", "24/7 Automation"]
    },
    {
        icon: Share2,
        title: "Link-in-Bio 2.0",
        desc: "A beautiful, lightning-fast link that hosts your entire business.",
        image: IMAGES.linkInBio,
        tags: ["Custom Branding", "Email Collection", "Video Hero"]
    }
];

export default function Features() {
    const { brandName } = useBrand();
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-600/10">

            <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">{brandName}</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-muted-foreground">
                        <Link to="/features" className="text-orange-600">Features</Link>
                        <Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link>
                        <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
                        <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link to="/auth" className="text-[15px] font-semibold text-muted-foreground hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
                        <Button asChild className="rounded-full bg-foreground text-background hover:opacity-90 px-8 h-12 font-bold transition-all active:scale-95">
                            <Link to="/auth">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <section className="pt-24 pb-16 px-6 text-center bg-muted/30">
                <div className="max-w-3xl mx-auto">
                    <Badge variant="outline" className="border-orange-600/50 text-orange-600 px-4 py-1 mb-6 text-xs font-bold uppercase tracking-widest bg-orange-600/5">
                        The Feature Set
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
                        Everything you need <br />
                        to <span className="text-orange-600 italic underline decoration-8 underline-offset-8">Scale</span>.
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                        Stop juggling 10 different apps. {brandName} integrates everything from <br className="hidden md:block" /> booking to sales and automation in one clean interface.
                    </p>
                </div>
            </section>

            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="space-y-32">
                    {FEATURES_LIST.map((feature, i) => (
                        <div key={i} className={`grid lg:grid-cols-2 gap-20 items-center ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                            <div className={`space-y-8 ${i % 2 !== 0 ? 'lg:order-2' : ''}`}>
                                <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center shadow-xl shadow-orange-600/20">
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                                    {feature.title}
                                </h2>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                                    {feature.desc}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {feature.tags.map((tag, j) => (
                                        <Badge key={j} variant="secondary" className="bg-white border-2 border-slate-100 text-slate-600 font-bold px-4 py-2 text-sm rounded-xl">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className={`${i % 2 !== 0 ? 'lg:order-1' : ''}`}>
                                <div className="relative rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-2xl">
                                    <img src={feature.image} alt={feature.title} className="w-full h-auto" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="py-24 px-6 bg-slate-900 text-white rounded-[4rem] mx-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-extrabold italic mb-6">Built for Creators</h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Small details that make a massive difference in your daily workflow.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: BarChart3, title: "Deep Analytics", desc: "Track every click and conversion from social to checkout." },
                            { icon: Globe, title: "Custom Domains", desc: "Your store, your brand. Use custom URLs like store.yourname.com." },
                            { icon: Shield, title: "Secure Payouts", desc: "Instant payouts through Razorpay, Stripe, and Cashfree." },
                            { icon: Smartphone, title: "Mobile Dedicated", desc: "Everything is optimized for the Instagram mobile browser." },
                            { icon: Users, title: "Team Roles", desc: "Assign moderators and admins to manage your store." },
                            { icon: CheckCircle2, title: "No Commisions", desc: "Keep 100% of your earnings. We only charge a flat monthly fee." }
                        ].map((f, i) => (
                            <div key={i} className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all group">
                                <f.icon className="w-10 h-10 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                                <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-32 px-6 text-center">
                <div className="max-max-w-4xl mx-auto">
                    <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-10 tracking-tight">
                        Ready to <span className="text-orange-600 italic underline decoration-8 underline-offset-8">scale?</span>
                    </h2>
                    <Button size="xl" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-12 h-16 text-xl font-bold shadow-2xl shadow-slate-200 transition-all active:scale-95" asChild>
                        <Link to="/auth">Claim Your Store</Link>
                    </Button>
                </div>
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
