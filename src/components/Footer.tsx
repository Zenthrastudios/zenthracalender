import { Link } from 'react-router-dom';
import { Calendar, Instagram, Zap, Globe } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

export function Footer() {
  const { brandName: contextBrandName } = useBrand();
  const { data: settings } = useBrandingSettings();
  
  const brandName = settings?.brand_name || contextBrandName;

  return (
    <footer className="border-t border-border py-24 px-6 bg-background leading-relaxed">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-16 mb-20 lg:px-4">
          <div className="space-y-8 max-w-sm">
            <Link to="/" className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: settings?.brand_color || '#ec4899' }}
              >
                {settings?.brand_logo_url ? (
                  <img src={settings.brand_logo_url} alt={brandName} className="w-full h-full object-contain p-2" />
                ) : (
                  <Calendar className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="font-black text-2xl tracking-tighter text-foreground uppercase">{brandName.toUpperCase()}</span>
            </Link>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">The simplest all-in-one store for creators to sell digital products, book coaching calls, and automate social growth.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 text-left">
            <div>
              <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Product</h4>
              <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link to="/creators" className="hover:text-primary transition-colors">Creators</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Support</h4>
              <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-foreground mb-8 uppercase tracking-[0.2em] text-[10px]">Legal</h4>
              <ul className="space-y-5 text-xs font-black text-muted-foreground uppercase tracking-widest">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">© {new Date().getFullYear()} {brandName.toUpperCase()}</p>
          <div className="flex gap-10 text-muted-foreground">
            <Instagram className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
            <Zap className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
            <Globe className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
}
