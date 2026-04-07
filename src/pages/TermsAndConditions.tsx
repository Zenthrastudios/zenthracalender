import { Link } from 'react-router-dom';
import { ChevronLeft, Shield, GraduationCap, Package, Calendar, BookOpen, IndianRupee, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BRAND_NAME = 'CalSchedule';
const CONTACT_EMAIL = 'support@calschedule.in';
const EFFECTIVE_DATE = 'April 7, 2026';

// Services and pricing (in INR)
const PRODUCTS_AND_SERVICES = [
    {
        category: 'Online Courses',
        icon: GraduationCap,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        items: [
            { name: 'How to Satisfy Men – Relationship & Intimacy Course', price: 5, type: 'One-time payment, Lifetime access' },
        ],
    },
    {
        category: 'Digital Products',
        icon: Package,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
        items: [
            { name: 'Digital downloadable products (guides, eBooks, templates)', price: null, type: 'Priced individually per product' },
        ],
    },
    {
        category: 'Booking & Sessions',
        icon: Calendar,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        items: [
            { name: '1-on-1 Consultation / Coaching Sessions', price: null, type: 'Pricing set per event type by creator' },
        ],
    },
    {
        category: 'Platform Subscription',
        icon: BookOpen,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        items: [
            { name: 'Free Plan', price: 0, type: 'Basic features, limited usage' },
            { name: 'Pro Plan', price: null, type: 'See /pricing for current rates in INR' },
        ],
    },
];

export default function TermsAndConditions() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
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

            <div className="max-w-4xl mx-auto px-4 py-16">
                {/* Hero */}
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Shield className="w-3.5 h-3.5" />
                        Legal
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">Terms & Conditions</h1>
                    <p className="text-zinc-500 text-sm">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
                </div>

                <div className="prose prose-zinc prose-invert max-w-none space-y-10 text-zinc-400 leading-relaxed">

                    {/* Intro */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <p>
                            Welcome to <strong className="text-white">{BRAND_NAME}</strong>. By accessing or using our platform, services, online courses, digital products, or booking tools, you agree to be bound by these Terms & Conditions. Please read them carefully before making any purchase or using our services.
                        </p>
                    </div>

                    {/* Products & Services with Pricing */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <Tag className="w-4 h-4 text-orange-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">1. Products & Services</h2>
                        </div>
                        <p className="mb-6">
                            {BRAND_NAME} offers the following products and services. All prices are listed in <strong className="text-white">Indian Rupees (INR)</strong> inclusive of applicable taxes unless stated otherwise.
                        </p>

                        <div className="space-y-5">
                            {PRODUCTS_AND_SERVICES.map(cat => (
                                <div key={cat.category} className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden`}>
                                    <div className={`flex items-center gap-3 px-5 py-4 border-b border-zinc-800`}>
                                        <div className={`w-9 h-9 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center`}>
                                            <cat.icon className={`w-4 h-4 ${cat.color}`} />
                                        </div>
                                        <h3 className="font-semibold text-white">{cat.category}</h3>
                                    </div>
                                    <div className="divide-y divide-zinc-800">
                                        {cat.items.map(item => (
                                            <div key={item.name} className="px-5 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-zinc-200 font-medium">{item.name}</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">{item.type}</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {item.price === 0 ? (
                                                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">Free</span>
                                                    ) : item.price ? (
                                                        <span className="flex items-center gap-1 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                                                            <IndianRupee className="w-3 h-3" />
                                                            {item.price.toLocaleString('en-IN')}
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium rounded-full">Varies</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Acceptance */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Acceptance of Terms</h2>
                        <p>
                            By registering, purchasing, or using any {BRAND_NAME} service, you confirm that you are at least 18 years of age (or have parental consent), that you have read and understood these Terms, and that you agree to comply with them.
                        </p>
                    </section>

                    {/* Use of Services */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Use of Services</h2>
                        <p>You agree to use our services only for lawful purposes. You may not:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-sm">
                            <li>Reproduce, share, resell, or redistribute any purchased course content or digital product without explicit written permission.</li>
                            <li>Use our platform to distribute illegal, harmful, or misleading content.</li>
                            <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
                            <li>Violate any applicable local, national, or international laws or regulations.</li>
                        </ul>
                    </section>

                    {/* Payments */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Payments & Billing</h2>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                            <li>All transactions are processed securely via <strong className="text-white">Cashfree</strong> or <strong className="text-white">Razorpay</strong>.</li>
                            <li>Prices are displayed in <strong className="text-white">INR (Indian Rupees)</strong>. International purchases may incur conversion charges from your bank.</li>
                            <li>You agree to provide accurate billing information. {BRAND_NAME} is not liable for failed payments due to incorrect details.</li>
                            <li>Purchases are non-transferable unless explicitly stated.</li>
                        </ul>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property</h2>
                        <p>
                            All content on {BRAND_NAME}—including courses, videos, text, graphics, and software—is the intellectual property of {BRAND_NAME} or its respective content creators. Purchases grant you a <strong className="text-white">personal, non-commercial, non-transferable license</strong> to access the content for personal use only.
                        </p>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, {BRAND_NAME} and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of (or inability to use) our services. Our total liability shall not exceed the amount paid by you for the specific product or service in question.
                        </p>
                    </section>

                    {/* Changes */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated effective date. Continued use of our services after changes constitutes acceptance of the revised Terms.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
                        <p>
                            These Terms are governed by the laws of <strong className="text-white">India</strong>. Any disputes shall be subject to the exclusive jurisdiction of the courts located in India.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Contact</h2>
                        <p>
                            For questions about these Terms, contact us at:{' '}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-400 hover:underline">{CONTACT_EMAIL}</a>
                            {' '}or visit our <Link to="/contact-us" className="text-orange-400 hover:underline">Contact page</Link>.
                        </p>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 mt-16">
                <div className="max-w-4xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600">
                    <span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
                    <span>·</span>
                    <Link to="/contact-us" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
                    <span>·</span>
                    <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                    <span>·</span>
                    <Link to="/refund-policy" className="hover:text-zinc-400 transition-colors">Refunds & Cancellations</Link>
                </div>
            </div>
        </div>
    );
}
