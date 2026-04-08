import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, AlertCircle, Ghost } from "lucide-react";
import { useBrand } from '@/contexts/BrandContext';

const NotFound = () => {
  const location = useLocation();
  const { brandName } = useBrand();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-20 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 text-center max-w-2xl animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-8 relative inline-block">
          <div className="text-[12rem] font-black leading-none opacity-5 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-card border border-border rounded-[2.5rem] flex items-center justify-center backdrop-blur-xl shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Ghost className="w-16 h-16 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/40">
          Lost in Space?
        </h1>

        <p className="text-xl text-muted-foreground mb-12 font-medium leading-relaxed max-w-md mx-auto">
          The page you're looking for seems to have vanished into the digital void. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="xl" className="h-16 px-10 rounded-2xl bg-foreground text-background hover:opacity-90 font-black text-lg gap-3 transition-all active:scale-95">
            <Link to="/">
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </Button>

          <Button
            variant="outline"
            size="xl"
            onClick={() => window.history.back()}
            className="h-16 px-10 rounded-2xl border-border bg-card hover:bg-muted text-foreground font-black text-lg gap-3 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>

        <div className="mt-20 flex items-center justify-center gap-2 opacity-30 select-none">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Route not found: {location.pathname}</span>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-20 scale-75">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Powerhouse Technology</span>
        <span className="text-xs font-black text-foreground italic">{brandName}</span>
      </div>
    </div>
  );
};

export default NotFound;
