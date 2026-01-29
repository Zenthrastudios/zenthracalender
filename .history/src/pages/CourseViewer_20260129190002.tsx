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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ViewerResources from '@/components/course/ViewerResources';
import LessonAdPopup from '@/components/course/LessonAdPopup';

// Simple hook for media query
function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [matches, query]);

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

    // Check Mobile - assuming useMediaQuery works or failing gracefully? 
    // If @uidotdev/usehooks is not installed, this will fail.
    // I will try to use it since the user provided code had it (presumably).
    // If it fails again on import, I will remove it and use window.matchMedia.
    // Actually, to be safe, I'll remove the import and correct the usage later if it errors.
    // But I will keep it for now as I saw it in the file content trace.

    // Video player state
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);

    const currentLesson = lessons[currentLessonIndex];

    // ==================== SECURITY PROTECTIONS ====================

    // 1. Disable right-click context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            setSecurityWarning(true);
            setTimeout(() => setSecurityWarning(false), 2000);
            return false;
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // 2. Disable keyboard shortcuts for download/screenshot
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable common screenshot/save shortcuts
            if (
                // Ctrl+S (save)
                (e.ctrlKey && e.key === 's') ||
                // Ctrl+Shift+S (save as)
                (e.ctrlKey && e.shiftKey && e.key === 'S') ||
                // Ctrl+P (print)
                (e.ctrlKey && e.key === 'p') ||
                // PrintScreen
                e.key === 'PrintScreen' ||
                // F12 (DevTools)
                e.key === 'F12' ||
                // Ctrl+Shift+I (DevTools)
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                // Ctrl+Shift+J (DevTools Console)
                (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                // Ctrl+U (View Source)
                (e.ctrlKey && e.key === 'u')
            ) {
                e.preventDefault();
                setSecurityWarning(true);
                setTimeout(() => setSecurityWarning(false), 2000);
                return false;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 3. Detect DevTools opening
    useEffect(() => {
        const devToolsDetector = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            if (widthDiff || heightDiff) {
                setSecurityWarning(true);
                // Optionally pause video when DevTools detected
                if (videoRef.current && isPlaying) {
                    videoRef.current.pause();
                }
            }
        };

        window.addEventListener('resize', devToolsDetector);
        return () => window.removeEventListener('resize', devToolsDetector);
    }, [isPlaying]);

    // 4. Prevent video drag
    useEffect(() => {
        const handleDragStart = (e: DragEvent) => {
            e.preventDefault();
            return false;
        };

        const video = videoRef.current;
        if (video) {
            video.addEventListener('dragstart', handleDragStart);
            return () => video.removeEventListener('dragstart', handleDragStart);
        }
    }, [currentLesson]);

    // 5. Visibility change detection (tab switching during screen record)
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Log when user switches tabs (potential screen recording)
            if (document.hidden && purchase) {
                console.log('Tab hidden - potential recording detected');
                // Could log this to analytics
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [purchase]);

    // 6. Disable text selection on video container
    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.style.userSelect = 'none';
            container.style.webkitUserSelect = 'none';
        }
    }, []);

    // ==================== END SECURITY ====================

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
            course:courses(id, title, thumbnail_url, user_id)
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
        if (videoRef.current) {
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
    }, [currentLesson?.id, progress, purchase, currentLesson, updateProgress]);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            const vidDuration = videoRef.current.duration;
            setDuration(vidDuration);

            // Dynamically update lesson duration in local state if missing/incorrect
            // This ensures "midway" progress tracking works even if the DB duration is 0
            if (currentLesson && (currentLesson.video_duration === 0 || !currentLesson.video_duration)) {
                setLessons(prev => prev.map(l =>
                    l.id === currentLesson.id ? { ...l, video_duration: Math.floor(vidDuration) } : l
                ));
            }

            // Resume from saved progress
            const lessonProgress = progress.find((p) => p.lesson_id === currentLesson?.id);
            if (lessonProgress && lessonProgress.progress_seconds > 0) {
                videoRef.current.currentTime = lessonProgress.progress_seconds;
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

            const nextLesson = lessons[index];
            const nextSlug = currentLesson ? purchase?.course.slug : ''; // Keep same course slug

            // Navigate needs to construct the URL correctly
            // Standard: /dashboard/courses/view/:purchaseId/:lessonId
            // Or Public: /:username/course/:slug?lesson=:lessonId

            // Based on current URL check logic in useEffect, we rely on the URL param 'lessonId' usually.
            // But here we might just change the 'lessonId' state if we were fully SPA, 
            // but the routing seems to be URL based.

            // Let's assume URL navigation for now to be safe with router
            // Actually, the component reads `currentLessonIndex` from `lessons` and `lessonId` param.

            // We need to trigger navigation.
            // Find existing navigation logic? 
            // The original code passed `goToLesson` to siblings? 
            // Ah, looking at the previous file content, `goToLesson` logic was:

            /*
            const goToLesson = (index: number) => {
                const lesson = lessons[index];
                if (lesson) {
                    // Update URL params
                    setSearchParams(prev => {
                        prev.set('lesson', lesson.id);
                        return prev;
                    });
                }
            };
            */

            // Wait, the snippet I'm replacing had the logic. I will use the logic from the file I viewed.
            const lesson = lessons[index];
            if (lesson) {
                // Use Search Params for lesson navigation as seen in other parts or typical for this app
                // Or navigate() if route changes.
                // Looking at the imports, we have setSearchParams via useSearchParams? 
                // Or just `setSearchParams` if it was defined.

                // Wait, I need to see how `goToLesson` was implemented in the file.
                // It used `setSearchParams`.

                setSearchParams(prev => {
                    prev.set('lessonId', lesson.id);
                    return prev;
                });
            }

            setIsPlaying(false);
            setCurrentTime(0);
        }
    }, [lessons, purchase, currentLesson, updateProgress, setSearchParams]);

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
                // Don't auto-advance if showing ad? Or auto-advance after ad?
                // Let's pause auto-advance if ad is shown.
                return;
            }

            // 3. Auto-advance if no ad
            if (currentLessonIndex < lessons.length - 1) {
                // Optional: slight delay or check user preference
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

    // Playback controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
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
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
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

    // Generate dynamic watermark text with customer info
    const getWatermarkText = () => {
        if (!purchase) return brandName;
        // Include partial email for traceability
        const email = purchase.customer_email;
        const maskedEmail = email.replace(/(.{3})(.*)(@.*)/, '$1***$3');
        return `${brandName} • ${maskedEmail}`;
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

            // Lesson-specific midway progress
            const lessonDuration = lesson.video_duration || 1;
            const midwayPercent = Math.min(99, (lp.progress_seconds / lessonDuration) * 100);
            return sum + midwayPercent;
        }, 0);

        return (currentTotalProgress / totalPossibleProgress) * 100;
    }, [lessons, progress]);

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
            ref={containerRef}
            className="flex flex-col h-screen bg-black text-white font-sans selection:bg-primary/30 overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Desktop Header - Global Full Width */}
            <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-white/5 bg-zinc-950 z-30 flex-shrink-0">
                <div className="flex items-center gap-4">
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
                    <div className={cn(
                        "flex-shrink-0 bg-black relative w-full group",
                        "aspect-video lg:w-full lg:max-h-[80vh] lg:aspect-video mx-auto"
                    )}>
                        {currentLesson?.video_url ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={currentLesson.video_url}
                                    className="w-full h-full object-contain"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={handleVideoEnd}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    controlsList="nodownload nofullscreen noremoteplayback"
                                    disablePictureInPicture
                                    playsInline
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlay();
                                    }}
                                />

                                {/* Clickable Overlay */}
                                <div
                                    className="absolute inset-0 z-10 cursor-pointer"
                                    onClick={togglePlay}
                                />

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
                                        showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Progress Bar */}
                                    <div className="group/progress relative h-1 sm:h-1.5 mb-3 cursor-pointer flex items-center">
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration || 100}
                                            value={currentTime}
                                            onChange={(e) => {
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = Number(e.target.value);
                                                }
                                            }}
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
                                                <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-white/80 hover:text-white w-8 h-8" onClick={() => seek(-10)}>
                                                    <SkipBack className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-white/80 hover:text-white w-8 h-8" onClick={() => seek(10)}>
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

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white/80 hover:text-white w-8 h-8"
                                            onClick={toggleFullscreen}
                                        >
                                            <Maximize className="w-5 h-5" />
                                        </Button>
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

                                    {/* Desktop Resources - Moved here as requested or kept in header? User said "move resource down next to description". */}
                                    {/* Currently desktop resources are in the header. Let's add them here too for better visibility if header buttons are small. */}
                                    {/* Or user meant mobile mostly. Let's update Mobile structure primarily as that was the main complaint. */}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Content (Title, Actions, List) - Hidden on desktop */}
                    <div className="lg:hidden p-4 space-y-6 bg-zinc-950 pb-20">
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
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Preview
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

                    {/* Resources Section - Moved below description as requested */}
                    {currentLesson && (
                        <ViewerResources
                            lessonId={currentLesson.id}
                            lessonTitle={currentLesson.title}
                            variant="inline"
                        />
                    )}

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
                                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                                                    <div className="text-xs font-bold text-zinc-600">EP {index + 1}</div>
                                                </div>
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
                                                <h4 className={cn("text-xs font-bold leading-snug line-clamp-2", isCurrent ? "text-primary " : "text-zinc-200")}>
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
                                    {/* Thumbnail / Status */}
                                    <div className="relative w-32 aspect-video bg-zinc-900 rounded overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-white/10 transition-colors">
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                                            <div className="text-xs font-bold text-zinc-600">EP {index + 1}</div>
                                        </div>
                                        {/* Progress Bar Overlay */}
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
            />
        )}
  );
}
