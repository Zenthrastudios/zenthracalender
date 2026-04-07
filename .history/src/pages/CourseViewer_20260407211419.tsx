import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LessonAdSettings } from '@/hooks/useCourses';
import {
    Loader2,
    AlertCircle,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    GraduationCap,
    Settings,
    Gauge,
    Monitor,
    Home,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ViewerResources from '@/components/course/ViewerResources';
import LessonAdPopup from '@/components/course/LessonAdPopup';

// Detect iOS — all iOS browsers (Safari, Chrome, Firefox) use WebKit/WKWebView
// and share the same video playback restrictions (CORS cache, canvas, autoplay policy).
// iPadOS 13+ reports as MacIntel with touch support.
const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// Simple hook for media query — initialised synchronously to avoid a false-`false`
// on the first render, which would flash the desktop/canvas path on mobile devices.
function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [query]);

    return matches;
}

// Cast supabase for new tables
const db = supabase as any;

interface CourseData {
    id: string;
    title: string;
    slug: string; // Added slug from usage
    thumbnail_url: string | null;
    user_id: string;
}

interface LessonData {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    video_duration: number;
    order_index: number;
    is_preview: boolean;
    ad_settings: LessonAdSettings | null;
}

interface ProgressData {
    id: string;
    purchase_id: string;
    lesson_id: string;
    progress_seconds: number;
    is_completed: boolean;
    last_watched_at: string;
}

interface PurchaseData {
    id: string;
    customer_email: string;
    course: CourseData;
}

// ==================== CANVAS LOGIC (RENDER & PROTECT) ====================
function CanvasLogic({ videoRef, isPlaying, setSecurityWarning }: { videoRef: any, isPlaying: boolean, setSecurityWarning: (w: boolean) => void }) {
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // 1. EXTENSION & RECORDER DETECTOR
    useEffect(() => {
        // List of known recording tool classes/IDs
        const BLOCKED_SELECTORS = [
            '#loom-companion-mv3',
            'loom-container',
            'div[class*="loom"]',
            'div[class*="screenity"]',
            '#screenity-ui',
            '.drift-widget-container',
            '[data-locator-id]', // Often used by automated tools
            '#recorder-ui-overlay'
        ];

        const checkForRecorders = () => {
            for (const selector of BLOCKED_SELECTORS) {
                if (document.querySelector(selector)) {
                    console.warn("Screen recorder detected:", selector);
                    setSecurityWarning(true);
                    return true;
                }
            }
            return false;
        };

        const observer = new MutationObserver((mutations) => {
            let found = false;
            mutations.forEach((mutation) => {
                if (found) return;
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        // Check for suspicious full-screen or fixed elements
                        const style = window.getComputedStyle(node);
                        const isOverlay = style.position === 'fixed' || style.position === 'absolute';
                        const isHighZ = parseInt(style.zIndex) > 1000;

                        // Check specifically for the "red pill" UI (likely high Z, fixed, top/bottom)
                        if (isOverlay && isHighZ && node.innerText && node.innerText.match(/\d\d:\d\d/)) {
                            // Likely a timer overlay
                            found = true;
                        }

                        // Check known classes
                        const className = node.className.toString();
                        if (className.includes('loom') || className.includes('recorder') || className.includes('screenity')) {
                            found = true;
                        }
                    }
                });
            });

            if (found || checkForRecorders()) {
                setSecurityWarning(true);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial check
        const interval = setInterval(checkForRecorders, 2000);

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);

    // 2. VIEWPORT MONITOR (Detects "Sharing" banners)
    useEffect(() => {
        let lastHeight = window.innerHeight;
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            // Native sharing banners often push content down by ~30-50px without changing outerHeight
            // Normal resize changes outerHeight too usually? Not always.
            // But sudden small height drop often means a banner appeared.
            const diff = lastHeight - currentHeight;
            if (diff > 20 && diff < 100 && window.outerHeight === window.outerHeight) {
                // Suspicious resize
                // setSecurityWarning(true); // Can be too sensitive
            }
            lastHeight = currentHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 3. RENDER LOOP
    const animate = (time: number) => {
        if (videoRef.current && videoRef.current.parentElement) {
            // Find sibling canvas (the one rendered in parent)
            const canvas = videoRef.current.nextElementSibling as HTMLCanvasElement;
            if (canvas && (canvas as any)._ctx) {
                const ctx = (canvas as any)._ctx as CanvasRenderingContext2D;
                const video = videoRef.current;

                // Update canvas size if needed (responsive)
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    if (video.videoWidth) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                    }
                }

                // Draw frame whenever data is available (playing OR paused) so fullscreen shows current frame
                if (video.readyState >= 2) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    return null;
}

export default function CourseViewer() {
    const { accessToken } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purchase, setPurchase] = useState<PurchaseData | null>(null);
    const [lessons, setLessons] = useState<LessonData[]>([]);
    const [progress, setProgress] = useState<ProgressData[]>([]);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [brandName, setBrandName] = useState('');
    const [securityWarning, setSecurityWarning] = useState(false);

    // Ad Popup State
    const [showAdPopup, setShowAdPopup] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);

    // Use native <video> (not canvas) on mobile screens OR any iOS device.
    // iOS must never hit the canvas path: WebKit blocks crossOrigin video→canvas drawing
    // and the hidden crossOrigin video poisons the CORS cache for the same URLs.
    const isMobileScreen = useMediaQuery('(max-width: 1024px)');
    const isMobile = isMobileScreen || isIOS;

    // Video player state
    const videoRef = useRef<HTMLVideoElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [currentQuality, setCurrentQuality] = useState('Auto');
    const [settingsView, setSettingsView] = useState<'main' | 'speed' | 'quality'>('main');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);
    const durationLoadedRef = useRef<Set<string>>(new Set());
    const [lessonThumbnails, setLessonThumbnails] = useState<Record<string, string>>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Current lesson must be defined before videoStreamUrl
    const currentLesson = lessons[currentLessonIndex];

    // Video stream URL — points to our edge function which:
    //  1. Verifies the purchase (only paid users)
    //  2. Fetches from R2 with proper SigV4 auth (bypasses public access 403)
    //  3. Adds CORS headers (fixes iOS Safari cross-origin video loading)
    //  4. Forwards Range requests for video seeking
    const SUPABASE_FN_URL = 'https://zlhbzlxxdezlrtzljpni.supabase.co/functions/v1/video-access';
    const videoStreamUrl = currentLesson?.id && accessToken
        ? `${SUPABASE_FN_URL}?lessonId=${currentLesson.id}&token=${accessToken}`
        : null;

    // ==================== SECURITY PROTECTIONS ====================



    // ==================== ULTRA SECURITY PROTECTION ====================
    useEffect(() => {
        // 1. Aggressive Key Interception
        const preventScreenshotKeys = (e: KeyboardEvent) => {
            const isRestrictedKey =
                (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) ||
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac Cmd+Shift+3/4/5
                (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) || // Win+Shift+S (if meta mapped)
                (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) || // Common save/record shortcuts
                (e.key === 'F12') ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') || // DevTools
                (e.metaKey && (e.key === 'g' || e.key === 'G')) || // Win + G (Game Bar)
                (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R')); // Win + Alt + R (Game Bar Record)

            if (isRestrictedKey) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                setSecurityWarning(true);
                return false;
            }

            // PRE-EMPTIVE BLACKOUT: If Windows/Meta key is pressed, hide content immediately
            // This protects against ANY Win+Shortcut before it happens
            if (e.key === 'Meta' || e.key === 'OS') {
                if (contentRef.current) {
                    contentRef.current.style.opacity = '0';
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Restore content when Windows key is released
            if (e.key === 'Meta' || e.key === 'OS') {
                if (contentRef.current) {
                    contentRef.current.style.opacity = '1';
                }
            }
        };

        // Attach to window and document with CAPTURE phase (runs first!)
        window.addEventListener('keydown', preventScreenshotKeys, { capture: true });
        window.addEventListener('keyup', handleKeyUp, { capture: true }); // Separate handler for restore
        document.addEventListener('keydown', preventScreenshotKeys, { capture: true });
        document.addEventListener('keyup', handleKeyUp, { capture: true });

        // Override onkeydown as a backup
        const originalOnKeyDown = window.onkeydown;
        window.onkeydown = (e) => {
            // @ts-ignore
            if (preventScreenshotKeys(e) === false) return false;
            // @ts-ignore
            if (originalOnKeyDown) return originalOnKeyDown(e);
        };

        // 2. High-Frequency Focus Monitor (Anti-Snipping Tool / OS Record)
        // OS tools often steal focus for 10-50ms when activated.
        // Increased frequency to 16ms (approx 1 frame) to catch even faster focus switches
        let lastFocusTime = Date.now();
        const focusCheckInterval = setInterval(() => {
            const now = Date.now();
            const isFocused = document.hasFocus();

            // If we lost focus and it's been less than 100ms since we last checked/had focus
            if (!isFocused && (now - lastFocusTime) < 100) {
                // Suspicious focus loss - likely a tool activation like Game Bar
                if (isPlaying) {
                    // Pause and warn immediately
                    if (videoRef.current) videoRef.current.pause();
                    setIsPlaying(false);
                    setSecurityWarning(true);
                }
            }
            if (isFocused) {
                lastFocusTime = now;
            }
        }, 16);

        // 3. Blur & Visibility Prevention
        const handleBlur = () => {
            if (isPlaying) {
                // FORCE PAUSE immediately on blur
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
                setSecurityWarning(true);
            }
        };

        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) handleBlur();
        });

        // 4. Context Menu & Drag
        const preventDefault = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('dragstart', preventDefault);

        return () => {
            window.removeEventListener('keydown', preventScreenshotKeys, { capture: true });
            window.removeEventListener('keyup', handleKeyUp, { capture: true });
            document.removeEventListener('keydown', preventScreenshotKeys, { capture: true });
            document.removeEventListener('keyup', handleKeyUp, { capture: true });
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('dragstart', preventDefault);
            clearInterval(focusCheckInterval);
            window.onkeydown = originalOnKeyDown;
        };
    }, [isPlaying]);

    // 5. DevTools Detector (Resize-based)
    useEffect(() => {
        const checkDevTools = () => {
            const threshold = 160;
            if (
                (window.outerWidth - window.innerWidth > threshold) ||
                (window.outerHeight - window.innerHeight > threshold)
            ) {
                setSecurityWarning(true);
            }
        };
        window.addEventListener('resize', checkDevTools);
        return () => window.removeEventListener('resize', checkDevTools);
    }, []);

    // ==================== END SECURITY ====================

    // Fullscreen state sync
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement
            );
            setIsFullscreen(isFs);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // iOS / mobile: explicitly call load() when lesson changes so Safari picks up the new source
    useEffect(() => {
        if (!videoRef.current) return;
        
        // Reset loading state
        setIsVideoLoading(true);
        setCurrentTime(0);
        setDuration(0);
        
        // iOS requires explicit load() call for new sources
        videoRef.current.load();
        
        // iOS-specific: Force metadata preloading
        if (isIOS) {
            const video = videoRef.current;
            video.preload = 'metadata';
            
            // Add one-time loadstart listener for iOS
            const handleLoadStart = () => {
                console.log('iOS video loadstart');
                video.removeEventListener('loadstart', handleLoadStart);
            };
            video.addEventListener('loadstart', handleLoadStart);
        }
    }, [currentLessonIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clear canvas when switching lessons and handle thumbnail display
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Always clear to black first to remove any previous frame
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);

        // If we have a thumbnail for the current lesson, draw it
        const thumbnailUrl = currentLesson?.id ? lessonThumbnails[currentLesson.id] : null;
        if (thumbnailUrl && isVideoLoading) {
            const img = new Image();
            img.onload = () => {
                // Clear again and draw thumbnail
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);
                ctx.drawImage(img, 0, 0, canvas.width || 1280, canvas.height || 720);
            };
            img.onerror = () => {
                // If thumbnail fails to load, keep it black
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);
            };
            img.src = thumbnailUrl;
        }
    }, [currentLesson?.id, isVideoLoading, lessonThumbnails]);

    // Additional canvas clearing when lesson changes (immediate clear)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Immediately clear canvas when lesson changes to prevent frame sticking
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);
    }, [currentLessonIndex]);

    // Load course data
    useEffect(() => {
        async function loadCourse() {
            if (!accessToken) {
                setError('Invalid access link');
                setLoading(false);
                return;
            }

            try {
                // Get purchase with course
                const { data: purchaseData, error: purchaseError } = await db
                    .from('course_purchases')
                    .select(`
            id,
            customer_email,
            course:courses(id, title, thumbnail_url, user_id, slug)
          `)
                    .eq('access_token', accessToken)
                    .eq('status', 'paid')
                    .single();

                if (purchaseError || !purchaseData) {
                    throw new Error('Invalid or expired access link');
                }

                const courseData = purchaseData.course as CourseData;
                setPurchase({
                    id: purchaseData.id,
                    customer_email: purchaseData.customer_email,
                    course: courseData,
                });

                // Get lessons
                const { data: lessonsData, error: lessonsError } = await db
                    .from('course_lessons')
                    .select('*')
                    .eq('course_id', courseData.id)
                    .order('order_index', { ascending: true });

                if (lessonsError) throw lessonsError;
                setLessons(lessonsData as LessonData[]);

                // Get progress
                const { data: progressData } = await db
                    .from('course_progress')
                    .select('*')
                    .eq('purchase_id', purchaseData.id);

                if (progressData) {
                    setProgress(progressData as ProgressData[]);

                    // Find last watched lesson
                    const lastWatched = progressData
                        .filter((p: ProgressData) => !p.is_completed)
                        .sort(
                            (a: ProgressData, b: ProgressData) =>
                                new Date(b.last_watched_at).getTime() -
                                new Date(a.last_watched_at).getTime()
                        )[0];

                    if (lastWatched) {
                        const lessonIndex = lessonsData.findIndex(
                            (l: LessonData) => l.id === lastWatched.lesson_id
                        );
                        if (lessonIndex !== -1) {
                            setCurrentLessonIndex(lessonIndex);
                        }
                    }
                }

                // Get branding
                if (courseData.user_id) {
                    const { data: branding } = await supabase
                        .from('branding_settings')
                        .select('brand_name, is_enabled')
                        .eq('user_id', courseData.user_id)
                        .single();

                    if (branding?.is_enabled && branding?.brand_name) {
                        setBrandName(branding.brand_name);
                    } else {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name')
                            .eq('user_id', courseData.user_id)
                            .single();
                        setBrandName(profile?.name || 'Course');
                    }
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load course');
            } finally {
                setLoading(false);
            }
        }

        loadCourse();
    }, [accessToken]);

    // Sync currentLessonIndex from URL on initial deep-link load
    useEffect(() => {
        if (lessons.length === 0) return;
        const lessonId = searchParams.get('lessonId');
        if (!lessonId) return;
        const index = lessons.findIndex(l => l.id === lessonId);
        if (index !== -1 && index !== currentLessonIndex) {
            setCurrentLessonIndex(index);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [lessons.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Preload duration + first-frame thumbnail for every lesson
    useEffect(() => {
        if (lessons.length === 0) return;
        lessons.forEach(lesson => {
            if (!lesson.video_url || durationLoadedRef.current.has(lesson.id)) return;
            durationLoadedRef.current.add(lesson.id);

            const generateThumbnail = () => {
                const vid = document.createElement('video');
                vid.preload = 'metadata';
                vid.muted = true;
                vid.crossOrigin = 'anonymous'; // Try with CORS first
                
                // Use video stream URL for better thumbnail extraction
                const streamUrl = accessToken 
                    ? `${SUPABASE_FN_URL}?lessonId=${lesson.id}&token=${accessToken}`
                    : lesson.video_url;
                vid.src = streamUrl;

                vid.onloadedmetadata = () => {
                    // Fill in missing duration
                    const dur = Math.floor(vid.duration);
                    if (dur > 0) {
                        setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, video_duration: dur } : l));
                    }

                    // Attempt to capture first frame
                    vid.currentTime = 0.5; // Slightly later to avoid black frame
                };

                vid.onseeked = () => {
                    try {
                        const tc = document.createElement('canvas');
                        tc.width = 320;
                        tc.height = 180;
                        const ctx = tc.getContext('2d');
                        if (ctx && vid.videoWidth > 0 && vid.videoHeight > 0) {
                            ctx.drawImage(vid, 0, 0, 320, 180);
                            const dataUrl = tc.toDataURL('image/jpeg', 0.8);
                            if (dataUrl && dataUrl !== 'data:,' && !dataUrl.includes('data:,')) {
                                setLessonThumbnails(prev => ({ ...prev, [lesson.id]: dataUrl }));
                                console.log(`Generated thumbnail for lesson ${lesson.id}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to generate thumbnail for lesson ${lesson.id}:`, error);
                        // Fallback: try without CORS
                        fallbackThumbnail();
                    }
                    vid.src = '';
                };

                vid.onerror = () => {
                    console.warn(`Video error for lesson ${lesson.id}, trying fallback`);
                    fallbackThumbnail();
                };

                const fallbackThumbnail = () => {
                    // Try again without CORS and with original URL
                    const fallbackVid = document.createElement('video');
                    fallbackVid.preload = 'metadata';
                    fallbackVid.muted = true;
                    // No crossOrigin for fallback
                    fallbackVid.src = lesson.video_url;

                    fallbackVid.onloadedmetadata = () => {
                        if (!isIOS) {
                            fallbackVid.currentTime = 0.5;
                        } else {
                            fallbackVid.src = '';
                        }
                    };

                    fallbackVid.onseeked = () => {
                        try {
                            const tc = document.createElement('canvas');
                            tc.width = 320;
                            tc.height = 180;
                            const ctx = tc.getContext('2d');
                            if (ctx && fallbackVid.videoWidth > 0) {
                                ctx.drawImage(fallbackVid, 0, 0, 320, 180);
                                const dataUrl = tc.toDataURL('image/jpeg', 0.8);
                                if (dataUrl && dataUrl !== 'data:,') {
                                    setLessonThumbnails(prev => ({ ...prev, [lesson.id]: dataUrl }));
                                }
                            }
                        } catch (_e) {
                            // Final fallback: no thumbnail
                            console.warn(`Final thumbnail generation failed for lesson ${lesson.id}`);
                        }
                        fallbackVid.src = '';
                    };

                    fallbackVid.onerror = () => { fallbackVid.src = ''; };
                };
            };

            generateThumbnail();
        });
    }, [lessons.length, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

    // Log lesson view analytics
    useEffect(() => {
        if (purchase && currentLesson) {
            db.from('course_analytics').insert({
                purchase_id: purchase.id,
                lesson_id: currentLesson.id,
                device_info: navigator.userAgent,
            }).then(({ error }) => {
                if (error) console.error('Failed to log course analytics:', error);
            });
        }
    }, [currentLesson?.id]);

    const updateProgress = useCallback(async (lessonId: string, seconds: number, isCompleted: boolean) => {
        if (!purchase || !currentLesson) return;

        const progressData = {
            purchase_id: purchase.id,
            lesson_id: lessonId,
            progress_seconds: Math.floor(seconds),
            is_completed: isCompleted,
            last_watched_at: new Date().toISOString(),
        };

        await db.from('course_progress').upsert(progressData, { onConflict: 'purchase_id,lesson_id' });

        setProgress(prev => {
            const existing = prev.find(p => p.lesson_id === lessonId);
            if (existing) {
                return prev.map(p =>
                    p.lesson_id === lessonId ? { ...p, ...progressData } : p
                );
            }
            return [...prev, { id: 'temp', ...progressData }]; // 'temp' id for new local entries
        });
    }, [purchase, currentLesson]);

    // Video event handlers
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current && !isScrubbing) {
            const time = videoRef.current.currentTime;
            const videoDuration = videoRef.current.duration;
            setCurrentTime(time);

            // If user reaches 95% of the video, consider it midway completed/mostly finished
            // This handles cases where they might close the window just before the absolute end
            if (time > videoDuration * 0.95 && videoDuration > 0) {
                const lp = progress.find(p => p.lesson_id === currentLesson?.id);
                if (lp && !lp.is_completed && purchase) {
                    // Mark as complete in DB when threshold reached
                    updateProgress(currentLesson.id, videoDuration, true);
                }
            }
        }
    }, [currentLesson?.id, progress, purchase, currentLesson, updateProgress, isScrubbing]);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            const vidDuration = videoRef.current.duration;
            
            // iOS sometimes reports NaN or 0 initially, retry if needed
            if (isIOS && (!vidDuration || isNaN(vidDuration) || vidDuration === 0)) {
                console.log('iOS: Invalid duration, retrying metadata load');
                setTimeout(() => {
                    if (videoRef.current) {
                        const retryDuration = videoRef.current.duration;
                        if (retryDuration && !isNaN(retryDuration) && retryDuration > 0) {
                            setDuration(retryDuration);
                            console.log('iOS: Duration loaded on retry:', retryDuration);
                        }
                    }
                }, 500);
                return;
            }
            
            setDuration(vidDuration);
            setIsVideoLoading(false);
            console.log('Video metadata loaded, duration:', vidDuration);

            if (currentLesson && (currentLesson.video_duration === 0 || !currentLesson.video_duration)) {
                setLessons(prev => prev.map(l =>
                    l.id === currentLesson.id ? { ...l, video_duration: Math.floor(vidDuration) } : l
                ));
            }

            const lessonProgress = progress.find((p) => p.lesson_id === currentLesson?.id);
            if (lessonProgress && lessonProgress.progress_seconds > 0) {
                // iOS: Set currentTime after a brief delay to ensure video is ready
                if (isIOS) {
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = lessonProgress.progress_seconds;
                        }
                    }, 100);
                } else {
                    videoRef.current.currentTime = lessonProgress.progress_seconds;
                }
            }
        }
    }, [currentLesson?.id, progress, setLessons, currentLesson]);

    const goToLesson = useCallback((index: number) => {
        if (index >= 0 && index < lessons.length) {
            // Save current progress first
            if (purchase && currentLesson && videoRef.current) {
                const seconds = Math.floor(videoRef.current.currentTime);
                if (seconds > 5) {
                    updateProgress(currentLesson.id, seconds, false);
                }
            }

            // Immediately clear canvas to prevent frame sticking
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);
                }
            }

            // Explicitly pause and clear video before switching
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
                // Force a brief black screen
                if (!isMobile) {
                    videoRef.current.style.opacity = '0';
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.style.opacity = '1';
                        }
                    }, 100);
                }
            }

            const nextLesson = lessons[index];
            if (nextLesson) {
                setSearchParams(prev => {
                    prev.set('lessonId', nextLesson.id);
                    return prev;
                });
            }

            // Reset all video states immediately
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setIsVideoLoading(true);
            
            // Switch the lesson index last to trigger proper re-renders
            setCurrentLessonIndex(index);
        }
    }, [lessons, purchase, currentLesson, updateProgress, setSearchParams, isMobile]);

    const handleVideoEnd = useCallback(async () => {
        setIsPlaying(false);

        if (currentLesson) {
            // 1. Mark as completed
            if (!getLessonProgress(currentLesson.id)?.is_completed) {
                await updateProgress(currentLesson.id, duration, true);
            }

            // 2. Check for Ad
            if (currentLesson.ad_settings?.enabled) {
                setShowAdPopup(true);
                return;
            }

            // 3. Auto-advance if no ad
            if (currentLessonIndex < lessons.length - 1) {
                setTimeout(() => goToLesson(currentLessonIndex + 1), 1500);
            }
        }
    }, [purchase, currentLesson, currentLessonIndex, lessons.length, duration, updateProgress, goToLesson]);

    // Save progress periodically with local state update
    useEffect(() => {
        if (!purchase || !currentLesson || !isPlaying) return;

        progressUpdateRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            const seconds = Math.floor(videoRef.current.currentTime);

            if (seconds > 0) {
                await updateProgress(currentLesson.id, seconds, false);
            }
        }, 10000); // Save every 10 seconds

        return () => {
            if (progressUpdateRef.current) {
                clearInterval(progressUpdateRef.current);
            }
        };
    }, [purchase, currentLesson, isPlaying, updateProgress]);

    // Controls visibility
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    }, [isPlaying]);

    // Playback controls - Simplified for iOS compatibility
    const togglePlay = () => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        console.log('togglePlay called - isPlaying:', isPlaying, 'readyState:', video.readyState);
        
        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
            return;
        }

        // For iOS: Simple, direct play attempt
        if (isIOS) {
            console.log('iOS: Attempting direct play - src:', video.src);
            
            // Ensure video is loaded
            if (!video.src || video.readyState < 1) {
                console.log('iOS: Loading video first');
                video.load();
                
                // Wait for loadeddata then play
                const onLoadedData = () => {
                    video.removeEventListener('loadeddata', onLoadedData);
                    console.log('iOS: Video loaded, attempting play');
                    
                    video.play()
                        .then(() => {
                            console.log('iOS: Play successful after load');
                            setIsPlaying(true);
                            setSecurityWarning(false);
                        })
                        .catch((err: Error) => {
                            console.error('iOS: Play failed after load:', err.name, err.message);
                            setIsPlaying(false);
                        });
                };
                
                video.addEventListener('loadeddata', onLoadedData);
                return;
            }

            // Direct play attempt
            video.play()
                .then(() => {
                    console.log('iOS: Direct play successful');
                    setIsPlaying(true);
                    setSecurityWarning(false);
                })
                .catch((err: Error) => {
                    console.error('iOS: Direct play failed:', err.name, err.message);
                    setIsPlaying(false);
                    
                    // Try one more time with explicit load
                    video.load();
                    setTimeout(() => {
                        video.play()
                            .then(() => {
                                console.log('iOS: Retry play successful');
                                setIsPlaying(true);
                            })
                            .catch((retryErr: Error) => {
                                console.error('iOS: Retry play also failed:', retryErr.name, retryErr.message);
                                setIsPlaying(false);
                            });
                    }, 100);
                });
        } else {
            // Desktop play logic
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setSecurityWarning(false);
                        console.log('Desktop: Video play successful');
                    })
                    .catch((err: Error) => {
                        console.warn('Desktop: Video play() rejected:', err.message, err.name);
                        setIsPlaying(false);
                    });
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const seek = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
                0,
                Math.min(duration, currentTime + seconds)
            );
        }
    };

    const toggleFullscreen = () => {
        const container = playerContainerRef.current;
        if (!container) return;

        if (!isFullscreen) {
            try {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if ((container as any).webkitRequestFullscreen) {
                    (container as any).webkitRequestFullscreen();
                } else if ((container as any).msRequestFullscreen) {
                    (container as any).msRequestFullscreen();
                } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
                    // iOS native fullscreen — video is already visible on mobile
                    const vid = videoRef.current;
                    const onEndFs = () => {
                        setIsFullscreen(false);
                        vid.removeEventListener('webkitendfullscreen', onEndFs);
                    };
                    vid.addEventListener('webkitendfullscreen', onEndFs);
                    (vid as any).webkitEnterFullscreen();
                }
            } catch (err) {
                console.error("Fullscreen error:", err);
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                }
            } catch (err) {
                console.error("Exit fullscreen error:", err);
            }
        }
    };

    const handlePlaybackRateChange = (rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    const handleScrubStart = () => {
        setIsScrubbing(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };

    const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    const handleScrubEnd = () => {
        setIsScrubbing(false);
        if (isPlaying) {
            showControlsTemporarily(); // Restart hiding timer
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getLessonProgress = (lessonId: string) => {
        return progress.find((p) => p.lesson_id === lessonId);
    };



    const completedCount = progress.filter((p) => p.is_completed).length;

    // Calculate granular overall progress (midway tracking)
    const overallProgress = useMemo(() => {
        if (lessons.length === 0) return 0;
        const totalPossibleProgress = lessons.length * 100;
        const currentTotalProgress = lessons.reduce((sum, lesson) => {
            const lp = progress.find(p => p.lesson_id === lesson.id);
            if (!lp) return sum;
            if (lp.is_completed) return sum + 100;
            const lessonDuration = lesson.video_duration || 1;
            const midwayPercent = Math.min(99, (lp.progress_seconds / lessonDuration) * 100);
            return sum + midwayPercent;
        }, 0);
        return (currentTotalProgress / totalPossibleProgress) * 100;
    }, [lessons, progress]);

    const toggleSettings = () => {
        if (!showSettings) {
            setSettingsView('main');
            setShowSettings(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setShowControls(true);
        } else {
            setShowSettings(false);
            showControlsTemporarily();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-zinc-400">Loading your course...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4 p-4">
                <div className="p-4 bg-red-500/20 rounded-full">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <h1 className="text-xl font-bold">Access Denied</h1>
                <p className="text-zinc-400 text-center max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <>
            <div
                className="flex flex-col h-screen bg-black text-white font-sans selection:bg-primary/30 overflow-hidden select-none"
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Desktop Header - Global Full Width */}
                <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-white/5 bg-zinc-950 z-30 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-px h-6 bg-white/10" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => window.location.href = '/guest'}
                        >
                            <Home className="w-5 h-5" />
                        </Button>
                        <div className="w-px h-6 bg-white/10" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        <div className="w-px h-6 bg-white/10" />
                        <div>
                            <h1 className="font-semibold text-zinc-100 line-clamp-1 max-w-md">{currentLesson?.title || 'Course Viewer'}</h1>
                            <p className="text-xs text-zinc-500">
                                {purchase?.course.title} • Lesson {currentLessonIndex + 1} of {lessons.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {currentLesson && (
                            <ViewerResources
                                lessonId={currentLesson.id}
                                lessonTitle={currentLesson.title}
                            />
                        )}
                        <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 rounded-lg p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={currentLessonIndex === 0}
                                onClick={() => goToLesson(currentLessonIndex - 1)}
                                className="h-8 text-zinc-400 hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                            </Button>
                            <div className="w-px h-4 bg-white/10" />
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={currentLessonIndex === lessons.length - 1}
                                onClick={() => goToLesson(currentLessonIndex + 1)}
                                className="h-8 text-zinc-400 hover:text-white"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Main Content Area (Video + Details) */}
                    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 bg-black">

                        {/* Video Player Section */}
                        {/* On Desktop: We want it to be large but constrained if needed, or full width container */}
                        <div
                            ref={playerContainerRef}
                            className={cn(
                                "flex-shrink-0 bg-black relative w-full group",
                                "aspect-video lg:w-full lg:max-h-[80vh] lg:aspect-video mx-auto"
                            )}>
                            {(currentLesson?.video_url) ? (
                                <>
                                    <div ref={contentRef} className="absolute inset-0 w-full h-full transition-opacity duration-75">

                                        {isMobile ? (
                                            /* ── MOBILE / iOS: native <video>, NO crossOrigin attr.
                                               iOS Safari blocks video loading entirely when crossOrigin
                                               is set but the response Origin doesn't exactly match.
                                               We don't need canvas access on mobile so we skip it. ── */
                                            <video
                                                key={videoStreamUrl || currentLesson.id}
                                                ref={videoRef}
                                                src={videoStreamUrl || undefined}
                                                poster={purchase?.course.thumbnail_url || undefined}
                                                className={cn(
                                                    "w-full h-full object-contain bg-black cursor-pointer",
                                                    securityWarning && "blur-2xl opacity-10"
                                                )}
                                                onTimeUpdate={handleTimeUpdate}
                                                onLoadedMetadata={handleLoadedMetadata}
                                                onEnded={handleVideoEnd}
                                                onPlay={() => {
                                                    console.log('Video play event - setting isPlaying to true');
                                                    setIsPlaying(true);
                                                }}
                                                onPause={() => {
                                                    console.log('Video pause event - setting isPlaying to false');
                                                    setIsPlaying(false);
                                                }}
                                                onError={(e) => {
                                                    const vid = e.currentTarget;
                                                    const err = vid.error;
                                                    console.error('Mobile video error:', {
                                                        code: err?.code,
                                                        message: err?.message,
                                                        src: vid.src,
                                                        networkState: vid.networkState,
                                                        readyState: vid.readyState
                                                    });
                                                    setIsPlaying(false);
                                                    setIsVideoLoading(false);
                                                }}
                                                onLoadStart={() => {
                                                    console.log('Video loadstart - setting loading true');
                                                    setIsVideoLoading(true);
                                                }}
                                                onLoadedData={() => {
                                                    console.log('Video loadeddata - setting loading false');
                                                    setIsVideoLoading(false);
                                                }}
                                                onWaiting={() => {
                                                    console.log('Video waiting - setting loading true');
                                                    setIsVideoLoading(true);
                                                }}
                                                onCanPlay={() => {
                                                    console.log('Video canplay - setting loading false');
                                                    setIsVideoLoading(false);
                                                }}
                                                onCanPlayThrough={() => {
                                                    console.log('Video canplaythrough - setting loading false');
                                                    setIsVideoLoading(false);
                                                }}
                                                controlsList="nodownload noremoteplayback"
                                                disablePictureInPicture
                                                preload="metadata"
                                                playsInline
                                                autoPlay={false}
                                                muted={isMuted}
                                                // iOS-specific attributes for better compatibility
                                                {...(isIOS ? {
                                                    'webkit-playsinline': 'true',
                                                    'playsinline': 'true',
                                                    'x5-playsinline': 'true',
                                                    'x5-video-player-type': 'h5-page',
                                                    'x5-video-player-fullscreen': 'false'
                                                } : {})}
                                                // Multiple event handlers for iOS compatibility
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Video onClick event fired');
                                                    togglePlay();
                                                }}
                                                onTouchEnd={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Video onTouchEnd event fired');
                                                    togglePlay();
                                                }}
                                            />
                                        ) : (
                                            /* ── DESKTOP: hidden video + canvas (DRM protection) ── */
                                            <>
                                                <video
                                                    ref={videoRef}
                                                    src={videoStreamUrl || undefined}
                                                    className="hidden"
                                                    onTimeUpdate={handleTimeUpdate}
                                                    onLoadedMetadata={handleLoadedMetadata}
                                                    onEnded={handleVideoEnd}
                                                    onPlay={() => setIsPlaying(true)}
                                                    onPause={() => setIsPlaying(false)}
                                                    controlsList="nodownload noremoteplayback"
                                                    disablePictureInPicture
                                                    playsInline
                                                    preload="auto"
                                                    crossOrigin="anonymous"
                                                    onError={(e) => {
                                                        const vid = e.currentTarget;
                                                        const err = vid.error;
                                                        console.error('Desktop video error:', err?.code, err?.message, vid.src);
                                                        setIsPlaying(false);
                                                        setIsVideoLoading(false);
                                                    }}
                                                    onWaiting={() => setIsVideoLoading(true)}
                                                    onCanPlay={() => setIsVideoLoading(false)}
                                                />
                                                <canvas
                                                    ref={(ref) => {
                                                        (canvasRef as any).current = ref;
                                                        if (ref) {
                                                            const ctx = ref.getContext('2d', { alpha: false });
                                                            // @ts-ignore
                                                            ref._ctx = ctx;
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full h-full object-contain cursor-pointer",
                                                        securityWarning && "blur-2xl opacity-10"
                                                    )}
                                                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                                />
                                            </>
                                        )}

                                    </div>

                                    {/* RENDER LOOP & EXTENSION DETECTION — desktop only */}
                                    {!isMobile && (
                                        <CanvasLogic
                                            videoRef={videoRef}
                                            isPlaying={isPlaying}
                                            setSecurityWarning={setSecurityWarning}
                                        />
                                    )}

                                    {/* SECURITY OVERLAY */}
                                    {securityWarning && (
                                        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                                            <div className="bg-red-500/20 p-4 rounded-full mb-4">
                                                <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Recording Detected</h3>
                                            <p className="text-zinc-400 max-w-md text-sm mb-6">
                                                Please stop any screen recording software or browser extensions to continue watching.
                                                <br />
                                                Playback has been paused.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="border-white/10 hover:bg-white/10"
                                                onClick={() => {
                                                    setSecurityWarning(false);
                                                }}
                                            >
                                                Resume Playback
                                            </Button>
                                        </div>
                                    )}

                                    {/* Static Watermark (Always Visible) */}
                                    <div className="absolute top-4 right-4 z-20 opacity-20 pointer-events-none text-[10px] text-white/50 select-none">
                                        Protected Content • {purchase?.customer_email}
                                    </div>

                                    {!isMobile && (
                                        <div
                                            className="absolute inset-0 z-10 cursor-pointer text-transparent"
                                            onClick={togglePlay}
                                        />
                                    )}

                                    {/* Play/Pause Overlay */}
                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center z-30 transition-all duration-300 pointer-events-none",
                                        !isPlaying ? "bg-black/40 opacity-100" : "opacity-0"
                                    )}>
                                        {!isPlaying && (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl scale-100 hover:scale-110 transition-transform duration-200">
                                                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-2" fill="white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Controls Overlay */}
                                    <div
                                        className={cn(
                                            'absolute bottom-0 left-0 right-0 p-3 sm:p-6 transition-all duration-300 z-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent',
                                            showControls || !isPlaying || showSettings ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="group/progress relative h-1 sm:h-1.5 mb-3 cursor-pointer flex items-center">
                                            <input
                                                type="range"
                                                min={0}
                                                max={duration || 100}
                                                value={currentTime}
                                                onMouseDown={handleScrubStart}
                                                onTouchStart={handleScrubStart}
                                                onChange={handleScrubChange}
                                                onMouseUp={handleScrubEnd}
                                                onTouchEnd={handleScrubEnd}
                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                                            />
                                            <div className="absolute inset-0 bg-white/20 rounded-full" />
                                            <div
                                                className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-100"
                                                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                            >
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8" onClick={togglePlay}>
                                                    {isPlaying ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5" fill="white" />}
                                                </Button>

                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="text-white/80 hover:text-white w-8 h-8" onClick={() => seek(-10)}>
                                                        <SkipBack className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-white/80 hover:text-white w-8 h-8" onClick={() => seek(10)}>
                                                        <SkipForward className="w-4 h-4" />
                                                    </Button>

                                                    <div className="flex items-center gap-2 group/volume ml-2">
                                                        <Button variant="ghost" size="icon" className="text-white/80 hover:text-white w-8 h-8" onClick={toggleMute}>
                                                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                                        </Button>
                                                        <span className="text-xs font-medium text-zinc-300">
                                                            {formatTime(currentTime)} / {formatTime(duration)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    {showSettings && (
                                                        <>
                                                            {/* Backdrop to close settings */}
                                                            <div
                                                                className="fixed inset-0 z-40 cursor-default"
                                                                onClick={toggleSettings}
                                                            />

                                                            {/* YouTube-Style Settings Menu */}
                                                            <div className="absolute bottom-full right-0 mb-3 w-52 max-h-[160px] sm:max-h-[240px] overflow-y-auto scrollbar-none bg-zinc-900/95 border border-white/10 rounded-xl z-50 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">

                                                                {/* MAIN VIEW */}
                                                                {settingsView === 'main' && (
                                                                    <div className="py-1.5">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSettingsView('quality'); }}
                                                                            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/10 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                                                                                <span className="text-xs font-medium">Quality</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-zinc-500">
                                                                                <span className="text-[10px]">{currentQuality}</span>
                                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSettingsView('speed'); }}
                                                                            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/10 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                                                                                <span className="text-xs font-medium">Playback speed</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-zinc-500">
                                                                                <span className="text-[10px]">{playbackRate === 1 ? 'Normal' : playbackRate + 'x'}</span>
                                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* SPEED VIEW */}
                                                                {settingsView === 'speed' && (
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSettingsView('main'); }}
                                                                            className="w-full px-3 py-1.5 flex items-center gap-2 border-b border-white/5 hover:bg-white/5 transition-colors mb-1"
                                                                        >
                                                                            <ChevronLeft className="w-3.5 h-3.5" />
                                                                            <span className="text-xs font-semibold">Playback speed</span>
                                                                        </button>
                                                                        <div className="max-h-32 overflow-y-auto scrollbar-none">
                                                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                                                                <button
                                                                                    key={rate}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handlePlaybackRateChange(rate);
                                                                                        setSettingsView('main');
                                                                                    }}
                                                                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 transition-colors"
                                                                                >
                                                                                    <span className="text-xs ml-6">{rate === 1 ? 'Normal' : rate + 'x'}</span>
                                                                                    {playbackRate === rate && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* QUALITY VIEW */}
                                                                {settingsView === 'quality' && (
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSettingsView('main'); }}
                                                                            className="w-full px-3 py-1.5 flex items-center gap-2 border-b border-white/5 hover:bg-white/5 transition-colors mb-1"
                                                                        >
                                                                            <ChevronLeft className="w-3.5 h-3.5" />
                                                                            <span className="text-xs font-semibold">Quality</span>
                                                                        </button>
                                                                        <div className="max-h-32 overflow-y-auto scrollbar-none space-y-0.5">
                                                                            {['Auto', '1080p', '720p', '480p'].map((q) => (
                                                                                <button
                                                                                    key={q}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setCurrentQuality(q);
                                                                                        setSettingsView('main');
                                                                                    }}
                                                                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 transition-colors"
                                                                                >
                                                                                    <span className="text-xs ml-6">{q}</span>
                                                                                    {currentQuality === q && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <p className="px-9 py-1.5 text-[9px] text-zinc-500 leading-tight">
                                                                            Auto quality delivers the best experience for your connection.
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("text-white/80 hover:text-white w-8 h-8 transition-transform duration-200", showSettings && "rotate-45 text-white")}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSettings();
                                                        }}
                                                    >
                                                        <Settings className="w-5 h-5" />
                                                    </Button>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-white/80 hover:text-white w-8 h-8"
                                                    onClick={toggleFullscreen}
                                                >
                                                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900 border-b border-white/5">
                                    <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Video Unavailable</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop Details (Description etc) */}
                        <div className="hidden lg:block">
                            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase">
                                                    Episode {currentLessonIndex + 1}
                                                </span>
                                                <span className="text-zinc-500 text-sm">•</span>
                                                <span className="text-zinc-500 text-sm">{formatTime(currentLesson?.video_duration || 0)}</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-white leading-tight">{currentLesson?.title}</h2>
                                        </div>

                                        {currentLesson?.description && (
                                            <div className="bg-zinc-900/30 rounded-xl border border-white/5 p-6">
                                                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3">About this lesson</h3>
                                                <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
                                                    <div className={cn("relative", !showFullDescription && "max-h-24 overflow-hidden")}>
                                                        {currentLesson.description}
                                                        {!showFullDescription && currentLesson.description.length > 200 && (
                                                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                                                        )}
                                                    </div>
                                                    {currentLesson.description.length > 200 && (
                                                        <button
                                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                                            className="text-primary text-sm font-medium mt-2 hover:underline"
                                                        >
                                                            {showFullDescription ? 'Show less' : 'Show more'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Desktop Resources */}
                                        {currentLesson && (
                                            <ViewerResources
                                                lessonId={currentLesson.id}
                                                lessonTitle={currentLesson.title}
                                                variant="inline"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Content (Title, Actions, List) - Hidden on desktop */}
                        <div className="lg:hidden p-4 space-y-6 bg-zinc-950 pb-20">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-400 hover:text-white pl-0 h-auto"
                                    onClick={() => window.location.href = '/guest'}
                                >
                                    <Home className="w-4 h-4 mr-2" /> Back to Profile
                                </Button>
                                <div className="flex items-center gap-3">
                                    {currentLesson && (
                                        <ViewerResources
                                            lessonId={currentLesson.id}
                                            lessonTitle={currentLesson.title}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Title & Info Section */}
                            <div className="space-y-3">
                                <div>
                                    <h1 className="text-lg font-bold text-white leading-snug line-clamp-2">
                                        {currentLesson?.title}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-medium">
                                        <span className="bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded text-xs leading-none font-bold">EP {currentLessonIndex + 1}</span>
                                        <span>•</span>
                                        <span>{lessons.length} Episodes</span>
                                    </div>
                                </div>

                                {/* Mobile Nav */}
                                <div className="flex items-center gap-2 pb-2">
                                    <div className="flex-1" />
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={currentLessonIndex === 0}
                                        onClick={() => goToLesson(currentLessonIndex - 1)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 h-9"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={currentLessonIndex === lessons.length - 1}
                                        onClick={() => goToLesson(currentLessonIndex + 1)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 h-9"
                                    >
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>

                            {/* Mobile Description with Show More */}
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-white/5">
                                <h3 className="font-bold text-sm text-white mb-2">Description</h3>
                                <div className={cn("text-xs text-zinc-300 leading-relaxed", !showFullDescription && "line-clamp-3")}>
                                    {currentLesson?.description || "No description available."}
                                </div>
                                {currentLesson?.description && currentLesson.description.length > 100 && (
                                    <button
                                        onClick={() => setShowFullDescription(!showFullDescription)}
                                        className="text-[10px] font-bold text-white mt-1 uppercase tracking-wide opacity-70 hover:opacity-100"
                                    >
                                        {showFullDescription ? 'Show less' : '...more'}
                                    </button>
                                )}
                            </div>

                            {/* Resources Section */}
                            {currentLesson && (
                                <ViewerResources
                                    lessonId={currentLesson.id}
                                    lessonTitle={currentLesson.title}
                                    variant="inline"
                                />
                            )}

                            {/* Up Next - Mobile */}
                            {lessons.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-sm text-white mb-3 px-1">Up Next</h3>
                                    <div className="space-y-3">
                                        {lessons.map((lesson, index) => {
                                            const lessonProgress = getLessonProgress(lesson.id);
                                            const isCompleted = lessonProgress?.is_completed;
                                            const isCurrent = index === currentLessonIndex;

                                            return (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => {
                                                        goToLesson(index);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className={cn(
                                                        'w-full flex gap-3 p-3 rounded-xl text-left transition-all border',
                                                        isCurrent
                                                            ? 'bg-zinc-900 border-primary/30 shadow-sm'
                                                            : 'bg-transparent border-transparent hover:bg-zinc-900/50'
                                                    )}
                                                >
                                                    <div className="relative w-28 aspect-video bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                                                        {lessonThumbnails[lesson.id] ? (
                                                            <img src={lessonThumbnails[lesson.id]} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />
                                                        ) : (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800">
                                                                <div className="text-xs font-bold text-zinc-600">EP {index + 1}</div>
                                                                <div className="text-[9px] text-zinc-700 mt-0.5 line-clamp-1 px-1 text-center">{lesson.title}</div>
                                                            </div>
                                                        )}
                                                        {isCurrent && (
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                                    <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {isCompleted && (
                                                            <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                                                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[9px] font-medium text-white">
                                                            {formatTime(lesson.video_duration || 0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-1">
                                                        <h4 className={cn("text-xs font-bold leading-snug line-clamp-2", isCurrent ? "text-primary" : "text-zinc-200")}>
                                                            {lesson.title}
                                                        </h4>
                                                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                                                            {lesson.description || 'No description'}
                                                        </p>
                                                        {isCompleted && <span className="text-[10px] text-primary flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" /> Watched</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Desktop Lesson List */}
                    <aside
                        className={cn(
                            'hidden lg:flex flex-col w-96 border-l border-white/5 bg-zinc-950 flex-shrink-0 transition-all duration-300',
                            !sidebarOpen && 'w-0 border-l-0 opacity-0 overflow-hidden'
                        )}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm tracking-wide text-zinc-100">Course Content</span>
                                <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">{completedCount}/{lessons.length}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-2">
                                {lessons.map((lesson, index) => {
                                    const lessonProgress = getLessonProgress(lesson.id);
                                    const isCompleted = lessonProgress?.is_completed;
                                    const isCurrent = index === currentLessonIndex;

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => goToLesson(index)}
                                            className={cn(
                                                'w-full flex gap-3 p-2 rounded-lg text-left transition-all hover:bg-white/5 group',
                                                isCurrent && 'bg-white/5'
                                            )}
                                        >
                                                    <div className="relative w-32 aspect-video bg-zinc-900 rounded overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-white/10 transition-colors">
                                                        {lessonThumbnails[lesson.id] ? (
                                                            <img src={lessonThumbnails[lesson.id]} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                                                <div className="text-sm font-bold text-zinc-600">{index + 1}</div>
                                                            </div>
                                                        )}
                                                {lessonProgress && !isCompleted && lessonProgress.progress_seconds > 0 && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{ width: `${(lessonProgress.progress_seconds / (lesson.video_duration || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[9px] font-medium text-white">
                                                    {formatTime(lesson.video_duration || 0)}
                                                </div>
                                                {isCompleted && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                                    </div>
                                                )}
                                                {isCurrent && (
                                                    <div className="absolute inset-0 ring-2 ring-primary/50 rounded pointer-events-none" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 py-0.5">
                                                <h4 className={cn("text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors", isCurrent ? "text-primary" : "text-zinc-200")}>
                                                    {lesson.title}
                                                </h4>
                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                                                    {lesson.description || 'No description'}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </aside>
                </div>
            </div>

            {currentLesson?.ad_settings?.enabled && (
                <LessonAdPopup
                    isOpen={showAdPopup}
                    onClose={() => {
                        setShowAdPopup(false);
                        if (currentLessonIndex < lessons.length - 1) {
                            goToLesson(currentLessonIndex + 1);
                        }
                    }}
                    settings={currentLesson.ad_settings}
                    lessonId={currentLesson.id}
                    purchaseId={purchase?.id}
                    customerEmail={purchase?.customer_email}
                    courseId={purchase?.course.id}
                />
            )}
        </>
    );
}
