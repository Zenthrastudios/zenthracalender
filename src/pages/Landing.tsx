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

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-orange-100 font-sans">

      {/* Top Banner - Subtle like Stan */}
      <div className="bg-slate-900 text-white py-2 px-6 text-center text-xs font-medium tracking-wide">
        JOIN 50,000+ CREATORS MONETIZING THEIR CONTENT ON ZENTHRA
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 transition-transform group-hover:scale-105">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tighter">Zenthra</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-slate-600">
            <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link>
            <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
            <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-[15px] font-semibold text-slate-600 hover:text-orange-600 transition-colors hidden sm:block">Log in</Link>
            <Button asChild className="rounded-full bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-base font-bold shadow-xl shadow-orange-100 transition-all active:scale-95">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Stan.store style layout */}
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-40 px-6 overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 text-center lg:text-left">
            <Badge variant="secondary" className="mb-6 bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-4 py-1 text-sm font-bold uppercase tracking-wider">
              All-In-One Platform
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.05]">
              Everything You <br />
              <span className="text-orange-600 italic">Actually</span> Need <br />
              To Grow.
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Zenthra is the easiest way to sell your digital products, book coaching calls, and automate your Instagram—all from one beautiful link.
            </p>

            {/* Claim your link input */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto lg:mx-0 p-2 bg-white rounded-3xl border-2 border-slate-100 shadow-2xl focus-within:border-orange-200 transition-all">
              <div className="flex items-center px-4 py-3 bg-slate-50 rounded-2xl text-slate-400 font-semibold text-lg shrink-0">
                zenthra.com/
              </div>
              <Input
                placeholder="yourname"
                className="border-none shadow-none text-lg font-bold placeholder:text-slate-300 focus-visible:ring-0 h-auto py-3 px-1"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
              <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-base font-bold transition-all active:scale-95">
                Claim My Store
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-400 font-medium">Join 50,000+ creators • 14-day free trial</p>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000">
            <div className="absolute -inset-4 bg-orange-400/20 rounded-full blur-3xl opacity-30 animate-pulse" />
            <div className="relative rounded-[2.5rem] border-[8px] border-slate-900/5 shadow-2xl overflow-hidden bg-white">
              <img
                src={IMAGES.hero}
                alt="Zenthra Dashboard"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="py-20 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-extrabold text-slate-900 mb-2">{stat.value}</p>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Feature 1: Link-in-Bio */}
      <section className="py-24 lg:py-40 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -inset-10 bg-orange-100/50 rounded-full blur-3xl opacity-50" />
            <img
              src={IMAGES.linkInBio}
              alt="Link in Bio Mobile"
              className="relative rounded-[3rem] shadow-2xl max-w-md mx-auto border-8 border-slate-100"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center mb-8 shadow-lg shadow-orange-100">
              <LinkIcon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
              A Link-in-Bio that <br />
              actually converts.
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
              Turn your social media followers into customers. Our mobile-first landing pages are built for maximum speed and conversion.
              No distractions—just your offers and a 1-tap checkout.
            </p>
            <ul className="space-y-5 mb-10">
              {["1-Click Google/Apple Pay", "Built-in Email collection", "Custom branding & colors", "Deep social integration"].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-700 font-bold">
                  <div className="bg-orange-100 rounded-full p-1"><Check className="w-4 h-4 text-orange-600" /></div>
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="link" className="text-orange-600 font-bold text-lg p-0 h-auto group">
              Build your page <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Core Feature 2: Digital Products */}
      <section className="py-24 lg:py-40 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-8 shadow-lg shadow-slate-200">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
              Sell Digital Products <br />
              in 60 seconds.
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
              Upload your PDF, Video, or Courses and start selling instantly. No complex store setup, no hosting fees.
              Just list it and watch the sales notifications roll in.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <BookOpen className="w-6 h-6 text-orange-600 mb-3" />
                <p className="font-bold text-slate-900">E-Books</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <Layers className="w-6 h-6 text-orange-600 mb-3" />
                <p className="font-bold text-slate-900">Templates</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <Video className="w-6 h-6 text-orange-600 mb-3" />
                <p className="font-bold text-slate-900">Courses</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <MousePointer2 className="w-6 h-6 text-orange-600 mb-3" />
                <p className="font-bold text-slate-900">Coaching</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src={IMAGES.products}
              alt="Digital Store Grid"
              className="rounded-[3rem] shadow-2xl border-8 border-white"
            />
          </div>
        </div>
      </section>

      {/* Core Feature 3: Instagram Automation */}
      <section className="py-24 lg:py-40 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <img
              src={IMAGES.automation}
              alt="Automation Illustration"
              className="rounded-[3rem] shadow-2xl border-8 border-slate-100"
            />
          </div>
          <div>
            <div className="w-14 h-14 rounded-2xl bg-pink-600 flex items-center justify-center mb-8 shadow-lg shadow-pink-100">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
              Automated Sales <br />
              while you sleep.
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
              Stop replying manually. When someone comments on your post, our AI automatically DMs them your store link.
              Increase your conversion rate by 300% without lifting a finger.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Smart DM Automation</p>
                  <p className="text-sm text-slate-500">Auto-reply to comments with links.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Conversion Tracking</p>
                  <p className="text-sm text-slate-500">Know exactly which post made a sale.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section: Workshops & Analytics */}
      <section className="py-24 lg:py-40 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20">
            <div className="space-y-12">
              <div>
                <Badge className="bg-orange-600 text-white mb-6">NEW FEATURE</Badge>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-8 leading-tight italic">
                  Host Workshops <br />
                  on your terms.
                </h2>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">
                  Host private masterclasses or in-person events. Control capacity, manage waitlists, and send automated WhatsApp reminders.
                </p>
              </div>
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                <img src={IMAGES.workshops} alt="Workshops UI" className="w-full grayscale-[20%] hover:grayscale-0 transition-all duration-500" />
              </div>
            </div>

            <div className="space-y-12 lg:mt-32">
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl order-2 lg:order-1">
                <img src={IMAGES.analytics} alt="Analytics" className="w-full" />
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-4xl md:text-5xl font-extrabold mb-8 leading-tight italic">
                  Data for <br />
                  the curious.
                </h2>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">
                  Real-time sales, visitor analytics, and source tracking. Understand where your fans come from and what they want.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Branding Section */}
      <section className="py-24 lg:py-40 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative">
            <img
              src={IMAGES.branding}
              alt="Branding Identity"
              className="rounded-[3rem] shadow-2xl border-8 border-white"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-14 h-14 rounded-2xl bg-slate-400 flex items-center justify-center mb-8 shadow-lg shadow-slate-100">
              <Code className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
              Your Store, <br />
              <span className="text-slate-400">Your Brand.</span>
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
              Connect your own custom domain, use your brand colors, and customize every pixel. Zenthra stays in the background while you take center stage.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">U{i}</div>
                ))}
              </div>
              <p className="text-sm font-bold text-slate-400 italic">Join 10,000+ brands</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA before footer */}
      <section className="py-32 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-10 tracking-tight">
            Ready to <span className="text-orange-600 italic underline decoration-8 underline-offset-8">start?</span>
          </h2>
          <p className="text-xl text-slate-500 mb-12 font-medium">
            Join thousands of creators who are scaling their business on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button size="xl" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-12 h-16 text-xl font-bold shadow-2xl shadow-slate-200 transition-all active:scale-95" asChild>
              <Link to="/auth">Claim Your Store</Link>
            </Button>
            <p className="text-slate-400 font-bold">14-day free trial • No credit card</p>
          </div>
        </div>
      </section>

      {/* Clean Footer like Stan.store */}
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
