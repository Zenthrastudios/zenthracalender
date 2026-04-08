import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
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
                    <h1 className="text-4xl font-bold mb-8">User Data Deletion Instructions</h1>
                    <p className="text-muted-foreground mb-8">Last updated: January 30, 2026</p>

                    <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                        <p>
                            At Intimatecare.in, we value your privacy and provide you with full control over your data.
                            If you wish to delete your data or disconnect your Instagram integration, please follow the steps below.
                        </p>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Disconnecting Instagram</h2>
                            <p>
                                You can remove our application's access to your Instagram account at any time through your Intimatecare.in dashboard:
                            </p>
                            <ul className="list-disc pl-6 mt-4 space-y-2">
                                <li>Log in to your Intimatecare.in account.</li>
                                <li>Navigate to <strong>Dashboard &gt; Apps &gt; Instagram Automation</strong>.</li>
                                <li>Click the <strong>Disconnect</strong> button.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Deleting Your Intimatecare.in Account</h2>
                            <p>
                                To permanently delete your Intimatecare.in account and all associated data (including calendar links and automation rules):
                            </p>
                            <ul className="list-disc pl-6 mt-4 space-y-2">
                                <li>Go to <strong>Settings &gt; Account</strong>.</li>
                                <li>Scroll to the "Danger Zone" section.</li>
                                <li>Click <strong>Delete Account</strong> and confirm your choice.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Requesting Manual Deletion</h2>
                            <p>
                                If you are unable to access your account or wish to request manual deletion of your data from our servers,
                                please email us at <strong>support@intimatecare.in</strong> with the subject line "Data Deletion Request".
                            </p>
                            <p className="mt-4">
                                Once we receive your request, we will delete all your personal data within 30 days and send you a confirmation email.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Facebook Data Deletion</h2>
                            <p>
                                If you used Facebook Login to connect your account and wish to remove the app through Facebook:
                            </p>
                            <ol className="list-decimal pl-6 mt-4 space-y-2">
                                <li>Go to your Facebook Profile's <strong>Settings &amp; Privacy &gt; Settings</strong>.</li>
                                <li>Look for <strong>Apps and Websites</strong> and you will see all of the apps and websites you linked with your Facebook.</li>
                                <li>Search and tap <strong>Intimatecare.in</strong> in the search bar.</li>
                                <li>Scroll and tap <strong>Remove</strong>.</li>
                            </ol>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
