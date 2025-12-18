import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import EventTypeEditor from "./pages/EventTypeEditor";
import Availability from "./pages/Availability";
import Team from "./pages/Team";
import Apps from "./pages/Apps";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import PublicBooking from "./pages/PublicBooking";
import PublicProfile from "./pages/PublicProfile";
import BookingConfirmation from "./pages/BookingConfirmation";
import Reschedule from "./pages/Reschedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Auth Route - redirects to dashboard if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
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
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/bookings" element={
        <ProtectedRoute>
          <Bookings />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/events/:id" element={
        <ProtectedRoute>
          <EventTypeEditor />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/availability" element={
        <ProtectedRoute>
          <Availability />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/teams" element={
        <ProtectedRoute>
          <Team />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/apps" element={
        <ProtectedRoute>
          <Apps />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/analytics" element={
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
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
