import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Zap, ArrowRight, Check, Star, Shield, Smartphone, Video, Code, MessageSquare, CreditCard, Globe, BarChart3, Bell, CheckCircle2, ChevronRight, PlayCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const features = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Share your availability and let people book time with you automatically.',
    color: 'blue'
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Alerts',
    description: 'Automated reminders and confirmations sent directly to WhatsApp for 98% open rates.',
    color: 'emerald'
  },
  {
    icon: CreditCard,
    title: 'Payment Integration',
    description: 'Collect payments securely via Razorpay or Cashfree during the booking process.',
    color: 'orange'
  },
  {
    icon: Globe,
    title: 'Global Timezones',
    description: 'Automatically detect and convert time zones for seamless international meetings.',
    color: 'purple'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Track your booking conversion rates and meeting patterns over time.',
    color: 'indigo'
  },
  {
    icon: Shield,
    title: 'Custom Branding',
    description: 'Add your logo, custom colors, and personalized booking messages.',
    color: 'rose'
  },
  {
    icon: Zap,
    title: 'Instant Sync',
    description: 'Connect Google Calendar to avoid double bookings and keep everything in sync.',
    color: 'amber'
  },
  {
    icon: Code,
    title: 'Developer Friendly',
    description: 'Easy-to-use API and webhooks for custom integrations and workflows.',
    color: 'cyan'
  }
];

const steps = [
  {
    title: 'Connect yours',
    description: 'Integrate your Google Calendar in seconds to avoid conflicts.',
    icon: Calendar
  },
  {
    title: 'Set your hours',
    description: 'Define your availability and meeting types effortlessly.',
    icon: Clock
  },
  {
    title: 'Share the link',
    description: 'Send your personalized link and watch the meetings roll in.',
    icon: Zap
  }
];

const faqs = [
  {
    question: "Is there a free version available?",
    answer: "Yes! CalSchedule offers a robust free tier for individuals that includes unlimited event types and custom booking links."
  },
  {
    question: "How does the WhatsApp integration work?",
    answer: "You can connect your WhatsApp Business API to send automated booking confirmations, reminders, and reschedule alerts to both you and your clients."
  },
  {
    question: "Can I accept payments for my sessions?",
    answer: "Absolutely. We integrate directly with Razorpay and Cashfree, allowing you to charge for your time upfront during the booking flow."
  },
  {
    question: "Does it sync with my existing calendar?",
    answer: "Yes, we offer two-way sync with Google Calendar. We check your existing events for conflicts and add new bookings automatically."
  },
  {
    question: "Can I use my own branding?",
    answer: "Yes, our Premium plan allows you to upload your logo, set custom brand colors, and configure personalized notification templates."
  }
];

const integrations = [
  {
    name: "Google Calendar",
    description: "Keep your schedule in sync across all devices.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
  },
  {
    name: "WhatsApp",
    description: "98% open rates with automated mobile alerts.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
  },
  {
    name: "Razorpay",
    description: "Accept payments via UPI, Cards, and Netbanking.",
    icon: "https://cdn.razorpay.com/logo.svg"
  },
  {
    name: "Google Meet",
    description: "Auto-generate meeting links for every booking.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg"
  },
  {
    name: "Cashfree",
    description: "Secure payment processing for growing businesses.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Cashfree_Payments_Logo.png/640px-Cashfree_Payments_Logo.png"
  },
  {
    name: "Zoom",
    description: "Automatically create Zoom meetings on the fly.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/9/94/Zoom_Video_Communications_logo.svg"
  }
];

const benefits = [
  'Free forever for individuals',
  'Unlimited event types',
  'Custom booking links',
  'Email notifications',
  'Calendar integrations',
  'Timezone detection',
  'Automated reminders',
  'Payment integration',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-50 animate-glow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] opacity-50 animate-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">CalSchedule</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">Log in</Link>
            <Button asChild size="default" className="rounded-full px-6 shadow-lg shadow-primary/20">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-sm font-medium text-primary mb-8 animate-fade-in hover:bg-primary/20 transition-colors cursor-default">
            <Star className="w-4 h-4 fill-primary" />
            <span>The new standard in scheduling</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1] animate-slide-up">
            Scheduling made <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-yellow-500 animate-gradient-x">
              effortless & beautiful
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Stop the back-and-forth emails. Share your personalized booking link and let people schedule meetings with you in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button size="xl" asChild className="rounded-full px-8 text-lg h-14 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105">
              <Link to="/auth">
                Start for free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild className="rounded-full px-8 text-lg h-14 border-2 hover:bg-accent/50 backdrop-blur-sm">
              <Link to="/book/nirmal/ai-coding-ai-tools">
                View live demo
              </Link>
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative animate-scale-in max-w-5xl mx-auto" style={{ animationDelay: '0.4s' }}>
            {/* Floating Elements */}
            <div className="absolute -top-10 -left-10 w-40 p-4 bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 animate-bounce-subtle hidden lg:block">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  <p className="text-sm font-bold">Successfully Booked</p>
                </div>
              </div>
            </div>

            <div className="absolute top-20 -right-12 w-48 p-4 bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 animate-pulse hidden lg:block" style={{ animationDuration: '4s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Region</p>
                  <p className="text-sm font-bold">Automatic Timezone</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-64 p-3 bg-primary text-white rounded-full shadow-2xl z-20 shadow-primary/40 hidden lg:flex items-center justify-center gap-3 animate-slide-up">
              <Star className="w-4 h-4 fill-white" />
              <span className="text-sm font-bold tracking-tight">Rated 4.9/5 by 10,000+ creators</span>
            </div>

            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-orange-500 to-purple-500 rounded-3xl blur opacity-30 animate-pulse" />
            <div className="relative bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center">
              {/* Mockup Content */}
              <div className="grid md:grid-cols-3 w-full h-full p-6 md:p-10 gap-6 md:gap-10 opacity-90">
                <div className="bg-background/80 backdrop-blur rounded-2xl p-6 border border-white/5 shadow-lg flex flex-col justify-between transform transition-transform hover:-translate-y-1 duration-300">
                  <div className="text-left">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-foreground/10 rounded-full mb-2" />
                        <div className="h-2 w-20 bg-muted rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="h-2 w-3/4 bg-muted/50 rounded-full" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="h-2 w-2/3 bg-muted/50 rounded-full" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <div className="h-2 w-1/2 bg-muted/50 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-white/5">
                    <div className="h-2 w-16 bg-muted rounded-full" />
                    <Button size="sm" className="h-8 rounded-lg bg-primary/20 text-primary border-none hover:bg-primary hover:text-white transition-all text-[10px] font-bold">LIVE PREVIEW</Button>
                  </div>
                </div>

                <div className="bg-background/95 backdrop-blur rounded-2xl p-8 border border-white/10 shadow-2xl scale-110 z-10 hidden md:flex flex-col">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-border/50">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Select a Date</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">October 2026</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-3 text-center text-[10px] mb-6 font-bold text-muted-foreground/60 uppercase tracking-widest">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <span key={d}>{d}</span>)}
                    {Array.from({ length: 31 }).map((_, i) => (
                      <div key={i} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${i === 15 ? 'bg-primary text-white shadow-xl shadow-primary/40 scale-125 z-10 ring-4 ring-background' : 'hover:bg-muted/50 text-foreground/70'}`}>
                        {(i + 1) % 31 || 31}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-4 flex gap-2">
                    <div className="h-2 w-full bg-primary/20 rounded-full" />
                  </div>
                </div>

                <div className="bg-background/80 backdrop-blur rounded-2xl p-6 border border-white/5 shadow-lg flex flex-col justify-between transform transition-transform hover:-translate-y-1 duration-300">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6 rounded-3xl bg-card border border-white/10 shadow-inner">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-pulse ring-8 ring-emerald-500/5">
                        <Check className="w-10 h-10" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Confirmed!</h3>
                      <p className="text-sm text-muted-foreground font-medium mb-4">You're all set for the session.</p>
                      <div className="h-2 w-24 bg-primary/10 rounded-full mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden whitespace-nowrap">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm font-semibold text-muted-foreground/60 mb-10 text-center uppercase tracking-[0.2em]">Powering scheduling for industry leaders</p>
          <div className="flex justify-around items-center gap-12 md:gap-20 opacity-40 hover:opacity-60 transition-opacity">
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter"><Zap className="w-8 h-8 text-primary" fill="currentColor" /> ACME GEN</div>
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter"><Shield className="w-8 h-8 text-blue-500" /> SECURE_CO</div>
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter"><Smartphone className="w-8 h-8 text-emerald-500" /> APP_VOYAGE</div>
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter"><Globe className="w-8 h-8 text-purple-500" /> GLOBAL_SYNC</div>
            <div className="hidden lg:flex items-center gap-2 font-bold text-2xl tracking-tighter"><CreditCard className="w-8 h-8 text-orange-500" /> PAY_STREAM</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider mb-6">Process</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Set up in minutes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to automate your scheduling workflow and start saving hours every week.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2" />

            {steps.map((step, idx) => (
              <div key={idx} className="relative group text-center">
                <div className="w-20 h-20 rounded-3xl bg-card border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:scale-110 group-hover:bg-primary transition-all duration-500 z-10 relative">
                  <step.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center border-4 border-background">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-gradient-to-b from-background to-background/50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-bold uppercase tracking-wider mb-6">Features</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Powerful tools designed to simplify your life and make scheduling a competitive advantage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group p-8 rounded-[2rem] bg-card/40 backdrop-blur-sm hover:bg-card/60 border border-white/5 transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110",
                  feature.color === 'blue' && "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white",
                  feature.color === 'emerald' && "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white",
                  feature.color === 'orange' && "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
                  feature.color === 'purple' && "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
                  feature.color === 'indigo' && "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white",
                  feature.color === 'rose' && "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white",
                  feature.color === 'amber' && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white",
                  feature.color === 'cyan' && "bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white",
                )}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-2xl mb-4 text-foreground/90">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {feature.description}
                </p>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center text-primary font-bold text-sm group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/[0.03] -skew-y-3 transform origin-left" />
        <div className="max-w-7xl mx-auto relative grid lg:grid-cols-2 gap-24 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-bold uppercase tracking-wider mb-8">Why CalSchedule?</div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.1]">
              Automate the <span className="text-primary italic">friction</span> away
            </h2>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
              We've obsessed over the details so you don't have to. From high-conversion themes to integrated payments and WhatsApp alerts—everything is built to save you time.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 mb-12">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500 group-hover:text-white transition-all">
                    <Check className="w-4 h-4 text-green-500 group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-bold text-foreground/80">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" className="rounded-full px-10 h-16 text-lg shadow-2xl shadow-primary/30" asChild>
                <Link to="/auth">Create your free account <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="absolute -inset-10 bg-gradient-to-r from-primary/30 via-orange-500/30 to-purple-600/30 rounded-full blur-[120px] opacity-40 animate-glow" />
            <div className="bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16" />

              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold text-3xl shadow-2xl transform group-hover:rotate-6 transition-transform">
                  N
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold">Nirmal</h3>
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-primary font-bold tracking-wide">@nirmal_pro</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-background/40 p-6 rounded-2xl border border-white/5 flex items-center justify-between group/item hover:bg-background/60 transition-all hover:translate-x-2">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 group-hover/item:bg-blue-500 group-hover/item:text-white transition-all"><Video className="w-7 h-7" /></div>
                    <div>
                      <div className="font-bold text-lg">Discovery Call</div>
                      <div className="text-sm text-muted-foreground">30 min · Video Meeting</div>
                    </div>
                  </div>
                  <Button variant="outline" size="lg" className="rounded-full font-bold border-white/10 px-6">Book</Button>
                </div>

                <div className="bg-background/40 p-6 rounded-2xl border border-white/5 flex items-center justify-between group/item hover:bg-background/60 transition-all hover:translate-x-2">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-500 group-hover/item:bg-purple-500 group-hover/item:text-white transition-all"><Code className="w-7 h-7" /></div>
                    <div>
                      <div className="font-bold text-lg">Code Strategy</div>
                      <div className="text-sm text-muted-foreground">60 min · Screen Share</div>
                    </div>
                  </div>
                  <Button variant="outline" size="lg" className="rounded-full font-bold border-white/10 px-6">Book</Button>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center gap-4 text-primary text-sm font-bold">
                  <Bell className="w-5 h-5 animate-bounce-subtle" />
                  <span>Next available: tomorrow at 10:00 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-background to-background/50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-sm font-bold uppercase tracking-wider mb-6">Integrations</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Connect your favorite tools</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              CalSchedule plays well with others. Seamlessly integrate with your existing workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {integrations.map((integration, index) => (
              <div key={index} className="group p-8 rounded-[2rem] bg-card/40 backdrop-blur-md hover:bg-card/60 border border-white/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-white/5 p-4 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-inner">
                  <img
                    src={integration.icon}
                    alt={integration.name}
                    className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-bold text-lg mb-2">{integration.name}</h3>
                <p className="text-muted-foreground text-[10px] leading-relaxed uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity">Connected</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Frequently asked questions</h2>
            <p className="text-xl text-muted-foreground">Have more questions? We're here to help.</p>
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/5 last:border-0 py-2">
                  <AccordionTrigger className="text-xl font-bold text-left hover:text-primary hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-lg text-muted-foreground leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-gradient-to-b from-background/50 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold uppercase tracking-wider mb-6">Testimonials</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Trusted by professionals</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Join 10,000+ users who have regained control of their schedules.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                name: "Sarah Chen",
                role: "Product Designer",
                content: "The most beautiful scheduling tool I've ever used. The glassmorphism UI isn't just eye candy—it's incredibly intuitive.",
                avatar: "SC"
              },
              {
                name: "Marcus Thorne",
                role: "Freelance Developer",
                content: "WhatsApp alerts changed my business. My no-show rate dropped by 90% in the first week. Simple, powerful, and effective.",
                avatar: "MT"
              },
              {
                name: "Elena Rodriguez",
                role: "Executive Coach",
                content: "I've tried every calendar app out there. CalSchedule is the first one that feels truly premium and actually handles complex timezones correctly.",
                avatar: "ER"
              }
            ].map((t, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-yellow-500 text-yellow-500" />)}
                </div>
                <p className="text-xl leading-relaxed mb-8 italic text-foreground/80">"{t.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:rotate-6 transition-transform">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{t.name}</h4>
                    <p className="text-muted-foreground font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-500 to-yellow-500 rounded-[3rem] blur-3xl opacity-20 transform rotate-1 group-hover:rotate-0 transition-transform duration-1000" />
          <div className="relative bg-card border border-white/10 rounded-[3rem] p-16 md:p-24 text-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-500 to-yellow-500" />

            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
              Ready to <span className="italic text-primary">elevate</span> your workflow?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Join thousands of high-performers who trust CalSchedule to manage their most valuable asset: time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button size="xl" className="rounded-full px-12 h-18 text-xl font-bold shadow-2xl shadow-primary/40 hover:scale-105 transition-all group/btn" asChild>
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-3 w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground font-medium">No credit card required. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-lg pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="font-bold text-xl">CalSchedule</span>
              </Link>
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                The modern scheduling platform for professionals. Built with performance and aesthetics in mind.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link to="/integrations" className="hover:text-primary transition-colors">Integrations</Link></li>
                <li><Link to="/changelog" className="hover:text-primary transition-colors">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} CalSchedule. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
