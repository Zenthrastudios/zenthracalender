import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWebinar, useRegisterWebinar } from '@/hooks/useWebinars';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Loader2, CheckCircle2, AlertCircle, Mic, HelpCircle, Share2, Video, Building2, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import SEO from '@/components/common/SEO';

export default function WebinarPublic() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: webinar, isLoading } = useWebinar(id!);
    const registerWebinar = useRegisterWebinar();

    const createRazorpayOrder = useCreateRazorpayOrder();
    const verifyRazorpayPayment = useVerifyRazorpayPayment();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Load Razorpay script if paid
    useEffect(() => {
        if (webinar?.is_paid && !window.Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, [webinar?.is_paid]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!webinar) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <h1 className="text-xl font-semibold">Webinar not found</h1>
                <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    const themeColor = webinar.theme_color || '#3b82f6';

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setIsProcessing(true);

        try {
            if (webinar.is_paid && webinar.price > 0) {
                await handlePayment();
            } else {
                await completeRegistration({ payment_status: 'free' });
            }
        } catch (error: any) {
            console.error(error);
            setErrorMessage(error.message || 'Registration failed');
            setIsProcessing(false);
        }
    };

    const handlePayment = async () => {
        const amountInPaise = Math.round(webinar.price * 100);
        let registrationId: string;
        try {
            const reg = await registerWebinar.mutateAsync({
                webinar_id: webinar.id,
                attendee_name: name,
                attendee_email: email,
                payment_status: 'pending'
            });
            registrationId = reg.id;
        } catch (err: any) {
            throw new Error("Could not initialize registration: " + err.message);
        }

        const orderResult = await createRazorpayOrder.mutateAsync({
            webinarRegistrationId: registrationId,
            amount: amountInPaise,
            customerName: name,
            customerEmail: email,
            hostId: webinar.user_id,
        });

        const options = {
            key: orderResult.keyId,
            amount: orderResult.amount,
            currency: orderResult.currency,
            name: webinar.title,
            description: 'Webinar Registration',
            order_id: orderResult.orderId,
            handler: async function (response: any) {
                try {
                    const verifyResult = await verifyRazorpayPayment.mutateAsync({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    });

                    if (verifyResult.verified) {
                        setIsRegistered(true);
                        toast.success('Registration successful!');

                        // Trigger email notification
                        try {
                            await supabase.functions.invoke('send-product-notification', {
                                body: { type: 'webinar_registration', id: registrationId }
                            });
                        } catch (e) {
                            console.error("Failed to send notification:", e);
                        }
                    } else {
                        setErrorMessage('Payment verification failed');
                    }
                } catch (error) {
                    setErrorMessage('Payment verification failed');
                } finally {
                    setIsProcessing(false);
                }
            },
            prefill: {
                name: name,
                email: email,
            },
            theme: { color: themeColor },
            modal: {
                ondismiss: function () {
                    setIsProcessing(false);
                    toast.error('Payment cancelled');
                }
            }
        };

        const RazorpayConstructor = window.Razorpay as any;
        const razorpay = new RazorpayConstructor(options);
        razorpay.open();
    };

    const completeRegistration = async (extraData: { payment_status: string, payment_id?: string }) => {
        const reg = await registerWebinar.mutateAsync({
            webinar_id: webinar.id,
            attendee_name: name,
            attendee_email: email,
            ...extraData
        });

        // Trigger email notification
        try {
            await supabase.functions.invoke('send-product-notification', {
                body: { type: 'webinar_registration', id: reg.id }
            });
        } catch (e) {
            console.error("Failed to send notification:", e);
        }

        setIsRegistered(true);
        toast.success('You have successfully registered!');
        setIsProcessing(false);
    };

    if (isRegistered) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center shadow-lg border-primary/20">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl">Registration Confirmed!</CardTitle>
                        <CardDescription>
                            You are signed up for <strong>{webinar.title}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg text-sm text-left space-y-2">
                            <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {format(parseISO(webinar.start_time), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <p className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                {format(parseISO(webinar.start_time), 'h:mm a')} - {format(parseISO(webinar.end_time), 'h:mm a')}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            A confirmation email has been sent to <strong>{email}</strong>.
                        </p>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Button variant="outline" onClick={() => window.location.reload()}>Register Another</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Styles for dynamic theme
    const buttonStyle = { backgroundColor: themeColor, borderColor: themeColor, color: '#fff' };
    const textStyle = { color: themeColor };

    return (
        <div className="min-h-screen bg-background font-sans">
            <SEO
                title={webinar.title}
                description={webinar.description || `Join our webinar on ${format(parseISO(webinar.start_time), 'MMM d')}`}
                image={webinar.cover_image_url || undefined}
                url={window.location.href}
                type="article"
            />
            {/* HERRO SECTION */}
            <div className="relative w-full dark:bg-zinc-900 bg-zinc-50 border-b">
                {/* Background Image/Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {webinar.cover_image_url && (
                        <>
                            <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-50 dark:opacity-20 scale-105" style={{ backgroundImage: `url(${webinar.cover_image_url})` }} />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
                        </>
                    )}
                </div>

                <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
                    <div className="max-w-4xl">
                        <Badge variant="secondary" className="mb-4 backdrop-blur-md bg-background/50 border-primary/20">
                            WORKSHOP
                        </Badge>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
                            {webinar.title}
                        </h1>
                        <div className="flex flex-wrap gap-6 text-muted-foreground md:text-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" style={textStyle} />
                                <span className='font-medium text-foreground'>{format(parseISO(webinar.start_time), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" style={textStyle} />
                                <span className='font-medium text-foreground'>{format(parseISO(webinar.start_time), 'h:mm a')} - {format(parseISO(webinar.end_time), 'h:mm a')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {webinar.mode === 'in-person' ? <Building2 className="w-5 h-5 text-primary" style={textStyle} /> : <Video className="w-5 h-5 text-primary" style={textStyle} />}
                                <span className="font-medium text-foreground capitalize">{webinar.mode === 'in-person' ? 'In-Person Event' : 'Online Event'}</span>
                            </div>
                            {webinar.mode === 'in-person' && webinar.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" style={textStyle} />
                                    <span className="font-medium text-foreground">{webinar.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* COVER IMAGE (FEATURED) */}
                        {webinar.cover_image_url && (
                            <div className="rounded-xl overflow-hidden shadow-lg border">
                                <img src={webinar.cover_image_url} alt={webinar.title} className="w-full h-auto object-cover" />
                            </div>
                        )}

                        {/* ABOUT / CONTENT */}
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold tracking-tight">About This Event</h2>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {webinar.content || webinar.description || "No detailed description provided."}
                            </div>
                        </section>

                        {/* SPEAKERS */}
                        {webinar.speakers && webinar.speakers.length > 0 && (
                            <section className="space-y-6">
                                <h2 className="text-2xl font-bold tracking-tight">Speakers & Hosts</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {webinar.speakers.map((speaker: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                                            <Avatar className="h-16 w-16 border-2 border-primary/10">
                                                <AvatarImage src={speaker.avatar_url} alt={speaker.name} />
                                                <AvatarFallback><Mic className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-lg">{speaker.name}</h3>
                                                <p className="text-sm text-primary font-medium" style={textStyle}>{speaker.role}</p>
                                                {speaker.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{speaker.bio}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* FAQ */}
                        {webinar.faq && webinar.faq.length > 0 && (
                            <section className="space-y-6">
                                <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
                                <Accordion type="single" collapsible className="w-full">
                                    {webinar.faq.map((item: any, i: number) => (
                                        <AccordionItem key={i} value={`item-${i}`}>
                                            <AccordionTrigger>{item.question}</AccordionTrigger>
                                            <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                                                {item.answer}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </section>
                        )}
                    </div>

                    {/* RIGHT COLUMN (STICKY) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <Card className="shadow-xl border-primary/20 overflow-hidden">
                                <div className="h-2 w-full" style={{ backgroundColor: themeColor }} />
                                <CardHeader>
                                    <CardTitle>Reserve Your Spot</CardTitle>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-3xl font-bold" style={textStyle}>
                                            {webinar.is_paid && webinar.price > 0 ? `₹${webinar.price}` : 'Free'}
                                        </span>
                                        {webinar.is_paid && <span className="text-sm text-muted-foreground">/ person</span>}
                                    </div>
                                    <CardDescription>
                                        Registration is open until {format(parseISO(webinar.start_time), 'MMM d, h:mm a')}
                                    </CardDescription>
                                    {webinar.max_attendees && (
                                        <div className="flex items-center gap-2 mt-4 text-sm font-medium text-muted-foreground bg-muted/50 p-2 rounded-md">
                                            <Users className="w-4 h-4" />
                                            <span>Limited Capacity: {webinar.max_attendees} Seats</span>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {errorMessage && (
                                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {errorMessage}
                                        </div>
                                    )}
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Enter your name"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg font-semibold shadow-lg hover:brightness-110 transition-all"
                                            style={buttonStyle}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                                            ) : (
                                                webinar.is_paid && webinar.price > 0 ? 'Proceed to Payment' : 'Register Now'
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                                <CardFooter className="justify-center border-t bg-muted/30 pt-4">
                                    <p className="text-xs text-center text-muted-foreground flex items-center gap-1">
                                        <Share2 className="w-3 h-3" />
                                        Spread the word with friends!
                                    </p>
                                </CardFooter>
                            </Card>

                            {/* HOST INFO MINI CARD */}
                            <div className="mt-6 p-4 rounded-xl border bg-card flex items-center gap-4">
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                    {webinar.title.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Hosted By</p>
                                    <p className="font-medium text-sm">Zenthra Calendar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
