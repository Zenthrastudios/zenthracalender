import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCourseBySlug } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    GraduationCap,
    ShieldCheck,
    Lock,
    Play,
    PlayCircle,
    CheckCircle2,
    Clock,
    Video,
} from 'lucide-react';
import { toast } from 'sonner';

declare global {
    interface Window {
        Razorpay?: unknown;
    }
}

// Cast supabase for new tables
const db = supabase as any;

export default function PublicCoursePage() {
    const { username, slug } = useParams();
    const { data, isLoading } = useCourseBySlug(username, slug);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data?.course) return;

        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please fill all fields');
            return;
        }

        setIsProcessing(true);

        try {
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
                    payment_provider: 'razorpay',
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
                setIsProcessing(false);
                return;
            }

            // 2. Create Razorpay order via edge function
            // 2. Create Razorpay order via edge function
            const { data: orderData, error: orderError } = await supabase.functions.invoke(
                'razorpay-payment',
                {
                    body: {
                        action: 'create-order',
                        coursePurchaseId: purchase.id,
                        amount: Math.round(data.course.price * 100), // paise
                        currency: 'INR',
                        customerName,
                        customerEmail,
                        customerPhone,
                        hostId: data.instructor.id,
                    },
                }
            );

            if (orderError || !orderData) throw new Error('Failed to create payment order');

            // 3. Open Razorpay checkout
            if (!window.Razorpay) throw new Error('Razorpay not loaded');

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: data.instructor.name,
                description: `Course: ${data.course.title}`,
                order_id: orderData.orderId,
                handler: async (response: any) => {
                    try {
                        // Verify payment
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
                        toast.success('Purchase successful! 🎉');
                    } catch (err: any) {
                        toast.error(err.message || 'Payment verification failed');
                    }
                    setIsProcessing(false);
                },
                modal: {
                    ondismiss: () => setIsProcessing(false),
                },
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone,
                },
                theme: {
                    color: '#F5A623',
                },
            };

            const RazorpayConstructor = window.Razorpay as any;
            const razorpay = new RazorpayConstructor(options);
            razorpay.open();
        } catch (error: any) {
            console.error('Purchase error:', error);
            toast.error(error.message || 'Failed to process purchase');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data || !data.course) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-muted/20">
                <div className="p-6 bg-background rounded-full shadow-sm mb-4">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
                <p className="text-muted-foreground">This course is no longer available.</p>
            </div>
        );
    }

    const { course, lessons, instructor } = data;
    const totalDuration = lessons.reduce((sum, l) => sum + (l.video_duration || 0), 0);

    // Success state
    if (purchaseSuccess && accessToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
                <Card className="max-w-md w-full border-2 border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">You're In! 🎉</h2>
                        <p className="text-muted-foreground">You now have access to this course</p>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">{lessons.length} lessons</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            A confirmation email has been sent to <strong>{customerEmail}</strong>
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button
                            className="w-full h-12 text-lg"
                            onClick={() => window.open(`/course/${accessToken}`, '_blank')}
                        >
                            <PlayCircle className="w-5 h-5 mr-2" />
                            Start Learning
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-zinc-900 to-zinc-950" />

                <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-20">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Course Info */}
                        <div className="space-y-6">
                            {/* Instructor */}
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 ring-2 ring-white/20">
                                    <AvatarImage src={instructor.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {instructor.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-zinc-300 font-medium">{instructor.name}</span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                                {course.title}
                            </h1>

                            {/* Description */}
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                {course.description || 'Master new skills with this comprehensive course.'}
                            </p>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Video className="w-4 h-4" />
                                    <span>{lessons.length} lessons</span>
                                </div>
                                {totalDuration > 0 && (
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Clock className="w-4 h-4" />
                                        <span>{Math.round(totalDuration / 60)} min total</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Lifetime access</span>
                                </div>
                            </div>

                            {/* Price Badge */}
                            <div className="pt-4">
                                {course.is_free ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-4 py-2">
                                        Free Course
                                    </Badge>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-primary">₹{course.price}</span>
                                        <span className="text-zinc-500">one-time payment</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Thumbnail + Purchase Form */}
                        <div className="space-y-6">
                            {/* Thumbnail */}
                            <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl ring-1 ring-white/10">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Play className="w-16 h-16 text-zinc-600" />
                                    </div>
                                )}
                            </div>

                            {/* Purchase Card */}
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader className="pb-4">
                                    <h2 className="text-xl font-semibold">Enroll Now</h2>
                                </CardHeader>
                                <form onSubmit={handlePurchase}>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="name" className="text-zinc-400">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="John Doe"
                                                className="bg-zinc-800 border-zinc-700 mt-1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email" className="text-zinc-400">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={customerEmail}
                                                onChange={(e) => setCustomerEmail(e.target.value)}
                                                placeholder="john@example.com"
                                                className="bg-zinc-800 border-zinc-700 mt-1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone" className="text-zinc-400">Phone (WhatsApp)</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="+91 98765 43210"
                                                className="bg-zinc-800 border-zinc-700 mt-1"
                                                required
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-3">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg font-semibold"
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : course.is_free ? (
                                                'Get Free Access'
                                            ) : (
                                                `Pay ₹${course.price}`
                                            )}
                                        </Button>
                                        <p className="text-xs text-zinc-500 text-center">
                                            Secured by Razorpay. By enrolling, you agree to our Terms.
                                        </p>
                                    </CardFooter>
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Curriculum Section */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold mb-8">Course Curriculum</h2>
                <div className="space-y-3">
                    {lessons.map((lesson, index) => (
                        <div
                            key={lesson.id}
                            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                            <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
                                {index + 1}
                            </span>
                            <div className="flex-1">
                                <h3 className="font-medium">{lesson.title}</h3>
                                {lesson.description && (
                                    <p className="text-sm text-zinc-500 mt-0.5">{lesson.description}</p>
                                )}
                            </div>
                            {lesson.is_preview ? (
                                <Badge variant="outline" className="border-primary/50 text-primary">
                                    <Play className="w-3 h-3 mr-1" />
                                    Preview
                                </Badge>
                            ) : (
                                <Lock className="w-4 h-4 text-zinc-600" />
                            )}
                            {lesson.video_duration > 0 && (
                                <span className="text-sm text-zinc-500">
                                    {Math.round(lesson.video_duration / 60)}m
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-8 text-zinc-600 text-sm">
            </div>
        </div>
    );
}
