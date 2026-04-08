import { Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, IndianRupee, GraduationCap, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BRAND_NAME = 'CalSchedule';
const CONTACT_EMAIL = 'support@calschedule.in';
const EFFECTIVE_DATE = 'April 7, 2026';

const REFUND_POLICIES = [
    {
        icon: GraduationCap,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        title: 'Online Courses',
        window: '7 days',
        eligible: [
            'Course content is significantly different from what was described.',
            'Technical issues prevent you from accessing the course and our team is unable to resolve them within 72 hours.',
            'Duplicate payment was made for the same course.',
        ],
        notEligible: [
            'You have completed more than 20% of the course content.',
            'Request is made after 7 days from the date of purchase.',
            'You simply changed your mind or no longer need the course.',
            'Course access was shared or content was downloaded.',
        ],
        processing: '5–7 business days after approval.',
    },
    {
        icon: Package,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
        title: 'Digital Products (eBooks, Templates, Guides)',
        window: '3 days',
        eligible: [
            'The file is corrupted, inaccessible, or materially different from the description.',
            'You were charged but did not receive access/download link.',
            'Duplicate payment was charged.',
        ],
        notEligible: [
            'The product has already been downloaded or accessed.',
            'Request is made after 3 days of purchase.',
            'Change of mind or accidental purchase (for digital files).',
        ],
        processing: '5–7 business days after approval.',
    },
    {
        icon: Clock,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        title: 'Booking / Consultation Sessions',
        window: '24 hours before',
        eligible: [
            'Cancellation is made at least 24 hours before the scheduled session time.',
            'The expert/instructor fails to show up for the session.',
            'Payment was duplicated or incorrectly charged.',
        ],
        notEligible: [
            'Sessions cancelled less than 24 hours before the scheduled time.',
            'No-shows by the customer without prior notice.',
            'Sessions that have already been completed.',
        ],
        processing: '5–7 business days after approval.',
    },
];

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-background text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
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
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refunds & Cancellations
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">Refund Policy</h1>
                    <p className="text-zinc-500 text-sm">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
                </div>

                {/* Intro note */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 flex gap-4">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-zinc-400 leading-relaxed">
                        We want you to be completely satisfied with your purchase. Please read this policy carefully before buying. All refund amounts are in <strong className="text-white">Indian Rupees (INR)</strong> and will be credited back to the original payment method. Refunds are subject to review and approval by our team.
                    </div>
                </div>

                {/* Per-product policies */}
                <div className="space-y-6 mb-12">
                    {REFUND_POLICIES.map(policy => (
                        <div key={policy.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Heading */}
                            <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800">
                                <div className={`w-10 h-10 rounded-xl ${policy.bg} border ${policy.border} flex items-center justify-center`}>
                                    <policy.icon className={`w-5 h-5 ${policy.color}`} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">{policy.title}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Clock className="w-3 h-3 text-zinc-500" />
                                        <span className="text-xs text-zinc-500">Refund window: <span className="text-orange-400 font-semibold">{policy.window}</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
                                {/* Eligible */}
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm font-semibold text-emerald-400">Eligible for Refund</span>
                                    </div>
                                    <ul className="space-y-3">
                                        {policy.eligible.map(item => (
                                            <li key={item} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Not Eligible */}
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <XCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-semibold text-red-400">Not Eligible for Refund</span>
                                    </div>
                                    <ul className="space-y-3">
                                        {policy.notEligible.map(item => (
                                            <li key={item} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-zinc-800 bg-background/40 flex items-center gap-2 text-xs text-zinc-500">
                                <IndianRupee className="w-3.5 h-3.5 text-zinc-500" />
                                Refund Processing: <span className="text-zinc-300 ml-1">{policy.processing}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* How to Request */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-10">
                    <h2 className="text-xl font-bold text-white mb-5">How to Request a Refund</h2>
                    <ol className="space-y-4">
                        {[
                            { step: '1', text: `Email us at ${CONTACT_EMAIL} with the subject line "Refund Request – [Your Order ID]".` },
                            { step: '2', text: 'Include your full name, registered email address, order ID, and the reason for requesting a refund.' },
                            { step: '3', text: 'Our team will review your request within 2–3 business days and respond with a decision.' },
                            { step: '4', text: 'If approved, the refund will be processed to your original payment method within 5–7 business days.' },
                        ].map(item => (
                            <li key={item.step} className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                                    {item.step}
                                </div>
                                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{item.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* General Notes */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-xl font-bold text-white mb-5">General Notes</h2>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                            Refunds are processed only in <strong className="text-white">INR</strong> to the original payment method (UPI, card, net banking, etc.).
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                            We do not offer partial refunds unless specifically mentioned for a product.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                            Payment gateway charges (if any) deducted by Cashfree/Razorpay may not be refunded.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                            {BRAND_NAME} reserves the right to deny any refund request if there is evidence of misuse, fraudulent activity, or policy violation.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                            For any concerns, contact us at{' '}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-400 hover:underline">{CONTACT_EMAIL}</a>.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 mt-16">
                <div className="max-w-4xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600">
                    <span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
                    <span>·</span>
                    <Link to="/contact-us" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
                    <span>·</span>
                    <Link to="/terms-conditions" className="hover:text-zinc-400 transition-colors">Terms & Conditions</Link>
                    <span>·</span>
                    <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                </div>
            </div>
        </div>
    );
}
