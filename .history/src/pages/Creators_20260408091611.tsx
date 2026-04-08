import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Calendar, Star, Instagram, ArrowRight, Quote, Sparkles, Zap, Globe
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBrand } from '@/contexts/BrandContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Creators() {
    const { brandName } = useBrand();
    const { data: featuredCreators } = useQuery({
        queryKey: ['public-featured-creators'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('featured_creators')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    const creatorsToShow = featuredCreators && featuredCreators.length > 0 ? featuredCreators : [
        {
            name: "Khushboo Bist",
            title: "INTIMACY COACH",
            revenue: "$12k/mo",
            quote: `${brandName} turned my link-in-bio from a dead end into a 6-figure business. The automation is life-changing.`,
            followers: "450k",
            image_url: "https://zlhbzlxxdezlrtzljpni.supabase.co/storage/v1/object/public/public-images/instructors/28e0267f-42e6-4abb-b39d-6ee28ee427e5/1769608046265.jpg"
        },
        {
            name: "Elena Chen",
            title: "WELLNESS COACH",
            revenue: "$8k/mo",
            quote: "Finally a tool that understands that I need to book calls AND sell digital guides in one place.",
            followers: "120k",
            image_url: "/freepik__prompt-a-professional-uiux-conceptual-illustration__36063.png"
        },
        {
            name: "Marcus Thorne",
            title: "DIGITAL ARTIST",
            revenue: "$15k/mo",
            quote: "My presets sell like hotcakes now that I can auto-DM links to anyone who comments 'preset'.",
            followers: "890k",
            image_url: "/freepik__mpt-a-professional-highfidelity-linkinbio-mobile-e__36064.png"
        }
    ];
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-600/10">

            {/* Navigation */}
            <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">{brandName}</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-muted-foreground">
                        <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
                        <Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link>
                        <Link to="/creators" className="text-orange-600">Creators</Link>
                        <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link to="/auth" className="text-[15px] font-semibold text-muted-foreground hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
                        <Button asChild className="rounded-full bg-foreground text-background hover:opacity-90 px-8 h-12 font-bold transition-all active:scale-95">
                            <Link to="/auth">Join the Best</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-24 pb-16 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <Badge variant="outline" className="border-orange-600/50 text-orange-600 px-4 py-1 mb-6 text-xs font-bold uppercase tracking-widest bg-orange-600/5">
                        Success Stories
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
                        Build your <span className="text-orange-600 italic">Empire</span> <br />
                        not just a link.
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
                        Join 50,000+ top creators who have moved their entire business to {brandName} for 3x more conversions.
                    </p>
                </div>
            </section>

            {/* Creators Grid */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                    {creatorsToShow.map((creator, i) => (
                        <div key={i} className="group p-8 rounded-[3.5rem] bg-muted/30 border-2 border-muted hover:border-orange-600/30 transition-all hover:bg-card hover:shadow-2xl hover:shadow-orange-600/10">
                            <div className="relative mb-10">
                                <div className="absolute -inset-4 bg-orange-600/20 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                                <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border-8 border-card shadow-lg">
                                    <img src={creator.image_url} alt={creator.name} className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-500" />
                                </div>
                                <Badge className="absolute -bottom-4 right-4 bg-foreground text-background px-4 py-2 rounded-xl font-bold shadow-lg">
                                    {creator.revenue}
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-foreground">{creator.name}</h3>
                                        <p className="text-orange-600 font-bold text-sm tracking-wide uppercase">{creator.title}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground font-bold text-xs uppercase italic">
                                        <Instagram className="w-4 h-4" /> {creator.followers}
                                    </div>
                                </div>
                                <div className="relative pt-6 border-t border-border">
                                    <Quote className="absolute top-4 -left-2 w-8 h-8 text-orange-600/30 opacity-50 quote-icon" />
                                    <p className="text-muted-foreground font-medium leading-relaxed italic relative z-10">
                                        "{creator.quote}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Banner */}
            <section className="py-24 px-6 lg:px-20">
                <div className="rounded-[4rem] bg-foreground text-background p-12 lg:p-24 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 p-20 opacity-10">
                        <Sparkles className="w-64 h-64 text-orange-500" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-extrabold italic mb-10 leading-tight">
                        Stop leaving money <br />
                        on the table.
                    </h2>
                    <p className="text-xl text-background/60 font-medium mb-12 max-w-2xl">
                        Most creators lose 70% of potential sales due to clunky checkout flows. {brandName} fixes that overnight.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <Button size="xl" className="rounded-full bg-orange-600 hover:bg-orange-700 text-white px-12 h-16 text-xl font-black transition-all active:scale-95 shadow-xl shadow-orange-600/20">
                            <Link to="/auth">Start Your Journey</Link>
                        </Button>
                        <Button size="xl" variant="outline" className="rounded-full bg-transparent border-background/20 hover:bg-background/10 text-background px-12 h-16 text-xl font-black transition-all active:scale-95">
                            Explore Features
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer - Master Stan.store Style */}
            <footer className="border-t border-border py-20 px-6 bg-card">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16 px-4">
                        <div className="space-y-6 max-w-sm">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">{brandName}</span>
                            </Link>
                            <p className="text-muted-foreground font-medium">The simplest all-in-one store for creators to sell their digital products and book coaching calls.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Product</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link></li>
                                    <li><Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Support</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Contact Us</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">FAQ</Link></li>
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Help Center</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Legal</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                                    <li><Link to="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-muted-foreground text-sm font-medium">© {new Date().getFullYear()} {brandName} Inc. All rights reserved.</p>
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
