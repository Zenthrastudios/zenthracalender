import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useTheme } from 'next-themes';
import {
  Link2,
  Calendar,
  Clock,
  Users,
  Settings,
  Star,
  LogOut,
  BarChart3,
  Menu,
  X,
  GraduationCap,
  Layout,
  Sun,
  Moon,
  Sparkles,
  ShoppingBag,
  Instagram,
  Video,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays, isPast } from 'date-fns';

const TRIAL_PLAN_ID = '11111111-1111-1111-1111-111111111111';

import { useFeatures } from '@/hooks/useFeatures';

const navItems = [
  { icon: Link2, label: 'Event Types', path: '/dashboard', feature: 'dashboard' },
  { icon: Calendar, label: 'Bookings', path: '/dashboard/bookings', feature: 'bookings' },
  { icon: Clock, label: 'Availability', path: '/dashboard/availability', feature: 'availability' },
  { icon: ShoppingBag, label: 'Products', path: '/dashboard/products', feature: 'products' },
  { icon: GraduationCap, label: 'Courses', path: '/dashboard/courses', feature: 'courses' },
  { icon: Video, label: 'Webinars', path: '/dashboard/webinars', feature: 'webinars' },
  { icon: Smartphone, label: 'Bio Links', path: '/dashboard/links', feature: 'bio_links' },
  { icon: Instagram, label: 'Instagram', path: '/dashboard/instagram', feature: 'instagram' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', feature: 'advanced_analytics' },
  { icon: Users, label: 'Instructors', path: '/dashboard/instructors', feature: 'instructors' },
  { icon: Users, label: 'Teams', path: '/dashboard/teams', feature: 'team_management' },
  { icon: Star, label: 'Apps', path: '/dashboard/apps', feature: 'apps' },
  { icon: Layout, label: 'Branding', path: '/dashboard/branding', feature: 'branding' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { isSuperAdmin } = useRole();
  const { hasFeature, isLoading: featuresLoading } = useFeatures();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Trial Governor Logic
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = !isSuperAdmin && trialEnds && !isPast(trialEnds) && profile?.plan_id === TRIAL_PLAN_ID;
  const isTrialExpired = !isSuperAdmin && trialEnds && isPast(trialEnds) && profile?.plan_id === TRIAL_PLAN_ID;
  const daysRemaining = trialEnds ? differenceInDays(trialEnds, new Date()) : 0;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col lg:flex-row">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Mobile Header - Sticky */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-40 pt-[calc(12px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
            {profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'C'}
          </div>
          <div>
            <span className="font-semibold text-sm block">{profile?.name || 'CalSchedule'}</span>
            <span className="text-xs text-muted-foreground">@{profile?.username || 'user'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-xl"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 top-[61px]"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <aside className={cn(
        "lg:hidden fixed top-[61px] left-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl border-r border-border/60 z-50 transform transition-transform duration-300 ease-out overflow-y-auto",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="p-4 space-y-1">
          {isSuperAdmin && (
            <Link
              to="/enterprise"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold bg-orange-600 text-white shadow-lg shadow-orange-900/20 mb-4 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Layout className="w-5 h-5" />
              Enterprise Admin
            </Link>
          )}
          {navItems.filter(item => hasFeature(item.feature)).map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard');

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/60 space-y-1">
          <Link
            to="/dashboard/settings"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button
            onClick={() => { closeMobileMenu(); handleLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-card/80 backdrop-blur-xl border-r border-border/60 flex-col flex-shrink-0 relative">
        {/* Subtle glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* User Profile */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25">
              {profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile?.name || 'My Scheduler'}</p>
              <p className="text-xs text-muted-foreground truncate">@{profile?.username || 'user'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {isSuperAdmin && (
            <Link
              to="/enterprise"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all duration-200 mb-6 border border-orange-200"
            >
              <Sparkles className="w-5 h-5 text-orange-500" />
              Enterprise Dashboard
            </Link>
          )}
          {navItems.filter(item => hasFeature(item.feature)).map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "drop-shadow-sm")} />
                <span>{item.label}</span>
                {isActive && (
                  <Sparkles className="w-3 h-3 absolute right-3 opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border/60 space-y-1">
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground/60">© 2026 CalSchedule</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Trial Banner or Lockdown */}
        {isTrialActive && (
          <div className="bg-orange-600/10 border-b border-orange-600/20 px-4 py-2 flex items-center justify-between backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                Pulse Trial Active: {daysRemaining + 1} Days Remaining
              </span>
            </div>
            <Link to="/pricing" className="text-xs font-black bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors uppercase tracking-wider">
              Upgrade Protocol
            </Link>
          </div>
        )}

        {isTrialExpired ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
            <div className="max-w-md w-full p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-orange-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Protocol Expired</h2>
              <p className="text-muted-foreground font-medium text-lg">
                Your 4-day trial access to the Zenthra Pulse has concluded. Secure a subscription to restore full operational capability.
              </p>
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-lg rounded-2xl shadow-xl shadow-orange-600/20"
              >
                Restore Access
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
