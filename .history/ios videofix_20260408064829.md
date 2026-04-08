Yes — this is happening because your iOS path is fundamentally different from your desktop path, and the iOS fallback you added is likely pointing to a source that Safari/WebKit does not like. The key places are:

On iOS you do not use the Supabase signed streaming endpoint.
Instead you switch to currentLesson.video_url directly.
You also preload extra hidden videos for thumbnails, including crossOrigin="anonymous" and canvas extraction logic, which is fragile on iOS/WebKit.
Your player already logs the classic failure symptom: invalid metadata / duration staying bad, which matches the 0:00 / 0:00 behavior you saw.
Root cause

This line is the main problem:

const videoStreamUrl = currentLesson?.id && accessToken && !isIOS
  ? `${SUPABASE_FN_URL}?lessonId=${currentLesson.id}&token=${accessToken}`
  : currentLesson?.video_url || null;

On non-iOS, you use the protected function URL.
On iOS, you bypass it and use currentLesson.video_url directly.

That means iOS alone is exposed to issues like:

direct object URL missing proper Content-Type
missing Accept-Ranges
redirect/token-expiry issues
stricter Safari handling of cross-origin video
Safari rejecting metadata loading, so duration stays NaN / 0

That is why it fails only on iOS.

Second issue making it worse

Your thumbnail preloader creates off-DOM videos for every lesson, uses crossOrigin="anonymous", then seeks and draws to canvas.

Even though you skip some fallback behavior on iOS, this is still risky because:

iOS Safari is much stricter with media loading
preloading many videos can exhaust Safari’s media pipeline
hidden metadata fetches for every lesson can interfere with the active player
canvas/video CORS interaction is especially brittle on WebKit

So there are really two bugs:

Wrong source chosen on iOS
Aggressive thumbnail/media preloading interfering with iOS playback
What to change
Fix 1: Stop using video_url as the primary iOS source

Use the same streaming endpoint for all platforms first.

Replace this:
const videoStreamUrl = currentLesson?.id && accessToken && !isIOS
  ? `${SUPABASE_FN_URL}?lessonId=${currentLesson.id}&token=${accessToken}`
  : currentLesson?.video_url || null;
With this:
const videoStreamUrl =
  currentLesson?.id && accessToken
    ? `${SUPABASE_FN_URL}?lessonId=${currentLesson.id}&token=${accessToken}`
    : currentLesson?.video_url || null;

Then in onError, only fallback to video_url as a last resort.

Better onError:
onError={(e) => {
  const vid = e.currentTarget;
  const err = vid.error;

  console.error('Video loading error:', {
    code: err?.code,
    message: err?.message,
    src: vid.currentSrc || vid.src,
    networkState: vid.networkState,
    readyState: vid.readyState,
    lessonId: currentLesson?.id
  });

  // fallback only once
  if (
    currentLesson?.video_url &&
    vid.currentSrc !== currentLesson.video_url &&
    !vid.dataset.fallbackTried
  ) {
    vid.dataset.fallbackTried = 'true';
    vid.src = currentLesson.video_url;
    vid.load();
    return;
  }

  setIsPlaying(false);
  setIsVideoLoading(false);
  setError(`Video failed to load${err?.code ? ` (Error ${err.code})` : ''}.`);
}}
Fix 2: Do not preload thumbnails on iOS

This block is very likely hurting Safari: the lessons.forEach(... generateThumbnail()) logic.

Add an early return:
useEffect(() => {
  if (lessons.length === 0) return;

  // iOS Safari is sensitive to multiple hidden video loads.
  // Skip thumbnail extraction entirely on iOS.
  if (isIOS) return;

  lessons.forEach((lesson) => {
    if (!lesson.video_url || durationLoadedRef.current.has(lesson.id)) return;
    durationLoadedRef.current.add(lesson.id);

    const generateThumbnail = () => {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      vid.crossOrigin = 'anonymous';

      const streamUrl = accessToken
        ? `${SUPABASE_FN_URL}?lessonId=${lesson.id}&token=${accessToken}`
        : lesson.video_url;

      vid.src = streamUrl;
      ...
    };

    generateThumbnail();
  });
}, [lessons, accessToken]);

Best option: don’t generate client-side thumbnails at all. Store thumbnails server-side.

Fix 3: Simplify iOS video element

For iOS, keep the <video> as clean as possible.

Use:
<video
  key={currentLesson?.id}
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
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
  onLoadStart={() => setIsVideoLoading(true)}
  onCanPlay={() => setIsVideoLoading(false)}
  onLoadedData={() => setIsVideoLoading(false)}
  playsInline
  preload="metadata"
  muted={isMuted}
/>
Remove these iOS-specific extras:
'webkit-playsinline': 'true',
'x5-playsinline': 'true',

They usually do not help in modern Safari.

Fix 4: Make lesson change safer on iOS

Your load() on lesson change is okay, but Safari behaves better if source reset is explicit.

useEffect(() => {
  const video = videoRef.current;
  if (!video || !videoStreamUrl) return;

  setIsVideoLoading(true);
  setCurrentTime(0);
  setDuration(0);
  setIsPlaying(false);

  video.pause();
  video.removeAttribute('src');
  video.load();

  video.src = videoStreamUrl;
  video.load();
}, [currentLessonIndex, videoStreamUrl]);
Fix 5: Do not rely on retry loops to solve bad metadata

This block is treating the symptom, not the cause.
If the source is wrong for Safari, repeated load() calls won’t fix it consistently.

Keep a small retry once, but not repeated recursive reloads.

Most likely real technical reason

From the code alone, the most likely explanation is:

iOS is the only platform using currentLesson.video_url directly, and that direct URL is not returning a Safari-friendly video response.

Usually that means one of these on the backend:

wrong Content-Type
no byte-range support
signed URL redirect behavior Safari dislikes
CORS/header mismatch
CDN/R2 response that Chromium tolerates but Safari does not

Your own comment says the edge function was meant to fix this exact class of issue, but then the code skips that function on iOS. That is the contradiction causing the bug.

Minimal fix I would apply first
Use SUPABASE_FN_URL on iOS too.
Disable thumbnail generation on iOS.
Keep iOS video element simple.
Only fallback to direct URL after one real playback error.
Final recommended patch
const videoStreamUrl =
  currentLesson?.id && accessToken
    ? `${SUPABASE_FN_URL}?lessonId=${currentLesson.id}&token=${accessToken}`
    : currentLesson?.video_url || null;
useEffect(() => {
  if (isIOS) return; // disable thumbnail generation on iOS
  // existing thumbnail logic...
}, [lessons, accessToken]);
<video
  key={currentLesson?.id}
  ref={videoRef}
  src={videoStreamUrl || undefined}
  poster={purchase?.course.thumbnail_url || undefined}
  onLoadedMetadata={handleLoadedMetadata}
  onTimeUpdate={handleTimeUpdate}
  onEnded={handleVideoEnd}
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
  onLoadStart={() => setIsVideoLoading(true)}
  onCanPlay={() => setIsVideoLoading(false)}
  onLoadedData={() => setIsVideoLoading(false)}
  playsInline
  preload="metadata"
  muted={isMuted}
  onError={(e) => {
    const vid = e.currentTarget;

    if (
      currentLesson?.video_url &&
      vid.currentSrc !== currentLesson.video_url &&
      !vid.dataset.fallbackTried
    ) {
      vid.dataset.fallbackTried = 'true';
      vid.src = currentLesson.video_url;
      vid.load();
      return;
    }

    setIsPlaying(false);
    setIsVideoLoading(false);
    setError('Video failed to load. Please refresh the page.');
  }}
/>

If you want, I can rewrite this whole player into a cleaner iOS-safe version with the exact diff.