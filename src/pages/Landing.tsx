import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Calendar, Clock, Users, Zap, ArrowRight, Check, Star, Shield,
  Smartphone, Video, Code, MessageSquare, CreditCard, Globe,
  BarChart3, Sparkles, MapPin, BookOpen, ShoppingBag, Link as LinkIcon,
  Instagram, CheckCircle2, ChevronRight, LayoutGrid, Layers, MousePointer2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/ThemeToggle';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Local high-quality assets from /public as requested
const IMAGES = {
  hero: "/freepik__a-highend-professional-uilifestyle-hybrid-illustra__36060.png",
  workshops: "/freepik__prompt-a-professional-uiux-conceptual-illustration__36063.png",
  linkInBio: "/freepik__mpt-a-professional-highfidelity-linkinbio-mobile-e__36064.png",
  products: "/freepik__prompt-a-professional-3dlayered-grid-of-digital-pr__36061.png",
  analytics: "/freepik__prompt-a-highend-advanced-analytics-data-marketing__36065.png",
  payments: "/freepik__mpt-a-simplified-payments-payouts-conceptual-illus__36067.png",
  automation: "/freepik__prompt-a-sophisticated-saas-growth-marketing-illus__36062.png",
  team: "/freepik__prompt-a-professional-saas-team-collaboration-inte__36066.png",
  branding: "/freepik__ompt-a-highfidelity-illustration-for-custom-brandi__36068.png"
};

const STATS = [
  { label: "Active Creators", value: "50,000+" },
  { label: "Revenue Processed", value: "$100M+" },
  { label: "Monthly Sessions", value: "2M+" },
  { label: "Support", value: "24/7" },
];

export default function LandingPage() {
  const [storeName, setStoreName] = useState("");

  const { data: featuredCreators } = useQuery({
    queryKey: ['landing-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_creators')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-orange-600/10 font-sans">

      {/* Top Banner - Subtle like Stan */}
      <div className="bg-foreground text-background py-2 px-6 text-center text-xs font-black tracking-widest uppercase">
        JOINT 50,000+ CREATORS MONETIZING THEIR CONTENT ON ZENTHRA
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20 transition-transform group-hover:scale-105">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter">ZENTHRA</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10 text-[13px] font-black uppercase tracking-widest text-muted-foreground">
            <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link>
            <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
            <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-[13px] font-black uppercase tracking-widest text-muted-foreground hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
            <Button asChild className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white px-8 h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all active:scale-95">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-40 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[1000px] h-[1000px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 text-center lg:text-left">
            <Badge variant="outline" className="mb-6 border-orange-600/50 text-orange-600 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-600/5">
              All-In-One Platform
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground mb-8 leading-[0.9]">
              Everything You <br />
              <span className="text-orange-600 italic">Actually</span> Need <br />
              To Grow.
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Zenthra is the easiest way to sell your digital products, book coaching calls, and automate your Instagram—all from one beautiful link.
            </p>

            {/* Claim your link input */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto lg:mx-0 p-2 bg-card rounded-[2rem] border border-border shadow-2xl focus-within:border-orange-600/50 transition-all">
              <div className="flex items-center px-4 py-3 bg-muted rounded-2xl text-muted-foreground font-black text-sm tracking-tighter shrink-0">
                zenthra.com/
              </div>
              <Input
                placeholder="yourname"
                className="border-none shadow-none text-lg font-black placeholder:text-muted-foreground/30 focus-visible:ring-0 h-auto py-3 px-1 bg-transparent"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
              <Button className="rounded-2xl bg-foreground text-background hover:opacity-90 px-8 py-6 text-sm font-black uppercase tracking-widest transition-all active:scale-95">
                Claim Store
              </Button>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest">Join 50,000+ creators • 14-day free trial</p>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000">
            <div className="absolute -inset-10 bg-orange-600/10 rounded-full blur-[100px] opacity-50 animate-pulse" />
            <div className="relative rounded-[3rem] border-8 border-muted shadow-2xl overflow-hidden bg-card">
              <img
                src={IMAGES.hero}
                alt="Zenthra Dashboard"
                className="w-full h-auto object-cover scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-black text-foreground mb-2 tracking-tighter">{stat.value}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Feature 1: Link-in-Bio */}
      <section className="py-24 lg:py-40 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -inset-10 bg-orange-600/5 rounded-full blur-[100px] opacity-50" />
            <img
              src={IMAGES.linkInBio}
              alt="Link in Bio Mobile"
              className="relative rounded-[4rem] shadow-2xl max-w-md mx-auto border-[12px] border-muted"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600 flex items-center justify-center mb-8 shadow-xl shadow-orange-600/20">
              <LinkIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-[1.0] tracking-tighter">
              A Link-in-Bio <br />
              that <span className="text-orange-600 italic">actually</span> <br />
              converts.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
              Turn your social media followers into customers. Our mobile-first landing pages are built for maximum speed and conversion.
              No distractions—just your offers and a 1-tap checkout.
            </p>
            <ul className="space-y-6 mb-10">
              {["1-Click Google/Apple Pay", "Built-in Email collection", "Custom branding & colors", "Deep social integration"].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-foreground font-black uppercase text-xs tracking-widest">
                  <div className="bg-orange-600/10 rounded-full p-1.5"><Check className="w-3.5 h-3.5 text-orange-600" /></div>
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="link" className="text-orange-600 font-black text-lg p-0 h-auto group uppercase tracking-widest">
              Build your page <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Core Feature 2: Digital Products */}
      <section className="py-24 lg:py-40 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="w-16 h-16 rounded-[1.5rem] bg-foreground flex items-center justify-center mb-8 shadow-xl">
              <ShoppingBag className="w-8 h-8 text-background" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-[1.0] tracking-tighter">
              Sell Products <br />
              in <span className="text-orange-600">60 seconds.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
              Upload your PDF, Video, or Courses and start selling instantly. No complex store setup, no hosting fees.
              Just list it and watch the sales notifications roll in.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-10 text-center uppercase tracking-widest">
              {[
                { label: "E-Books", icon: BookOpen },
                { label: "Templates", icon: Layers },
                { label: "Courses", icon: Video },
                { label: "Coaching", icon: MousePointer2 }
              ].map((item, i) => (
                <div key={i} className="bg-card p-8 rounded-[2rem] shadow-sm border border-border group hover:border-orange-600/50 transition-colors">
                  <item.icon className="w-8 h-8 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <p className="font-black text-foreground text-[10px]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 bg-white/5 rounded-full blur-[100px]" />
            <img
              src={IMAGES.products}
              alt="Digital Store Grid"
              className="relative rounded-[4rem] shadow-2xl border-[12px] border-card scale-110"
            />
          </div>
        </div>
      </section>

      {/* Dynamic Featured Creators Section */}
      {featuredCreators && featuredCreators.length > 0 && (
        <section className="py-24 lg:py-40 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <Badge variant="outline" className="mb-6 border-orange-600/50 text-orange-600 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-600/5">
                Social Proof Protocols
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-6 leading-none">
                TRUSTED BY THE <br />
                <span className="text-orange-600 italic">BEST</span> IN THE GAME.
              </h2>
              <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
                Join the elite circle of creators who have moved their entire digital empire onto the Zenthra infrastructure.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {featuredCreators.map((creator: any) => (
                <div key={creator.id} className="group relative p-10 bg-card rounded-[3rem] border border-border/50 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-orange-600/30">
                  <div className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-orange-600/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Star className="w-6 h-6 text-orange-600" />
                  </div>

                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-muted overflow-hidden border-2 border-border group-hover:border-orange-600 transition-colors">
                      {creator.image_url ? (
                        <img src={creator.image_url} alt={creator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl text-muted-foreground">?</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-foreground uppercase tracking-tight text-xl">{creator.name}</h4>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{creator.title}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revenue Protocol</span>
                      <span className="text-sm font-black text-emerald-500 tabular-nums">{creator.revenue}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-orange-600/5 border border-orange-600/10 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Follower Matrix</span>
                      <span className="text-sm font-black text-orange-600 tabular-nums">{creator.followers}</span>
                    </div>
                  </div>

                  <blockquote className="text-muted-foreground font-medium italic leading-relaxed text-sm">
                    "{creator.quote}"
                  </blockquote>

                  <div className="mt-8 pt-8 border-t border-border/50">
                    <Button variant="outline" className="w-full rounded-2xl border-border bg-muted/30 h-12 text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all" asChild>
                      <Link to="/creators">View Full Profile Matrix</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA before footer */}
      <section className="py-40 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-orange-600/[0.02] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-6xl md:text-[8rem] font-black text-foreground mb-12 tracking-tighter leading-[0.8]">
            READY TO <br /><span className="text-orange-600 italic underline decoration-orange-600 decoration-8 underline-offset-10">START?</span>
          </h2>
          <p className="text-2xl text-muted-foreground mb-16 font-medium">
            Join 50,000+ creators scaling their business on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Button size="xl" className="rounded-2xl bg-foreground text-background hover:opacity-90 px-16 h-20 text-xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98]" asChild>
              <Link to="/auth">Claim Your Store</Link>
            </Button>
            <p className="text-muted-foreground font-black text-xs uppercase tracking-[0.2em]">14-day free trial • No credit card</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-24 px-6 bg-card leading-relaxed">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-16 mb-20 lg:px-4">
            <div className="space-y-8 max-w-sm">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="font-black text-2xl tracking-tighter text-foreground uppercase">ZENTHRA</span>
              </Link>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">The simplest all-in-one store for creators to sell digital products, book coaching calls, and automate social growth.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 text-left">
              <div>
                <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Product</h4>
                <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                  <li><Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link></li>
                  <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link></li>
                  <li><Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Support</h4>
                <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                  <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link></li>
                  <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Legal</h4>
                <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                  <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy</Link></li>
                  <li><Link to="/terms" className="hover:text-orange-600 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">© {new Date().getFullYear()} ZENTHRA CALENDAR INC. [V1.2]</p>
            <div className="flex gap-10 text-muted-foreground">
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
