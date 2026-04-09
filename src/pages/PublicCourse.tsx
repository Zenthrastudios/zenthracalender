import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCourseBySlug, useCreateSupportTicket } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicPaymentInfo } from '@/hooks/usePayments';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import SEO from '@/components/common/SEO';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    MessageSquare, Info, Mail, HelpCircle, ChevronRight,
    Loader2, GraduationCap, CheckCircle2, Lock, Play, PlayCircle, Clock, Video, ShieldCheck,
    Layout, Linkedin, Instagram, Twitter, Globe
} from 'lucide-react';

declare global {
    interface Window {
        Razorpay?: unknown;
        Cashfree?: unknown;
    }
}

// Cast supabase for new tables
const db = supabase as any;

export default function PublicCoursePage() {
    const { username, slug } = useParams();
    const [searchParams] = useSearchParams();
    const { data, isLoading } = useCourseBySlug(username, slug);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Support Ticket State
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const { user: currentUser } = useAuth();
    const createTicket = useCreateSupportTicket();

    const [existingPurchase, setExistingPurchase] = useState<any>(null);

    const { data: paymentInfo } = usePublicPaymentInfo(data?.instructor?.id);

    // Pre-fill user data if available
    useEffect(() => {
        if (currentUser && !customerEmail) {
            setCustomerEmail(currentUser.email || '');
            setCustomerName(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '');
        }
    }, [currentUser, customerEmail]);

    // Check for existing purchase if email is entered
    useEffect(() => {
        if (!customerEmail || !data?.course?.id) {
            setExistingPurchase(null);
            return;
        }
        
        const checkExisting = async () => {
            const { data: existing } = await db
                .from('course_purchases')
                .select('*')
                .eq('course_id', data.course.id)
                .eq('customer_email', customerEmail)
                .eq('status', 'paid')
                .maybeSingle();
            
            if (existing) {
                setExistingPurchase(existing);
            } else {
                setExistingPurchase(null);
            }
        };
        
        const timer = setTimeout(checkExisting, 500); // Debounce
        return () => clearTimeout(timer);
    }, [customerEmail, data?.course?.id]);

    // Handle Cashfree redirect: ?order_id=xxx after payment completion
    useEffect(() => {
        const orderId = searchParams.get('order_id');
        if (!orderId || purchaseSuccess) return;

        const verifyCashfreeReturn = async () => {
            setIsProcessing(true);
            try {
                const { data: verifyData } = await supabase.functions.invoke('cashfree-payment', {
                    body: { action: 'verify-payment', orderId },
                });

                if (verifyData?.isPaid) {
                    // Find the purchase record linked to this order
                    const { data: paymentRecord } = await db
                        .from('payments')
                        .select('course_purchase_id')
                        .eq('order_id', orderId)
                        .maybeSingle();

                    if (paymentRecord?.course_purchase_id) {
                        const { data: purchaseRecord } = await db
                            .from('course_purchases')
                            .select('access_token, customer_email, customer_name')
                            .eq('id', paymentRecord.course_purchase_id)
                            .maybeSingle();

                        if (purchaseRecord?.access_token) {
                            if (purchaseRecord.customer_email) setCustomerEmail(purchaseRecord.customer_email);
                            if (purchaseRecord.customer_name) setCustomerName(purchaseRecord.customer_name);
                            setAccessToken(purchaseRecord.access_token);
                            setPurchaseSuccess(true);

                            // Trigger WhatsApp/Email notification for the successful purchase
                            supabase.functions.invoke('send-product-notification', {
                                body: { type: 'course_purchase', id: paymentRecord.course_purchase_id }
                            }).catch(err => console.error('Notification failed', err));
                        }
                    }
                }
            } catch (err) {
                console.error('Cashfree return verification failed:', err);
            } finally {
                setIsProcessing(false);
            }
        };

        verifyCashfreeReturn();
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load the correct payment SDK
    useEffect(() => {
        if (paymentInfo?.activeGateway === 'razorpay') {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
            return () => { document.body.removeChild(script); };
        }
        if (paymentInfo?.activeGateway === 'cashfree') {
            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.async = true;
            document.body.appendChild(script);
            return () => { document.body.removeChild(script); };
        }
    }, [paymentInfo?.activeGateway]);

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data?.course) return;

        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please fill all fields');
            return;
        }

        if (existingPurchase) {
             toast.info('You already own this course!', { 
                 description: 'Redirecting you to the course portal...',
                 icon: '🚀'
             });
             setTimeout(() => {
                 window.open(`/course/${existingPurchase.access_token}`, '_blank');
             }, 1500);
             return;
        }

        setIsProcessing(true);

        try {
            // Re-verify existing purchase immediately to handle race conditions
            const { data: freshCheck } = await db
                .from('course_purchases')
                .select('*')
                .eq('course_id', data.course.id)
                .eq('customer_email', customerEmail)
                .eq('status', 'paid')
                .maybeSingle();

            if (freshCheck) {
                setExistingPurchase(freshCheck);
                toast.info('Active enrollment already detected.', {
                    description: 'Access has already been granted to this system.'
                });
                setIsProcessing(false);
                return;
            }

            // 1. Create pending purchase
            const { data: purchase, error } = await db
                .from('course_purchases')
                .insert({
                    course_id: data.course.id,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    amount: data.course.price,
                    status: 'pending',
                    payment_provider: paymentInfo?.activeGateway || 'razorpay',
                })
                .select()
                .single();

            if (error || !purchase) throw new Error('Failed to initialize purchase');

            // Handle free courses
            if (data.course.is_free || data.course.price === 0) {
                await db
                    .from('course_purchases')
                    .update({ status: 'paid' })
                    .eq('id', purchase.id);

                setAccessToken(purchase.access_token);
                setPurchaseSuccess(true);

                // Email notification
                supabase.functions.invoke('send-product-notification', {
                    body: { type: 'course_purchase', id: purchase.id }
                }).catch(err => console.error("Notification failed", err));

                setIsProcessing(false);
                return;
            }

            const gateway = paymentInfo?.activeGateway || 'razorpay';

            if (gateway === 'cashfree') {
                // Sanitize phone number (Cashfree expects digits only)
                const sanitizedPhone = customerPhone.replace(/\D/g, '');
                
                // Ensure returnUrl doesn't have double ?
                const currentUrl = window.location.href;
                const returnUrl = currentUrl.includes('?') 
                    ? `${currentUrl}&order_id={order_id}` 
                    : `${currentUrl}?order_id={order_id}`;

                // ── Cashfree flow ──────────────────────────────────────────────
                const { data: orderData, error: orderError } = await supabase.functions.invoke(
                    'cashfree-payment',
                    {
                        body: {
                            action: 'create-order',
                            coursePurchaseId: purchase.id,
                            amount: data.course.price,
                            currency: 'INR',
                            customerName,
                            customerEmail,
                            customerPhone: sanitizedPhone,
                            returnUrl: currentUrl, // The edge function handles the ?order_id append
                            hostId: data.instructor.id,
                        },
                    }
                );

                if (orderError) {
                    console.error('Cashfree Order Initialization Failed:', orderError);
                    const errorDetails = orderError.context?.error || orderError.message || 'Unknown error';
                    throw new Error(`Payment Gateway Error: ${errorDetails}`);
                }
                
                if (!orderData || !orderData.paymentSessionId) {
                    throw new Error('Cashfree session initialization incomplete');
                }

                if (!window.Cashfree) {
                    throw new Error('Cashfree SDK not loaded. Please refresh the page and try again.');
                }

                const cashfreeFactory = window.Cashfree as unknown as (opts: { mode: string }) => {
                    checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<{ error?: unknown }>;
                };
                const cashfree = cashfreeFactory({ mode: paymentInfo?.cashfreeMode || 'sandbox' });

                cashfree.checkout({
                    paymentSessionId: orderData.paymentSessionId,
                    redirectTarget: '_modal',
                }).then(async (result: { error?: unknown }) => {
                    if (result.error) {
                        toast.error('Payment failed. Please try again.');
                        setIsProcessing(false);
                        return;
                    }
                    // Verify
                    const { data: verifyData } = await supabase.functions.invoke('cashfree-payment', {
                        body: { action: 'verify-payment', orderId: orderData.orderId },
                    });
                    if (verifyData?.isPaid) {
                        setAccessToken(purchase.access_token);
                        setPurchaseSuccess(true);
                        toast.success('Purchase successful!');
                        supabase.functions.invoke('send-product-notification', {
                            body: { type: 'course_purchase', id: purchase.id }
                        }).catch(err => console.error('Notification failed', err));
                    } else {
                        toast.error('Payment not completed. Please try again.');
                    }
                    setIsProcessing(false);
                }).catch(() => {
                    toast.error('Payment was cancelled.');
                    setIsProcessing(false);
                });
            } else {
                // ── Razorpay flow ──────────────────────────────────────────────
                const { data: orderData, error: orderError } = await supabase.functions.invoke(
                    'razorpay-payment',
                    {
                        body: {
                            action: 'create-order',
                            coursePurchaseId: purchase.id,
                            amount: data.course.price,
                            currency: 'INR',
                            customerName,
                            customerEmail,
                            customerPhone,
                            hostId: data.instructor.id,
                        },
                    }
                );

                if (orderError || !orderData) throw new Error('Failed to create payment order');
                if (!window.Razorpay) throw new Error('Razorpay not loaded');

                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency || 'INR',
                    name: data.instructor.name,
                    description: `Course: ${data.course.title}`,
                    order_id: orderData.id,
                    handler: async (response: any) => {
                        try {
                            const { error: verifyError } = await supabase.functions.invoke(
                                'razorpay-payment',
                                {
                                    body: {
                                        action: 'verify-payment',
                                        razorpayOrderId: response.razorpay_order_id,
                                        razorpayPaymentId: response.razorpay_payment_id,
                                        razorpaySignature: response.razorpay_signature,
                                    },
                                }
                            );
                            if (verifyError) throw verifyError;
                            setAccessToken(purchase.access_token);
                            setPurchaseSuccess(true);
                            toast.success('Purchase successful!');
                            supabase.functions.invoke('send-product-notification', {
                                body: { type: 'course_purchase', id: purchase.id }
                            }).catch(err => console.error('Notification failed', err));
                        } catch (err: any) {
                            toast.error(err.message || 'Payment verification failed');
                        }
                        setIsProcessing(false);
                    },
                    modal: { ondismiss: () => setIsProcessing(false) },
                    prefill: { name: customerName, email: customerEmail, contact: customerPhone },
                    theme: { color: '#F5A623' },
                };

                const RazorpayConstructor = window.Razorpay as any;
                const razorpay = new RazorpayConstructor(options);
                razorpay.open();
            }
        } catch (error: any) {
            console.error('Purchase error:', error);
            toast.error(error.message || 'Failed to process purchase');
            setIsProcessing(false);
        }
    };

    const handleInviteInstructorContact = () => {
        setIsContactDialogOpen(true);
        setSupportSubject(`Inquiry about ${data?.course.title}`);
    };

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data?.course || !supportMessage) return;

        setIsSubmittingTicket(true);
        try {
            const ticket = await createTicket.mutateAsync({
                user_id: data.course.user_id,
                course_id: data.course.id,
                customer_name: customerName || 'Anonymous Guest',
                customer_email: customerEmail || 'guest@example.com',
                customer_phone: customerPhone || null,
                subject: supportSubject,
                message: supportMessage,
                status: 'pending'
            });

            // Trigger WhatsApp alert for the instructor
            supabase.functions.invoke('send-whatsapp-message', {
                body: {
                    type: 'support_ticket_created',
                    ticketId: ticket.id,
                }
            }).catch(err => console.error('WhatsApp notification failed', err));

            // Trigger Email alert for the instructor/support
            supabase.functions.invoke('send-support-ticket-email', {
                body: {
                    ticketId: ticket.id,
                }
            }).catch(err => console.error('Email notification failed', err));

            toast.success('Support ticket created! We will get back to you soon.');
            setIsContactDialogOpen(false);
            setSupportMessage('');
        } catch (error: any) {
            toast.error('Failed to send message: ' + error.message);
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    if (isLoading) {
        return (
            <div className="dark flex items-center justify-center min-h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data || !data.course) {
        return (
            <div className="dark flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background text-foreground">
                <div className="p-8 bg-zinc-900 rounded-full shadow-2xl mb-4 border border-zinc-800">
                    <GraduationCap className="w-10 h-10 text-zinc-600" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Course Not Found</h1>
                <p className="text-zinc-500 text-sm">This course is currently unavailable.</p>
            </div>
        );
    }

    const course = data.course;
    const lessons = data.lessons;
    const instructorData = (data as any).assigned_instructor || data.instructor;
    const totalDuration = lessons.reduce((sum: number, l: any) => sum + (l.video_duration || 0), 0);

    // Success state
    if (purchaseSuccess && accessToken) {
        const loginUrl = `/auth?email=${encodeURIComponent(customerEmail)}`;
        return (
            <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground p-4">
                <div className="max-w-md w-full space-y-4">
                    <div className="border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden rounded-3xl">
                        <div className="h-1 bg-gradient-to-r from-primary to-primary w-full" />
                        <div className="text-center pb-2 pt-8 px-8">
                            <div className="w-16 h-16 bg-orange-500/10 rounded-full mx-auto flex items-center justify-center mb-4 border border-orange-500/20">
                                <CheckCircle2 className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">You're Enrolled!</h2>
                            <p className="text-zinc-500 text-sm mt-1">Your access has been confirmed</p>
                        </div>
                        <div className="text-center space-y-4 px-8 pb-2">
                            <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                                <h3 className="font-semibold text-base text-white">{course.title}</h3>
                                <p className="text-xs text-orange-500 mt-1">{lessons.length} lessons included</p>
                            </div>
                            <p className="text-sm text-zinc-400">
                                Access link sent to <strong className="text-zinc-200">{customerEmail}</strong>
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2 pb-8 px-8">
                            <Button
                                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary transition-all group"
                                onClick={() => window.open(`/course/${accessToken}`, '_blank')}
                            >
                                <PlayCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Start Learning
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-zinc-800" />
                                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">or</span>
                                <div className="flex-1 h-px bg-zinc-800" />
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-11 text-sm font-semibold border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl"
                                onClick={() => window.location.href = `/auth?email=${encodeURIComponent(customerEmail)}&redirect=/course/${accessToken}`}
                            >
                                Login to Access Your Account
                            </Button>
                            <p className="text-xs text-zinc-600 text-center">
                                Save your progress &amp; access all purchased courses
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center">
            <SEO
                title={course.title}
                description={course.description || `Enroll in ${course.title} by ${instructorData.name}`}
                image={course.thumbnail_url || undefined}
                url={window.location.href}
                type="article"
            />

            {/* Top Nav */}
            <div className="w-full max-w-6xl px-4 pt-6 flex items-center justify-between">
                <Button
                    variant="ghost"
                    className="rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-medium gap-2 h-9 px-4"
                    onClick={() => window.location.href = currentUser ? (currentUser.email?.includes('@admin') ? '/dashboard' : '/guest') : '/'}
                >
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    Home
                </Button>
            </div>
            
            <div className="w-full max-w-6xl px-4 py-10 sm:py-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Main Card */}
                <div className="grid md:grid-cols-5 gap-0 overflow-hidden rounded-3xl border border-zinc-800 shadow-2xl">
                    {/* Left: Course Info (3 cols) */}
                    <div className="md:col-span-3 bg-background p-6 sm:p-10 flex flex-col gap-7 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.06),transparent_60%)] pointer-events-none" />

                        <div className="relative z-10 flex flex-col gap-7 flex-1">

                            {/* Thumbnail / Trailer */}
                            <div className="relative group overflow-hidden rounded-2xl aspect-video bg-zinc-900 border border-zinc-800 shadow-xl">
                                {course.trailer_url ? (
                                    <iframe
                                        src={course.trailer_url.includes('youtube.com') || course.trailer_url.includes('youtu.be')
                                            ? `https://www.youtube.com/embed/${course.trailer_url.split('v=')[1] || course.trailer_url.split('/').pop()}?autoplay=0&modestbranding=1&rel=0`
                                            : course.trailer_url}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : course.thumbnail_url ? (
                                    <>
                                        <img
                                            src={course.thumbnail_url}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-14 h-14 rounded-full bg-orange-500/90 flex items-center justify-center shadow-xl">
                                                <Play className="w-6 h-6 text-white fill-current ml-1" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900">
                                        <Video className="w-8 h-8 text-zinc-700" />
                                        <span className="text-xs text-zinc-600 font-medium">No preview available</span>
                                    </div>
                                )}
                            </div>

                            {/* Title & Description */}
                            <div className="space-y-2">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                                    {course.title}
                                </h1>
                                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                                    {course.description}
                                </p>
                            </div>

                            {/* Rich description */}
                            {course.rich_description && (
                                <div className="pt-5 border-t border-zinc-800/60">
                                    <div
                                        className="prose prose-invert prose-sm max-w-none text-zinc-500 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: course.rich_description }}
                                    />
                                </div>
                            )}

                            {/* About Instructor Section */}
                            <div className="pt-10 border-t border-zinc-800/60 pb-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="w-16 h-16 ring-4 ring-orange-500/10 shadow-2xl">
                                        <AvatarImage src={instructorData.avatar_url || undefined} />
                                        <AvatarFallback className="bg-zinc-800 text-orange-500 font-bold text-xl">
                                            {instructorData.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{instructorData.name}</h3>
                                        <p className="text-orange-500 text-sm font-semibold">{instructorData.specialization || 'Lead Instructor'}</p>
                                    </div>
                                </div>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                    {instructorData.bio || 'Experienced educator focused on delivering high-quality learning experiences. Join thousands of students who have mastered these skills through our structured curriculum.'}
                                </p>
                                
                                {/* Social Links */}
                                <div className="flex flex-wrap gap-4">
                                    {instructorData.linkedin_url && (
                                        <a href={instructorData.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                                            <Linkedin className="w-4 h-4 text-blue-400" />
                                            LinkedIn
                                        </a>
                                    )}
                                    {instructorData.instagram_url && (
                                        <a href={instructorData.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                                            <Instagram className="w-4 h-4 text-pink-400" />
                                            Instagram
                                        </a>
                                    )}
                                    {instructorData.twitter_url && (
                                        <a href={instructorData.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                                            <Twitter className="w-4 h-4 text-sky-400" />
                                            Twitter
                                        </a>
                                    )}
                                    {instructorData.website_url && (
                                        <a href={instructorData.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                                            <Globe className="w-4 h-4 text-emerald-400" />
                                            Website
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-4 sm:gap-8 mt-auto pt-8 border-t border-zinc-800/60">
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Duration</p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm font-bold text-white">{Math.round(totalDuration / 60) || 120}+ min</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Lessons</p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        <Video className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm font-bold text-white">{lessons.length} videos</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Access</p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm font-bold text-white">Lifetime</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Checkout (2 cols) */}
                    <div className="md:col-span-2 p-6 sm:p-8 flex flex-col bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 relative">
                        <Lock className="absolute top-5 right-5 w-4 h-4 text-zinc-700" />

                        {existingPurchase ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-8">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                                    <ShieldCheck className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Already Enrolled</h2>
                                    <p className="text-zinc-500 text-sm mt-1">You have full access to this course.</p>
                                </div>
                                <Button
                                    className="w-full h-11 text-base font-semibold bg-white text-black hover:bg-zinc-100 transition-all"
                                    onClick={() => window.open(`/course/${existingPurchase.access_token}`, '_blank')}
                                >
                                    <PlayCircle className="w-5 h-5 mr-2" />
                                    Continue Learning
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {/* Price */}
                                <div>
                                    <Badge className="bg-orange-500 text-white border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2 shadow-lg shadow-orange-500/20">
                                        Instant Access
                                    </Badge>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-4xl font-black text-white">
                                            {course.is_free ? 'Free' : `₹${course.price}`}
                                        </span>
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-medium">One-time payment</p>
                                            <p className="text-[10px] text-orange-500 font-semibold">Lifetime access</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handlePurchase} className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-zinc-400">Full Name</Label>
                                        <Input
                                            placeholder="Enter your name"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="h-10 bg-zinc-800 border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus-visible:ring-primary"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-zinc-400">Email Address</Label>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            className="h-10 bg-zinc-800 border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus-visible:ring-primary"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-zinc-400">Phone Number</Label>
                                        <Input
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="h-10 bg-zinc-800 border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus-visible:ring-primary"
                                            required
                                        />
                                    </div>

                                    {/* Security badge */}
                                    <div className="flex items-center gap-2.5 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                        <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                                        <p className="text-xs text-zinc-400">256-bit encrypted &amp; secure</p>
                                    </div>

                                    <Button
                                        className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary text-white transition-all shadow-lg shadow-primary/20 group rounded-xl active:scale-[0.98]"
                                        type="submit"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {course.is_free ? 'Start Learning — Free' : `Enroll Now — ₹${course.price}`}
                                                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        )}

                        {/* Support */}
                        <div className="mt-auto pt-6 border-t border-zinc-800">
                            <p className="text-xs text-zinc-600 font-medium mb-2">Need help?</p>
                            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                                <DialogTrigger asChild>
                                    <button
                                        onClick={handleInviteInstructorContact}
                                        className="w-full p-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all duration-200 flex items-center gap-3 group text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:bg-orange-500/10 group-hover:border-orange-500/20 transition-all">
                                            <Mail className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-200">Contact Support</p>
                                            <p className="text-xs text-zinc-500">Reach out to the instructor</p>
                                        </div>
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border border-zinc-800 rounded-2xl shadow-2xl bg-background">
                                    <div className="p-5 border-b border-zinc-800 bg-zinc-900">
                                        <DialogHeader>
                                            <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-white">
                                                <MessageSquare className="w-5 h-5 text-primary" />
                                                Contact Support
                                            </DialogTitle>
                                        </DialogHeader>
                                        <p className="text-zinc-500 text-xs mt-1">We'll get back to you as soon as possible</p>
                                    </div>
                                    <form onSubmit={handleSubmitTicket} className="p-5 space-y-3 bg-background">
                                        {(!customerName || !customerEmail) && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <Label className="text-xs font-semibold text-zinc-400">Your Name</Label>
                                                    <Input
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        placeholder="Full Name"
                                                        className="h-10 bg-zinc-800 border-zinc-700 text-white text-sm rounded-xl"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <Label className="text-xs font-semibold text-zinc-400">Email</Label>
                                                    <Input
                                                        value={customerEmail}
                                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                                        placeholder="you@example.com"
                                                        type="email"
                                                        className="h-10 bg-zinc-800 border-zinc-700 text-white text-sm rounded-xl"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs font-semibold text-zinc-400">Phone (optional)</Label>
                                            <Input
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="+91 98765 43210"
                                                className="h-10 bg-zinc-800 border-zinc-700 text-white text-sm rounded-xl"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs font-semibold text-zinc-400">Subject</Label>
                                            <Input
                                                value={supportSubject}
                                                onChange={(e) => setSupportSubject(e.target.value)}
                                                placeholder="e.g. Course access, billing..."
                                                className="h-10 bg-zinc-800 border-zinc-700 text-white text-sm rounded-xl"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-xs font-semibold text-zinc-400">Message</Label>
                                            <Textarea
                                                value={supportMessage}
                                                onChange={(e) => setSupportMessage(e.target.value)}
                                                placeholder="Describe your issue in detail..."
                                                className="min-h-[110px] bg-zinc-800 border-zinc-700 text-white text-sm rounded-xl p-3"
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm" disabled={isSubmittingTicket}>
                                            {isSubmittingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Message"}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Curriculum & FAQ */}
                <div className="mt-14 grid lg:grid-cols-3 gap-10">
                    {/* Curriculum */}
                    <div className="lg:col-span-2 space-y-5">
                        <div>
                            <Badge className="bg-orange-500 text-white border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2 shadow-lg shadow-orange-500/20">
                                Curriculum
                            </Badge>
                            <h2 className="text-2xl font-bold text-white">Course Content</h2>
                            <p className="text-zinc-500 text-sm mt-0.5">{lessons.length} lessons · {Math.round(totalDuration / 60) || 120}+ minutes</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {lessons.map((lesson: any, idx: number) => (
                                <div key={lesson.id} className="group p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 flex items-center gap-3">
                                    {/* Thumbnail */}
                                    <div className="w-16 sm:w-20 aspect-video rounded-lg bg-zinc-800 overflow-hidden relative shrink-0 border border-zinc-700/50">
                                        {lesson.video_url ? (
                                            <>
                                                <video
                                                    src={`${lesson.video_url}#t=0.1`}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-4 h-4 text-zinc-600" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <PlayCircle className="w-5 h-5 text-white drop-shadow-lg" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold text-orange-500 uppercase">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                            {lesson.video_duration > 0 && (
                                                <span className="text-[10px] text-zinc-600">· {Math.round(lesson.video_duration / 60)}m</span>
                                            )}
                                        </div>
                                        <h4 className="font-medium text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                                            {lesson.title}
                                        </h4>
                                    </div>

                                    <div className="shrink-0">
                                        {lesson.is_preview ? (
                                            <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 text-[10px] font-semibold rounded-full">
                                                Preview
                                            </Badge>
                                        ) : (
                                            <Lock className="w-3.5 h-3.5 text-zinc-600" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FAQ & Instructor */}
                    <div className="flex flex-col gap-8">
                        {/* FAQ */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-orange-500" />
                                <h3 className="text-lg font-bold text-white">FAQ</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                {course.faq && course.faq.length > 0 ? (
                                    course.faq.map((item: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-200">
                                            <div className="flex items-start gap-2.5 mb-1.5">
                                                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-[10px] font-bold shrink-0 mt-0.5">?</div>
                                                <p className="font-semibold text-sm text-zinc-100">{item.question}</p>
                                            </div>
                                            <p className="text-xs text-zinc-500 leading-relaxed pl-7">{item.answer}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 border border-dashed border-zinc-800 rounded-xl text-center">
                                        <Info className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
                                        <p className="text-xs text-zinc-600">No FAQs added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Instructor card */}
                        <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10">
                                <Avatar className="w-12 h-12 ring-1 ring-zinc-700">
                                    <AvatarImage src={instructorData.avatar_url || undefined} />
                                    <AvatarFallback className="bg-zinc-800 text-white font-bold">{instructorData.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-white text-sm">{instructorData.name}</p>
                                    <Badge className="mt-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                        Instructor
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full border-t border-zinc-900 py-10 mt-6">
                <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-lg font-bold text-white">
                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-black text-xs font-bold">Z</span>
                        </div>
                        ZEN<span className="text-orange-500">THRA</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-5 text-xs text-zinc-600">
                        <button className="hover:text-zinc-300 transition-colors" onClick={() => setIsContactDialogOpen(true)}>Support</button>
                        <button className="hover:text-zinc-300 transition-colors">Help</button>
                        <button className="hover:text-zinc-300 transition-colors">Privacy</button>
                        <button className="hover:text-zinc-300 transition-colors">Terms</button>
                    </div>
                    <p className="text-xs text-zinc-700">
                        © {new Date().getFullYear()} {instructorData.name} · Powered by Intimatecare.in
                    </p>
                </div>
            </footer>
        </div>
    );
}
