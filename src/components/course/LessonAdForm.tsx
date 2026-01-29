
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LessonAdSettings } from '@/hooks/useCourses';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Image, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

interface LessonAdFormProps {
    value: LessonAdSettings | null;
    onChange: (settings: LessonAdSettings | null) => void;
    courseId: string;
}

export default function LessonAdForm({ value, onChange, courseId }: LessonAdFormProps) {
    const [enabled, setEnabled] = useState(value?.enabled || false);
    const [type, setType] = useState<LessonAdSettings['type']>(value?.type || 'custom');
    const [headline, setHeadline] = useState(value?.headline || '');
    const [body, setBody] = useState(value?.body || '');
    const [buttonText, setButtonText] = useState(value?.button_text || '');
    const [bannerUrl, setBannerUrl] = useState(value?.banner_url || '');
    const [linkUrl, setLinkUrl] = useState(value?.link_url || '');
    const [productId, setProductId] = useState(value?.product_id || '');
    const [bookingEventTypeId, setBookingEventTypeId] = useState(value?.booking_event_type_id || '');

    const [isUploading, setIsUploading] = useState(false);

    // Data for selectors
    const [products, setProducts] = useState<any[]>([]);
    const [eventTypes, setEventTypes] = useState<any[]>([]);

    useEffect(() => {
        // Load products and event types if needed
        async function loadData() {
            // Load Products
            const { data: productsData } = await supabase
                .from('digital_products')
                .select('id, title')
                .eq('is_active', true);
            if (productsData) setProducts(productsData);

            // Load Booking Event Types
            const { data: eventsData } = await supabase
                .from('event_types')
                .select('id, title')
                .eq('is_active', true);
            if (eventsData) setEventTypes(eventsData);
        }

        loadData();
    }, []);

    useEffect(() => {
        // Update parent whenever local state changes
        if (!enabled) {
            onChange(null);
            return;
        }

        onChange({
            enabled,
            type,
            headline,
            body,
            button_text: buttonText,
            banner_url: bannerUrl,
            link_url: type === 'custom' ? linkUrl : undefined,
            product_id: type === 'product' ? productId : undefined,
            booking_event_type_id: type === 'booking' ? bookingEventTypeId : undefined,
        });
    }, [enabled, type, headline, body, buttonText, bannerUrl, linkUrl, productId, bookingEventTypeId]);

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size slightly exceeds the limit (Max 5MB). Please compress the image.');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${courseId}/ads/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('course-thumbnails') // Using course-thumbnails bucket for now, or create a specific 'ad-banners'
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-thumbnails')
                .getPublicUrl(fileName);

            setBannerUrl(publicUrl);
            toast.success('Banner uploaded!');
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    <div>
                        <Label htmlFor="ad-enabled" className="text-base">Post-Lesson Popup</Label>
                        <p className="text-xs text-muted-foreground">Show an advertisement after lesson completes</p>
                    </div>
                </div>
                <Switch
                    id="ad-enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                />
            </div>

            {enabled && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                    {/* Ad Type */}
                    <div>
                        <Label>Action Type</Label>
                        <Select
                            value={type}
                            onValueChange={(v) => setType(v as any)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="custom">Custom Link</SelectItem>
                                <SelectItem value="product">Sell Digital Product</SelectItem>
                                <SelectItem value="booking">Book a Session</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Banner Image */}
                    <div>
                        <Label>Banner Image (Optional)</Label>
                        <div className="mt-2 mb-2 aspect-[3/1] bg-muted rounded-lg overflow-hidden relative border border-dashed flex items-center justify-center">
                            {bannerUrl ? (
                                <img src={bannerUrl} alt="Ad Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center">
                                    <Image className="w-8 h-8 mb-1" />
                                    <span className="text-xs">No banner</span>
                                </div>
                            )}
                        </div>
                        <label>
                            <Button variant="outline" size="sm" className="w-full cursor-pointer" asChild disabled={isUploading}>
                                <span>
                                    {isUploading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
                                    Upload Banner
                                </span>
                            </Button>
                            <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </label>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <div>
                            <Label>Headline</Label>
                            <Input
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                placeholder="e.g. Master the Advanced Techniques"
                            />
                        </div>
                        <div>
                            <Label>Body Text</Label>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Short description causing user to act..."
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label>Button Text</Label>
                            <Input
                                value={buttonText}
                                onChange={(e) => setButtonText(e.target.value)}
                                placeholder={type === 'product' ? 'Buy Now' : type === 'booking' ? 'Book Session' : 'Learn More'}
                            />
                        </div>
                    </div>

                    {/* Type Specific Fields */}
                    {type === 'custom' && (
                        <div>
                            <Label>Destination URL</Label>
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    )}

                    {type === 'product' && (
                        <div>
                            <Label>Select Product</Label>
                            <Select value={productId} onValueChange={setProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a product..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {type === 'booking' && (
                        <div>
                            <Label>Select Event Type</Label>
                            <Select value={bookingEventTypeId} onValueChange={setBookingEventTypeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an event type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {eventTypes.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
