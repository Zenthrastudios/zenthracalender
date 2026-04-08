import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/contexts/BrandContext';
import {
    Calendar, Mail, MessageSquare, Globe, ArrowRight, Instagram, Zap, Loader2
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Contact() {
    const { brandName } = useBrand();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name || !formData.email || !formData.message) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('contact_submissions')
                .insert([formData]);

            if (error) throw error;

            toast.success("Message sent successfully! We'll get back to you soon.");
            setFormData({
                full_name: '',
                email: '',
                subject: '',
                message: ''
            });
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.message || "Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-600/10">

            {/* Navigation */}
            <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">{brandName}</span>
                    </Link>
                    <nav className="hidden lg:flex items-center gap-10 text-[15px] font-semibold text-muted-foreground">
                        <Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link>
                        <Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link>
                        <Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link>
                        <Link to="/contact" className="text-orange-600">Contact</Link>
                    </nav>
                    <ThemeToggle />
                    <Button asChild className="rounded-full bg-foreground text-background hover:opacity-90 px-8 h-12 font-bold transition-all active:scale-95">
                        <Link to="/auth">Get Started</Link>
                    </Button>
                </div>
            </header>

            {/* Hero & Form */}
            <section className="py-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20">
                <div className="space-y-12">
                    <div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
                            We're here to <br />
                            <span className="text-orange-600 italic">help you.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground font-medium leading-relaxed max-sm:max-w-none max-w-sm">
                            Have a question about features, pricing, or just want to say hi? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-6 p-6 rounded-3xl bg-muted/30 border border-border group hover:border-orange-600/30 transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm group-hover:shadow-orange-600/10">
                                <Mail className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Email Support</p>
                                <p className="text-xl font-bold text-foreground">support@{brandName.toLowerCase()}.com</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 p-6 rounded-3xl bg-muted/30 border border-border group hover:border-orange-600/30 transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm group-hover:shadow-orange-600/10">
                                <MessageSquare className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Live Chat</p>
                                <p className="text-xl font-bold text-foreground">Available 24/7 in dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 pt-8">
                            <Instagram className="w-6 h-6 text-muted-foreground cursor-pointer hover:text-orange-600 transition-colors" />
                            <Globe className="w-6 h-6 text-muted-foreground cursor-pointer hover:text-orange-600 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-10 lg:p-14 rounded-[3.5rem] border-2 border-border shadow-2xl">
                    <form className="space-y-8" onSubmit={handleSubmit}>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
                                <Input
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Alex Rivera"
                                    disabled={loading}
                                    className="h-14 rounded-2xl bg-muted border-none text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-orange-600/30"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Work Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="alex@creators.com"
                                    disabled={loading}
                                    className="h-14 rounded-2xl bg-muted border-none text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-orange-600/30"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Subject</label>
                            <Input
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder="General Inquiry"
                                disabled={loading}
                                className="h-14 rounded-2xl bg-muted border-none text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-orange-600/30"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Message</label>
                            <Textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="How can we help?"
                                disabled={loading}
                                className="min-h-[160px] rounded-2xl bg-muted border-none text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-orange-600/30 p-6"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xl font-bold transition-all active:scale-95 shadow-xl shadow-orange-600/20"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Send Message <ArrowRight className="ml-3 w-6 h-6" /></>}
                        </Button>
                    </form>
                </div>
            </section>

            {/* Footer - Master Stan.store Style */}
            <footer className="border-t border-border py-20 px-6 bg-card mt-24">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-16 px-4">
                        <div className="space-y-6 max-w-sm">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl tracking-tight">{brandName}</span>
                            </Link>
                            <p className="text-muted-foreground font-medium">The simplest all-in-one store for creators to sell their digital products and book coaching calls.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Product</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/features" className="hover:text-orange-600 transition-colors">Features</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">Pricing</Link></li>
                                    <li><Link to="/creators" className="hover:text-orange-600 transition-colors">Creators</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Support</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Contact Us</Link></li>
                                    <li><Link to="/pricing" className="hover:text-orange-600 transition-colors">FAQ</Link></li>
                                    <li><Link to="/contact" className="hover:text-orange-600 transition-colors">Help Center</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Legal</h4>
                                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                                    <li><Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                                    <li><Link to="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-muted-foreground text-sm font-medium">© {new Date().getFullYear()} {brandName} Inc. All rights reserved.</p>
                        <div className="flex gap-8 text-muted-foreground">
                            <Instagram className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                            <Zap className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                            <Globe className="w-5 h-5 cursor-pointer hover:text-orange-600 transition-colors" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
