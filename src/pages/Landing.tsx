import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Zap, ArrowRight, Check, Star } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Share your availability and let people book time with you automatically.',
  },
  {
    icon: Clock,
    title: 'Time Zone Smart',
    description: 'Automatically detect and convert time zones for global scheduling.',
  },
  {
    icon: Users,
    title: 'Team Scheduling',
    description: 'Coordinate schedules across your entire team effortlessly.',
  },
  {
    icon: Zap,
    title: 'Calendar Sync',
    description: 'Connect Google Calendar to avoid double bookings.',
  },
];

const benefits = [
  'Free forever for individuals',
  'Unlimited event types',
  'Custom booking links',
  'Email notifications',
  'Calendar integrations',
  'Timezone detection',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <Calendar className="w-5 h-5 text-background" />
          </div>
          <span className="font-bold text-xl">CalSchedule</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link to="/my-bookings" className="text-muted-foreground hover:text-foreground transition-colors">My Bookings</Link>
          <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent px-4 py-2 rounded-full text-sm font-medium text-accent-foreground mb-6 animate-fade-in">
            <Star className="w-4 h-4 text-primary" />
            Scheduling infrastructure for modern teams
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            Scheduling made
            <span className="text-primary"> simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Stop the back-and-forth. Share your availability and let people book time with you. 
            Connect your calendar and focus on what matters.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button size="xl" asChild>
              <Link to="/auth">
                Start for free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/book/alex/30min">
                See a demo booking
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Free forever • No credit card required
          </p>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 relative animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden max-w-4xl mx-auto">
            <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/50"></div>
              <div className="w-3 h-3 rounded-full bg-warning/50"></div>
              <div className="w-3 h-3 rounded-full bg-success/50"></div>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Mini Event Card */}
                <div className="bg-background rounded-xl border border-border p-4">
                  <div className="w-8 h-8 rounded-lg bg-foreground mb-3 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-background" />
                  </div>
                  <h3 className="font-semibold mb-1">30 Min Meeting</h3>
                  <p className="text-sm text-muted-foreground">30m • Google Meet</p>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-primary font-medium">/alex/30min</span>
                  </div>
                </div>
                
                {/* Mini Calendar */}
                <div className="bg-background rounded-xl border border-border p-4">
                  <h3 className="font-semibold mb-3">December 2024</h3>
                  <div className="grid grid-cols-7 gap-1 text-xs text-center">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <span key={i} className="text-muted-foreground py-1">{d}</span>
                    ))}
                    {Array.from({ length: 31 }, (_, i) => (
                      <span 
                        key={i} 
                        className={`py-1 rounded ${i === 17 ? 'bg-primary text-primary-foreground' : i > 13 && i < 21 && i !== 14 && i !== 20 ? 'hover:bg-muted cursor-pointer' : 'text-muted-foreground/50'}`}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mini Time Slots */}
                <div className="bg-background rounded-xl border border-border p-4">
                  <h3 className="font-semibold mb-3">Wed, Dec 18</h3>
                  <div className="space-y-2">
                    {['9:00am', '9:30am', '10:00am', '10:30am'].map((time, i) => (
                      <button 
                        key={time}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${i === 2 ? 'bg-primary text-primary-foreground' : 'border border-border hover:border-primary text-primary'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card border-y border-border py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to schedule smarter</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features to help you manage your time and grow your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Stop wasting time on scheduling
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                CalSchedule eliminates the back-and-forth emails trying to find a time that works. 
                Just share your link and let people book when you're available.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-8" size="lg" asChild>
                <Link to="/auth">
                  Get started for free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="bg-accent rounded-2xl p-8">
              <div className="bg-card rounded-xl shadow-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold">
                    A
                  </div>
                  <div>
                    <p className="font-semibold">Alex Thompson</p>
                    <p className="text-sm text-muted-foreground">Product Designer</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  "CalSchedule has saved me hours every week. No more email tennis trying to find a meeting time. 
                  I just send my link and people book when it works for them."
                </p>
                <div className="flex items-center gap-1 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-foreground text-background">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to simplify your scheduling?
          </h2>
          <p className="text-lg opacity-80 mb-8">
            Join thousands of professionals who trust CalSchedule for their scheduling needs.
          </p>
          <Button size="xl" variant="secondary" asChild>
            <Link to="/auth">
              Start scheduling for free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <Calendar className="w-4 h-4 text-background" />
              </div>
              <span className="font-semibold">CalSchedule</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CalSchedule. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
