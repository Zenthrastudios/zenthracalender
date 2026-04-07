import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, MapPin, MessageSquare, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

const CONTACT_EMAIL = 'support@calschedule.in';
const CONTACT_PHONE = '+91 XXXXX XXXXX';
const BRAND_NAME = 'CalSchedule';

export default function ContactUs() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        // Simulate form submission
        setTimeout(() => {
            toast.success('Message sent! We\'ll get back to you within 24 hours.');
            setName(''); setEmail(''); setSubject(''); setMessage('');
            setSending(false);
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-2" asChild>
                        <Link to="/">
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Link>
                    </Button>
                    <div className="h-5 w-px bg-zinc-800" />
                    <span className="text-sm font-medium text-zinc-400">{BRAND_NAME}</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-16">
                {/* Hero */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Contact Us
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">We'd love to hear from you</h1>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        Have a question, feedback, or need support? Our team is here to help.
                    </p>
                </div>

                <div className="grid md:grid-cols-5 gap-8">
                    {/* Contact Info */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-white">Get in touch</h2>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Email</p>
                                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-white hover:text-orange-400 transition-colors">
                                            {CONTACT_EMAIL}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <Phone className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Phone</p>
                                        <a href={`tel:${CONTACT_PHONE}`} className="text-sm text-white hover:text-orange-400 transition-colors">
                                            {CONTACT_PHONE}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Location</p>
                                        <p className="text-sm text-white">India</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Support Hours</p>
                                        <p className="text-sm text-white">Mon–Sat, 10 AM – 6 PM IST</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-white mb-2">Quick Links</h3>
                            <div className="space-y-2 mt-3">
                                {[
                                    { label: 'Terms & Conditions', to: '/terms-conditions' },
                                    { label: 'Refunds & Cancellations', to: '/refund-policy' },
                                    { label: 'Privacy Policy', to: '/privacy' },
                                ].map(link => (
                                    <Link key={link.to} to={link.to} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-orange-400 transition-colors py-1">
                                        <ChevronLeft className="w-3 h-3 rotate-180" />
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-6">Send us a message</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-400">Your Name</Label>
                                    <Input
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-400">Email Address</Label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 rounded-xl h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zinc-400">Subject</Label>
                                <Input
                                    placeholder="How can we help?"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 rounded-xl h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zinc-400">Message</Label>
                                <Textarea
                                    placeholder="Tell us more about your query..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    required
                                    rows={5}
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500 rounded-xl resize-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={sending}
                                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl gap-2 transition-all"
                            >
                                {sending ? 'Sending...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Message
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 mt-16">
                <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600">
                    <span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
                    <span>·</span>
                    <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                    <span>·</span>
                    <Link to="/terms-conditions" className="hover:text-zinc-400 transition-colors">Terms & Conditions</Link>
                    <span>·</span>
                    <Link to="/refund-policy" className="hover:text-zinc-400 transition-colors">Refunds & Cancellations</Link>
                </div>
            </div>
        </div>
    );
}
