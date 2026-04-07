import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            {/* Navigation */}
            <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tighter">Zenthra</span>
                    </Link>
                    <Button variant="ghost" asChild className="rounded-full">
                        <Link to="/" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto py-20 px-6">
                <div className="flex items-center gap-3 mb-8 text-orange-600">
                    <ShieldCheck className="w-6 h-6" />
                    <span className="font-bold uppercase tracking-widest text-sm">Policy</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-10 leading-tight">
                    Refunds & <br />
                    <span className="text-orange-600 italic">Cancellations.</span>
                </h1>

                <div className="prose prose-slate prose-lg max-w-none space-y-8 text-slate-600 font-medium leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Digital Products & Courses</h2>
                        <p>
                            Due to the nature of digital content, all sales of digital products and online courses 
                            are final. Once access is granted or the product is downloaded, we cannot offer 
                            refunds or cancellations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Coaching & Consultations</h2>
                        <p>
                            For live coaching sessions or consultations booked via our platform:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Cancellations made more than 24 hours before the scheduled time are eligible for a full refund.</li>
                            <li>Cancellations made within 24 hours of the scheduled time are non-refundable.</li>
                            <li>You may reschedule a session once, provided the request is made at least 12 hours in advance.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Refund Process</h2>
                        <p>
                            To request a refund for an eligible coaching session, please contact us at 
                            <strong className="text-slate-900"> support@zenthra.com</strong> with your order ID 
                            and email address. Approved refunds will be processed back to the original 
                            payment method within 5-7 business days.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Platform Fees</h2>
                        <p>
                            Please note that payment gateway fees or convenience charges added at the time of 
                            purchase are non-refundable even if a refund for the base product is issued.
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t border-slate-100 py-10 px-6 text-center text-slate-400 text-sm">
                <p>© {new Date().getFullYear()} Zenthra Calendar Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}
