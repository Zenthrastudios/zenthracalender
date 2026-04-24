import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useBrand } from '@/contexts/BrandContext';

export default function PrivacyPolicy() {
    const { brandName } = useBrand();
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
                    <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                    <p className="text-muted-foreground mb-8">Last updated: January 22, 2026</p>

                    <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                            <p>
                                We collect information you provide directly to us when you create an account, use our services, or communicate with us.
                                This includes:
                            </p>
                            <ul className="list-disc pl-6 mt-4 space-y-2">
                                <li>Name and contact information (email address, phone number)</li>
                                <li>Calendar data when you connect your Google or Outlook calendar</li>
                                <li>Payment information (processed securely through our partners like Razorpay or Cashfree)</li>
                                <li>Profile details and availability settings</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                            <p>We use the information we collect to:</p>
                            <ul className="list-disc pl-6 mt-4 space-y-2">
                                <li>Provide, maintain, and improve our scheduling services</li>
                                <li>Process payments and transactions</li>
                                <li>Send you technical notices, updates, and support messages</li>
                                <li>Communicate with you about products, services, and events</li>
                                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Integration</h2>
                            <p>
                                Our services integrate with third-party providers including Google Calendar and Meta (Instagram).
                                When you connect your Instagram account, we access only the permissions necessary to manage your
                                messages, comments, and story interactions as configured in your automation rules.
                            </p>
                            <p className="mt-4">
                                We do not sell your personal data or your customers' message content to third parties.
                                Data retrieved via the Instagram Graph API is used solely to execute the automations you have created.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">4. WhatsApp & Notifications</h2>
                            <p>
                                If you opt-in for WhatsApp notifications, we share the necessary booking details with our messaging
                                providers to deliver reminders and confirmations. Your phone number is never used for marketing
                                purposes without your explicit consent.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Your Choices</h2>
                            <p>
                                You may update, correct, or delete your account information at any time by logging into your account
                                settings. You can also disconnect third-party integrations (like Google Calendar) at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us at support@{brandName.toLowerCase().replace(/\s+/g, '')}.com.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
