import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Capacitor } from "@capacitor/core";
import { App as AppPlugin } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import DigitalProducts from "./pages/DigitalProducts";
import DigitalProductEditor from "./pages/DigitalProductEditor";
import PublicProduct from "./pages/PublicProduct";
import ProductViewer from "./pages/ProductViewer";
import MyPurchases from "./pages/MyPurchases";
import Courses from "./pages/Courses";
import CourseEditor from "./pages/CourseEditor";
import PublicCourse from "./pages/PublicCourse";
import CourseViewer from "./pages/CourseViewer";

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
      <Route path="/" element={
        Capacitor.isNativePlatform() ? <Navigate to="/auth" replace /> : <Landing />
      } />
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
      <Route path="/my-purchases" element={<MyPurchases />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      <Route path="/store/:username/:slug" element={<PublicProduct />} />
      <Route path="/view/:accessToken" element={<ProductViewer />} />

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
      <Route path="/dashboard/products" element={
        <AdminRoute>
          <DigitalProducts />
        </AdminRoute>
      } />
      <Route path="/dashboard/products/new" element={
        <AdminRoute>
          <DigitalProductEditor />
        </AdminRoute>
      } />
      <Route path="/dashboard/products/:id" element={
        <AdminRoute>
          <DigitalProductEditor />
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
      <Route path="/dashboard/courses" element={
        <AdminRoute>
          <Courses />
        </AdminRoute>
      } />
      <Route path="/dashboard/courses/:id" element={
        <AdminRoute>
          <CourseEditor />
        </AdminRoute>
      } />

      {/* Public Course Routes */}
      <Route path="/:username/course/:slug" element={<PublicCourse />} />
      <Route path="/course/:accessToken" element={<CourseViewer />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Handle back button for Android
      AppPlugin.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          AppPlugin.exitApp();
        } else {
          window.history.back();
        }
      });

      // Handle App State (Pause/Resume)
      AppPlugin.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      // Configure Status Bar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#000000' });
    }
  }, []);

  return (
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
};

export default App;
