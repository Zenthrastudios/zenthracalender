import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { useRole } from "@/hooks/useRole";
import { useCourseCustomer } from "@/hooks/useCourseCustomer";
import { Capacitor } from "@capacitor/core";
import { App as AppPlugin } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Loader2 } from "lucide-react";

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
import InstagramAutomation from "./pages/InstagramAutomation";
import InstagramAnalytics from "./pages/InstagramAnalytics";
import DataDeletion from "./pages/DataDeletion";
import Webinars from "./pages/Webinars";
import WebinarPublic from "./pages/WebinarPublic";
import WebinarEditor from './pages/WebinarEditor';
import LinkTreeDashboard from './pages/LinkTreeDashboard';
import LinkTreeEditor from './pages/LinkTreeEditor';
import LinkTreePublic from './pages/LinkTreePublic';
import WebinarAnalytics from './pages/WebinarAnalytics';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Creators from './pages/Creators';
import Contact from './pages/Contact';
import Enterprise from './pages/Enterprise';
import Checkout from './pages/Checkout';
import Onboarding from './pages/Onboarding';
import Customers from './pages/Customers';
import SupportTickets from './pages/SupportTickets';
import ContactUs from './pages/ContactUs';
import TermsAndConditions from './pages/TermsAndConditions';
import RefundPolicy from './pages/RefundPolicy';

const queryClient = new QueryClient();

// Protected Route wrapper - redirects to auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const { hasPurchases, isLoading: purchaseLoading } = useCourseCustomer();

  if (isLoading || roleLoading || purchaseLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Course customers (guests with purchases) get redirected to guest dashboard
  if (role === 'guest' && hasPurchases && window.location.pathname !== '/onboarding') {
    return <Navigate to="/guest" replace />;
  }

  // Regular guests get redirected to guest dashboard, UNLESS they are trying to access onboarding
  if (role === 'guest' && window.location.pathname !== '/onboarding') {
    return <Navigate to="/guest" replace />;
  }

  return <>{children}</>;
}

// Admin-only route - only for admin users
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const { isAdmin, role, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Force onboarding for Admins (Creators), but exempt Super Admins
  if (isAdmin && role !== 'superadmin' && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAdmin) {
    console.log('User is not admin, redirecting to guest. Role:', role);
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

  // Admins go to admin/enterprise
  if (role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === 'superadmin') {
    return <Navigate to="/enterprise" replace />;
  }

  return <>{children}</>;
}

// SuperAdmin route - only for superadmins
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useRole();

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

  if (!isSuperAdmin) {
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
    if (role === 'superadmin') {
      return <Navigate to="/enterprise" replace />;
    }
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
      <Route path="/webinar/:id" element={<WebinarPublic />} />
      <Route path="/booking/confirmed/:bookingId" element={<BookingConfirmation />} />
      <Route path="/reschedule/:token" element={<Reschedule />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/my-purchases" element={<MyPurchases />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/data-deletion" element={<DataDeletion />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/creators" element={<Creators />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="/terms-conditions" element={<TermsAndConditions />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />

      <Route path="/enterprise/*" element={
        <SuperAdminRoute>
          <Enterprise />
        </SuperAdminRoute>
      } />

      <Route path="/store/:username/:slug" element={<PublicProduct />} />
      <Route path="/view/:accessToken" element={<ProductViewer />} />

      {/* Guest Route */}
      <Route path="/guest" element={
        <GuestRoute>
          <GuestDashboard />
        </GuestRoute>
      } />

      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
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
      <Route path="/dashboard/customers" element={
        <AdminRoute>
          <Customers />
        </AdminRoute>
      } />
      <Route path="/dashboard/support" element={
        <AdminRoute>
          <SupportTickets />
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
      <Route path="/dashboard/webinars" element={
        <AdminRoute>
          <Webinars />
        </AdminRoute>
      } />
      <Route path="/dashboard/webinars/:id/edit" element={
        <AdminRoute>
          <WebinarEditor />
        </AdminRoute>
      } />
      <Route path="/dashboard/webinars/:id/analytics" element={
        <AdminRoute>
          <WebinarAnalytics />
        </AdminRoute>
      } />
      {/* Link Tree Routes */}
      <Route path="/dashboard/links" element={
        <AdminRoute>
          <LinkTreeDashboard />
        </AdminRoute>
      } />
      <Route path="/dashboard/links/:id/edit" element={
        <AdminRoute>
          <LinkTreeEditor />
        </AdminRoute>
      } />
      <Route path="/links/:slug" element={<LinkTreePublic />} />

      <Route path="/dashboard/instagram" element={
        <AdminRoute>
          <InstagramAutomation />
        </AdminRoute>
      } />
      <Route path="/dashboard/instagram-analytics" element={
        <AdminRoute>
          <InstagramAnalytics />
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
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
