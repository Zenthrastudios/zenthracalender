import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialUsername = searchParams.get('username') || '';
  // Convert 'signup' param to boolean, default to false unless explicitly 'true'
  const forceSignup = searchParams.get('signup') === 'true';

  // State management
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(forceSignup || initialUsername ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'signup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (activeTab === 'login') {
        result = await signIn(email, password);
      } else {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setIsLoading(false);
          return;
        }
        result = await signUp(email, password, name);
      }

      if (result.error) {
        console.error('Auth error:', result.error);
        toast.error(result.error.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
      } else {
        toast.success(activeTab === 'login' ? 'Welcome back!' : 'Account created successfully!');

        // Handle post-auth navigation
        if (activeTab === 'signup' && (initialUsername || forceSignup)) {
          // New creators go to onboarding
          navigate('/onboarding');
        } else {
          // Others let the AuthProvider/App.tsx handle redirection or default behavior
          // If we don't navigate here, the App.tsx 'user' state change will trigger a re-render
          // and the ProtectedRoute/GuestRoute logic will take over.
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Failed to sign in with Google');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-50 animate-glow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] opacity-50 animate-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/25">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">CalSchedule</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground font-medium">
          <Link to="/about" className="hover:text-primary transition-colors">About</Link>
          <Link to="/help" className="hover:text-primary transition-colors">Help</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-foreground mb-3 tracking-tight">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground font-medium">
              {activeTab === 'login' ? 'Manage your calendar and bookings.' : 'Start your creator journey today.'}
            </p>
          </div>

          <div className="bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-8">
              <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Log In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Google Auth Button */}
            <button
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-background hover:bg-muted/80 rounded-xl transition-all border border-border hover:border-primary/50 shadow-sm hover:shadow-md mb-6 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-bold text-foreground">Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border/50"></div>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">or email</span>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === 'signup' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 bg-background border-input rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-background border-input rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  {activeTab === 'login' && (
                    <button type="button" className="text-xs text-primary hover:text-primary/80 font-bold transition-colors">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-background border-input rounded-xl pr-12 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-xl text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all font-bold tracking-tight bg-gradient-to-r from-primary to-orange-600 hover:brightness-110 active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {activeTab === 'login' ? 'Log In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center mt-8 text-sm text-muted-foreground font-medium">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-4 hover:text-primary">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
