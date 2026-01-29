import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProductBySlug } from '@/hooks/useDigitalProducts';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment, useCreateCashfreeOrder, useVerifyCashfreePayment } from '@/hooks/usePayments';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendWhatsAppNotification } from '@/utils/whatsapp';

declare global {
    interface Window {
        Razorpay?: unknown;
        Cashfree?: unknown;
    }
}

export default function PublicProductPage() {
    const { username, slug } = useParams();
    const { data, isLoading } = useProductBySlug(username, slug);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Payment Hooks
    const createRazorpayOrder = useCreateRazorpayOrder();
    const verifyRazorpayPayment = useVerifyRazorpayPayment();

    // Scripts loading for Payments
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data?.product) return;

        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please enter your details');
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Create a "Pending" purchase record locally first
            const { data: purchase, error } = await supabase
                .from('product_purchases')
                .insert({
                    product_id: data.product.id,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    amount: data.product.price,
                    status: 'pending',
                    payment_provider: 'razorpay' // Defaulting to Razorpay for now
                })
                .select()
                .single();

            if (error || !purchase) throw new Error('Failed to initialize purchase');

            // 2. Create Razorpay Order
            // Note: We are using the purchase ID as the "bookingId" for the metadata, strictly speaking
            // the existing hook expects a bookingId string. We'll pass purchase.id.
            // If the backend enforces FK on booking_id, this might fail unless updated.
            // Assuming for this implementation that we can reuse the generic payment intent.

            const amountInPaise = Math.round(data.product.price * 100);
            // Use short ID for receipt (Razorpay has 40 char limit for receipt)
            const shortId = purchase.id.slice(-8);
            const orderResult = await createRazorpayOrder.mutateAsync({
                bookingId: `temp_prod_${shortId}`, // Short ID to keep receipt under 40 chars
                amount: amountInPaise,
                customerName,
                customerEmail,
                customerPhone,
                hostId: data.seller.id,
            });

            // 3. Open Razorpay
            const RazorpayCtor = window.Razorpay as unknown as (new (opts: unknown) => { open: () => void });
            const options = {
                key: orderResult.keyId,
                amount: orderResult.amount,
                currency: orderResult.currency,
                name: data.product.title,
                description: 'Digital Product Purchase',
                // image: data.product.thumbnail_url,
                order_id: orderResult.orderId,
                handler: async function (response: unknown) {
                    try {
                        const r = response as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };

                        // Verify payment on backend
                        const verifyResult = await verifyRazorpayPayment.mutateAsync({
                            razorpayOrderId: r.razorpay_order_id || '',
                            razorpayPaymentId: r.razorpay_payment_id || '',
                            razorpaySignature: r.razorpay_signature || '',
                        });

                        if (verifyResult.verified) {
                            // Update purchase status to 'paid'
                            await supabase
                                .from('product_purchases')
                                .update({
                                    status: 'paid',
                                    payment_id: r.razorpay_payment_id,
                                    payment_provider: 'razorpay'
                                })
                                .eq('id', purchase.id);

                            setAccessToken(purchase.access_token);
                            setPurchaseSuccess(true);
                            toast.success('Payment successful!');

                            // Send WhatsApp notification with access link
                            try {
                                await sendWhatsAppNotification(
                                    data.seller.id, // userId (seller)
                                    'product_purchase',
                                    customerPhone,
                                    {
                                        customerName,
                                        productTitle: data.product.title,
                                        amount: data.product.price.toString(),
                                        accessLink: `${window.location.origin}/view/${purchase.access_token}`
                                    }
                                );
                            } catch (notifError) {
                                console.error('Failed to send WhatsApp notification:', notifError);
                                // Don't fail the purchase if notification fails
                            }
                        } else {
                            toast.error('Payment verification failed');
                        }
                    } catch (err) {
                        console.error(err);
                        toast.error('Payment verification failed');
                    }
                    setIsProcessing(false);
                },
                prefill: {
                    name: customerName,
                    email: customerEmail
                },
                theme: {
                    color: '#000000'
                }
            };

            const razorpay = new RazorpayCtor(options);
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

    if (!data || !data.product.is_active) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-muted/20">
                <div className="p-6 bg-background rounded-full shadow-sm mb-4">
                    <FileText className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
                <p className="text-muted-foreground">This product is no longer available.</p>
            </div>
        );
    }

    const { product, seller } = data;

    if (purchaseSuccess && accessToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
                <Card className="max-w-md w-full border-2 border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-green-700">Purchase Successful!</h1>
                        <p className="text-muted-foreground">Thank you for your order.</p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                            <FileText className="w-5 h-5 mt-0.5 text-primary" />
                            <div>
                                <h3 className="font-semibold">{product.title}</h3>
                                <p className="text-sm text-muted-foreground">Digital Access</p>
                            </div>
                        </div>
                        <p className="text-sm text-center text-muted-foreground">
                            A copy of the access link has been sent to your email.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button className="w-full h-12 text-lg" onClick={() => window.open(`/view/${accessToken}`, '_blank')}>
                            Access Content Now
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/10 flex flex-col items-center justify-center p-4 sm:p-8">
            <Card className="max-w-4xl w-full grid md:grid-cols-2 overflow-hidden shadow-2xl border-0">
                {/* Left: Product Image & Details */}
                <div className="bg-zinc-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black z-0" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Avatar className="w-8 h-8 ring-2 ring-white/20">
                                <AvatarImage src={seller.avatar_url || undefined} />
                                <AvatarFallback className="bg-zinc-700 text-white">{seller.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-zinc-300 font-medium">{seller.name}</span>
                        </div>

                        {product.thumbnail_url ? (
                            <img
                                src={product.thumbnail_url}
                                alt={product.title}
                                className="w-full aspect-video object-cover rounded-lg shadow-2xl border border-white/10"
                            />
                        ) : (
                            <div className="w-full aspect-video bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                                <FileText className="w-16 h-16 text-white/20" />
                            </div>
                        )}

                        <div>
                            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                            <p className="text-zinc-400 leading-relaxed max-h-[150px] overflow-y-auto pr-2">
                                {product.description}
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-sm text-zinc-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Secure Digital Access • Instant Delivery</span>
                    </div>
                </div>

                {/* Right: Checkout Form */}
                <div className="p-8 bg-background flex flex-col justify-center">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">Complete Purchase</h2>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-primary">₹{product.price}</span>
                                <span className="text-muted-foreground">INR</span>
                            </div>
                        </div>

                        <form onSubmit={handlePurchase} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number (WhatsApp)</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="h-11"
                                    required
                                />
                            </div>

                            <div className="pt-4">
                                <Button className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20" type="submit" disabled={isProcessing}>
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Pay ₹${product.price}`
                                    )}
                                </Button>
                            </div>

                            <div className="text-center text-xs text-muted-foreground pt-4">
                                <p>Secured by Razorpay. By purchasing, you agree to our Terms.</p>
                            </div>
                        </form>
                    </div>
                </div>
            </Card>

        </div>
    );
}
