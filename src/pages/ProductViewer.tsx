import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, AlertCircle, Lock, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - use local copy from public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function ProductViewer() {
    const { accessToken } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [productTitle, setProductTitle] = useState('Digital Product');
    const [customerEmail, setCustomerEmail] = useState('');
    const [brandName, setBrandName] = useState('');
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.2);
    const viewStartTime = useRef<number>(Date.now());
    const analyticsId = useRef<string | null>(null);
    const [isBlurred, setIsBlurred] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Screenshot detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsBlurred(true);
                setTimeout(() => setIsBlurred(false), 500);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'PrintScreen' ||
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
                (e.ctrlKey && e.shiftKey && e.key === 'S')
            ) {
                setIsBlurred(true);
                setTimeout(() => setIsBlurred(false), 1000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Disable right-click, text selection, and shortcuts
    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('selectstart', preventDefault);
        document.addEventListener('dragstart', preventDefault);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'U') ||
                (e.ctrlKey && e.key === 'S') ||
                (e.ctrlKey && e.key === 'P') ||
                e.key === 'F12'
            ) {
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('selectstart', preventDefault);
            document.removeEventListener('dragstart', preventDefault);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        async function loadContent() {
            if (!accessToken) {
                setError("Invalid access token");
                setLoading(false);
                return;
            }

            try {
                const { data: purchase, error: purchaseError } = await supabase
                    .from('product_purchases')
                    .select('*, product:digital_products(*)')
                    .eq('access_token', accessToken)
                    .eq('status', 'paid')
                    .maybeSingle();

                if (purchaseError || !purchase) {
                    throw new Error("Invalid or expired access link.");
                }

                setProductTitle(purchase.product?.title || 'Document');
                setCustomerEmail(purchase.customer_email || '');

                // Fetch seller's branding for watermark
                if (purchase.product?.user_id) {
                    const { data: branding } = await supabase
                        .from('branding_settings')
                        .select('brand_name, is_enabled')
                        .eq('user_id', purchase.product.user_id)
                        .single();

                    if (branding?.is_enabled && branding?.brand_name) {
                        setBrandName(branding.brand_name);
                    } else {
                        // Fallback to profile name if branding not enabled
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name')
                            .eq('user_id', purchase.product.user_id)
                            .single();
                        setBrandName(profile?.name || 'Licensed Content');
                    }
                }

                const { data: accessData, error: accessError } = await supabase.functions.invoke('secure-product-access', {
                    body: { accessToken }
                });

                if (accessError || !accessData?.url) {
                    throw new Error(accessError?.message || "Failed to authorize access");
                }

                setFileUrl(accessData.url);

                // Log the view and save the analytics ID
                const { data: analyticsRecord } = await supabase
                    .from('product_analytics')
                    .insert({
                        purchase_id: purchase.id,
                        device_info: navigator.userAgent
                    })
                    .select('id')
                    .single();

                if (analyticsRecord) {
                    analyticsId.current = analyticsRecord.id;
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to load content");
            } finally {
                setLoading(false);
            }
        }

        loadContent();

        // Update duration periodically and on page unload
        const updateDuration = async () => {
            if (analyticsId.current) {
                const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
                if (duration > 3) {
                    try {
                        await supabase
                            .from('product_analytics')
                            .update({ duration_seconds: duration })
                            .eq('id', analyticsId.current);
                        console.log('View duration updated:', duration, 'seconds');
                    } catch (e) {
                        console.error('Failed to update duration:', e);
                    }
                }
            }
        };

        // Periodic update every 30 seconds
        const intervalId = setInterval(updateDuration, 30000);

        // Also update on visibility change (tab switch, minimize)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                updateDuration();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            updateDuration();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [accessToken]);

    // Set initial scale based on window width
    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            if (width < 640) { // Mobile
                setScale(0.7);
            } else if (width < 1024) { // Tablet
                setScale(1.0);
            } else {
                setScale(1.2);
            }
        };
        updateScale();
        // window.addEventListener('resize', updateScale); // Optional: update on resize
        // return () => window.removeEventListener('resize', updateScale);
    }, []);

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-zinc-400">Securing your content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button variant="outline" onClick={() => navigate('/guest')}>Go to My Library</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-zinc-900 overflow-hidden select-none">
            {/* Header */}
            <div className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-3 sm:px-4 z-10 shrink-0">
                <div className="flex items-center gap-2 text-zinc-200 overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 text-zinc-400 hover:text-white"
                        onClick={() => navigate('/guest')}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="font-medium text-xs sm:text-sm truncate">{productTitle}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-[10px] sm:text-xs text-zinc-500 whitespace-nowrap">
                        {pageNumber} / {numPages}
                    </span>
                    <div className="flex">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setScale(s => Math.min(3.0, s + 0.1))}
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* PDF Viewer */}
            <div ref={containerRef} className="flex-1 relative overflow-auto bg-zinc-800">
                {fileUrl && (
                    <div className={`flex flex-col items-center py-8 min-h-full transition-all ${isBlurred ? 'blur-xl' : ''}`}>
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<Loader2 className="w-8 h-8 animate-spin text-primary" />}
                            error={<p className="text-destructive">Failed to load PDF</p>}
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-2xl"
                            />
                        </Document>
                    </div>
                )}

                {/* Screenshot Blur Warning */}
                {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
                        <div className="text-center text-white">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-semibold">Content Protected</p>
                            <p className="text-sm text-zinc-300">Screenshots are monitored</p>
                        </div>
                    </div>
                )}

                {/* Dynamic Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none z-40 opacity-[0.04] flex flex-wrap content-around justify-around overflow-hidden" style={{ gap: '80px' }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="-rotate-45 text-xl font-bold text-white whitespace-nowrap select-none uppercase tracking-wider">
                            {brandName || 'LICENSED CONTENT'}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="h-14 sm:h-16 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center gap-3 sm:gap-4 shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9"
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                <div className="bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">
                        {pageNumber} / {numPages}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9"
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Terms Footer */}
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 rounded-full px-3 py-1 text-[10px] sm:text-xs text-zinc-400 pointer-events-none whitespace-nowrap max-w-[90vw] truncate">
                Licensed to {customerEmail} • {brandName}
            </div>

            {/* Disable print */}
            <style>{`
                @media print { body { display: none !important; } }
            `}</style>
        </div>
    );
}
