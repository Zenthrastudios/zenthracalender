import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background py-12 px-6">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" className="mb-8" asChild>
                    <Link to="/">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </Button>

                <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm">
                    <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                    <p className="text-muted-foreground mb-8">Last updated: January 22, 2026</p>

                    <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using CalSchedule ("the Service"), you agree to be bound by these Terms of Service.
                                If you do not agree to these terms, please do not use the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
                            <p>
                                CalSchedule provides a platform for managing personal and professional schedules, booking appointments,
                                and automating communications related to those bookings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
                            <ul className="list-disc pl-6 mt-4 space-y-2">
                                <li>You must provide accurate and complete registration information.</li>
                                <li>You are responsible for maintaining the security of your account and password.</li>
                                <li>You may not use the Service for any illegal or unauthorized purpose.</li>
                                <li>You are responsible for all content posted and activity that occurs under your account.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Payment and Fees</h2>
                            <p>
                                Some features of the Service require payment. You agree to pay all fees associated with your
                                use of the Service as described on our pricing page. All fees are non-refundable unless
                                explicitly stated otherwise.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Intellectual Property</h2>
                            <p>
                                The Service and its original content, features, and functionality are owned by Zenthra Studios
                                and are protected by international copyright, trademark, and other intellectual property laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
                            <p>
                                In no event shall Zenthra Studios be liable for any indirect, incidental, special,
                                consequential or punitive damages, including without limitation, loss of profits, data,
                                use, goodwill, or other intangible losses.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Termination</h2>
                            <p>
                                We may terminate or suspend your account and bar access to the Service immediately,
                                without prior notice or liability, under our sole discretion, for any reason whatsoever.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Changes to Terms</h2>
                            <p>
                                We reserve the right to modify or replace these Terms at any time. We will provide
                                notice of significant changes by posting the new Terms on this page.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
