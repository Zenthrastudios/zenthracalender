import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: Link2, label: 'Event Types', path: '/dashboard' },
  { icon: Calendar, label: 'Bookings', path: '/dashboard/bookings' },
  { icon: Clock, label: 'Availability', path: '/dashboard/availability' },
  { icon: ShoppingBag, label: 'Products', path: '/dashboard/products' },
  { icon: GraduationCap, label: 'Courses', path: '/dashboard/courses' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: Users, label: 'Instructors', path: '/dashboard/instructors' },
  { icon: Users, label: 'Teams', path: '/dashboard/teams' },
  { icon: Star, label: 'Apps', path: '/dashboard/apps' },
  { icon: Layout, label: 'Branding', path: '/dashboard/branding' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          {navItems.map((item) => {
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
          {navItems.map((item) => {
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
        {children}
      </main>
    </div>
  );
}
