
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { LessonAdSettings } from '@/hooks/useCourses';
import { useAdAnalytics } from '@/hooks/useAdAnalytics';
import { ExternalLink, ShoppingBag, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LessonAdPopupProps {
    isOpen: boolean;
    onClose: () => void;
    settings: LessonAdSettings;
    lessonId: string;
    purchaseId?: string;
    customerEmail?: string;
    courseId?: string;
}

export default function LessonAdPopup({ isOpen, onClose, settings, lessonId, purchaseId, customerEmail, courseId }: LessonAdPopupProps) {
    const { trackAdEvent } = useAdAnalytics();
    const navigate = useNavigate();
    const [targetUrl, setTargetUrl] = useState('');
    const [fetchedTitle, setFetchedTitle] = useState('');
    const [fetchedImage, setFetchedImage] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        trackAdEvent(lessonId, 'view', {
            purchaseId,
            customerEmail,
            courseId,
            metadata: { type: settings.type }
        });

        async function fetchDetails() {
            if (settings.type === 'custom' && settings.link_url) {
                setTargetUrl(settings.link_url);
                return;
            }

            if (settings.type === 'booking' && settings.booking_event_type_id) {
                const { data: eventData } = await supabase
                    .from('event_types')
                    .select('title, slug, user_id')
                    .eq('id', settings.booking_event_type_id)
                    .maybeSingle();

                console.log('Ad fetch - Event:', eventData);

                if (eventData) {
                    setFetchedTitle(eventData.title);
                    // Fetch username
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', eventData.user_id)
                        .maybeSingle();

                    console.log('Ad fetch - Profile:', profileData, profileError);

                    if (profileData?.username) {
                        setTargetUrl(`/book/${profileData.username}/${eventData.slug}`);
                    } else {
                        console.warn('Ad fetch - No username found for user', eventData.user_id);
                    }
                }
            } else if (settings.type === 'product' && settings.product_id) {
                const { data: productData, error: productError } = await supabase
                    .from('digital_products')
                    .select('title, slug, user_id') // Removed image_url
                    .eq('id', settings.product_id)
                    .maybeSingle();

                console.log('Ad fetch - Product:', productData, productError);

                if (productData) {
                    setFetchedTitle(productData.title);
                    // if (productData.image_url) setFetchedImage(productData.image_url); // Removed since column missing

                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', productData.user_id)
                        .maybeSingle();

                    console.log('Ad fetch - Product Profile:', profileData, profileError);

                    if (profileData?.username) {
                        setTargetUrl(`/store/${profileData.username}/${productData.slug}`);
                    } else {
                        console.warn('Ad fetch - No username found for product owner', productData.user_id);
                    }
                }
            }
        }

        fetchDetails();
    }, [isOpen, lessonId, settings]);

    const handleAction = () => {
        console.log('Ad Action Clicked. Target URL:', targetUrl);
        trackAdEvent(lessonId, 'click', {
            purchaseId,
            customerEmail,
            courseId,
            metadata: { type: settings.type }
        });

        if (!targetUrl) {
            toast.error("Link unavailable. The instructor may need to set their username.");
            return;
        }

        if (targetUrl) {
            // Check if internal or external
            if (targetUrl.startsWith('http')) {
                window.open(targetUrl, '_blank');
            } else {
                // If it's an internal route, we can use navigate or window.open
                // Using window.open for ads is usually better to keep course open
                window.open(window.location.origin + targetUrl, '_blank');
            }
        }

        onClose();
    };

    if (!isOpen) return null;

    const displayHeadline = settings.headline || fetchedTitle;
    const displayBanner = settings.banner_url || fetchedImage;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-zinc-800 text-white gap-0 [&>button[aria-label='Close']]:hidden">
                <VisuallyHidden>
                    <DialogTitle>{displayHeadline || 'Special Offer'}</DialogTitle>
                    <DialogDescription>{settings.body || 'Check out this offer'}</DialogDescription>
                </VisuallyHidden>

                {/* Custom Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Banner Image */}
                {displayBanner && (
                    <div className="w-full aspect-video bg-zinc-900 relative">
                        <img
                            src={displayBanner}
                            alt={displayHeadline}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    </div>
                )}

                <div className="p-6 pt-4 space-y-4 relative">
                    {/* Content */}
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-bold leading-tight">{displayHeadline}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            {settings.body}
                        </p>
                    </div>

                    {/* Action Button */}
                    <Button
                        size="lg"
                        className="w-full font-bold gap-2 text-base h-12"
                        onClick={handleAction}
                    >
                        {settings.type === 'custom' && <ExternalLink className="w-4 h-4" />}
                        {settings.type === 'product' && <ShoppingBag className="w-4 h-4" />}
                        {settings.type === 'booking' && <Calendar className="w-4 h-4" />}
                        {settings.button_text || 'Learn More'}
                    </Button>

                    <button
                        onClick={onClose}
                        className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2"
                    >
                        No thanks, continue
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
