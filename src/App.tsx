import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import GuestDashboard from "./pages/GuestDashboard";
import Bookings from "./pages/Bookings";
import EventTypeEditor from "./pages/EventTypeEditor";
import Availability from "./pages/Availability";
import Team from "./pages/Team";
import Instructors from "./pages/Instructors";
import Apps from "./pages/Apps";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Branding from "./pages/Branding";
import PublicBooking from "./pages/PublicBooking";
import PublicProfile from "./pages/PublicProfile";
import BookingConfirmation from "./pages/BookingConfirmation";
import Reschedule from "./pages/Reschedule";
import MyBookings from "./pages/MyBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route wrapper - redirects to auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Guests get redirected to guest dashboard
  if (role === 'guest') {
    return <Navigate to="/guest" replace />;
  }

  return <>{children}</>;
}

// Admin-only route - only for admin users
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/guest" replace />;
  }

  return <>{children}</>;
}

// Guest route - for logged in guests
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins go to admin dashboard
  if (role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Auth Route - redirects based on role if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    // Redirect based on role
    if (role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/guest" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={
        <AuthRoute>
          <Auth />
        </AuthRoute>
      } />
      <Route path="/book/:username" element={<PublicProfile />} />
      <Route path="/book/:username/:eventSlug" element={<PublicBooking />} />
      <Route path="/booking/confirmed/:bookingId" element={<BookingConfirmation />} />
      <Route path="/reschedule/:token" element={<Reschedule />} />
      <Route path="/my-bookings" element={<MyBookings />} />

      {/* Guest Route */}
      <Route path="/guest" element={
        <GuestRoute>
          <GuestDashboard />
        </GuestRoute>
      } />

      {/* Admin Protected Routes */}
      <Route path="/dashboard" element={
        <AdminRoute>
          <Dashboard />
        </AdminRoute>
      } />
      <Route path="/dashboard/bookings" element={
        <AdminRoute>
          <Bookings />
        </AdminRoute>
      } />
      <Route path="/dashboard/events/:id" element={
        <AdminRoute>
          <EventTypeEditor />
        </AdminRoute>
      } />
      <Route path="/dashboard/availability" element={
        <AdminRoute>
          <Availability />
        </AdminRoute>
      } />
      <Route path="/dashboard/teams" element={
        <AdminRoute>
          <Team />
        </AdminRoute>
      } />
      <Route path="/dashboard/instructors" element={
        <AdminRoute>
          <Instructors />
        </AdminRoute>
      } />
      <Route path="/dashboard/apps" element={
        <AdminRoute>
          <Apps />
        </AdminRoute>
      } />
      <Route path="/dashboard/analytics" element={
        <AdminRoute>
          <Analytics />
        </AdminRoute>
      } />
      <Route path="/dashboard/settings" element={
        <AdminRoute>
          <Settings />
        </AdminRoute>
      } />
      <Route path="/dashboard/branding" element={
        <AdminRoute>
          <Branding />
        </AdminRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
