import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCourse, useUpdateCourse, useCreateLesson, useUpdateLesson, useDeleteLesson, useReorderLessons, CourseLesson } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { uploadVideo } from '@/lib/videoUpload';
import { getShortFilename } from '@/lib/fileUtils';
import LessonResources from '@/components/course/LessonResources';
import LessonAdForm from '@/components/course/LessonAdForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    ArrowLeft,
    Save,
    Eye,
    EyeOff,
    Plus,
    GripVertical,
    Edit2,
    Trash2,
    Play,
    Upload,
    Image,
    Loader2,
    Link,
    Video,
    IndianRupee,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructors } from '@/hooks/useInstructors';

export default function CourseEditor() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: course, isLoading } = useCourse(courseId);
    const { data: instructors } = useInstructors();
    const updateCourse = useUpdateCourse();
    const createLesson = useCreateLesson();
    const updateLesson = useUpdateLesson();
    const deleteLesson = useDeleteLesson();
    const reorderLessons = useReorderLessons();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [isFree, setIsFree] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [trailerUrl, setTrailerUrl] = useState('');
    const [richDescription, setRichDescription] = useState('');
    const [instructorId, setInstructorId] = useState<string | null>(null);
    const [faq, setFaq] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

    // Lesson dialog state
    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonDescription, setLessonDescription] = useState('');
    const [lessonVideoUrl, setLessonVideoUrl] = useState('');
    const [lessonIsPreview, setLessonIsPreview] = useState(false);
    const [lessonAdSettings, setLessonAdSettings] = useState<any>(null); // Type checked in form
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Drag state
    const [draggedLesson, setDraggedLesson] = useState<string | null>(null);

    useEffect(() => {
        if (course) {
            setTitle(course.title);
            setDescription(course.description || '');
            setPrice(course.price);
            setIsFree(course.is_free);
            setIsActive(course.is_active);
            setThumbnailUrl(course.thumbnail_url || '');
            setTrailerUrl(course.trailer_url || '');
            setRichDescription(course.rich_description || '');
            setInstructorId(course.instructor_id);
            setFaq(course.faq || []);
        }
    }, [course]);

    const handleSave = async () => {
        if (!courseId) return;
        setIsSaving(true);
        try {
            await updateCourse.mutateAsync({
                id: courseId,
                title,
                description,
                rich_description: richDescription,
                price: isFree ? 0 : price,
                is_free: isFree,
                is_active: isActive,
                thumbnail_url: thumbnailUrl || null,
                trailer_url: trailerUrl || null,
                instructor_id: instructorId,
                faq,
            });
            toast.success('Course saved!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingThumbnail(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${courseId}/thumbnail.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('course-thumbnails')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-thumbnails')
                .getPublicUrl(fileName);

            setThumbnailUrl(publicUrl);
            toast.success('Thumbnail uploaded!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload thumbnail');
        } finally {
            setIsUploadingThumbnail(false);
        }
    };

    const openLessonDialog = (lesson?: CourseLesson) => {
        if (lesson) {
            setEditingLesson(lesson);
            setLessonTitle(lesson.title);
            setLessonDescription(lesson.description || '');
            setLessonVideoUrl(lesson.video_url || '');
            setLessonIsPreview(lesson.is_preview);
            setLessonAdSettings(lesson.ad_settings || null);
        } else {
            setEditingLesson(null);
            setLessonTitle('');
            setLessonDescription('');
            setLessonVideoUrl('');
            setLessonIsPreview(false);
            setLessonAdSettings(null);
        }
        setIsLessonDialogOpen(true);
    };

    const handleSaveLesson = async () => {
        if (!courseId || !lessonTitle.trim()) {
            toast.error('Please enter a lesson title');
            return;
        }

        try {
            if (editingLesson) {
                await updateLesson.mutateAsync({
                    id: editingLesson.id,
                    courseId,
                    title: lessonTitle,
                    description: lessonDescription,
                    video_url: lessonVideoUrl,
                    is_preview: lessonIsPreview,
                    ad_settings: lessonAdSettings,
                });
                toast.success('Lesson updated!');
            } else {
                await createLesson.mutateAsync({
                    courseId,
                    title: lessonTitle,
                    description: lessonDescription,
                    video_url: lessonVideoUrl,
                    is_preview: lessonIsPreview,
                    ad_settings: lessonAdSettings,
                });
                toast.success('Lesson added!');
            }
            setIsLessonDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save lesson');
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!courseId) return;
        try {
            await deleteLesson.mutateAsync({ id: lessonId, courseId });
            toast.success('Lesson deleted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete lesson');
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !courseId) return;

        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('Video file must be less than 500MB');
            return;
        }

        setIsUploadingVideo(true);
        setUploadProgress(0);

        try {
            const result = await uploadVideo(file, user.id, courseId, (progress) => {
                setUploadProgress(progress.percentage);
            });

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            setLessonVideoUrl(result.publicUrl || '');
            toast.success('Video uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload video');
        } finally {
            setIsUploadingVideo(false);
            setUploadProgress(0);
        }
    };

    const handleDragStart = (lessonId: string) => {
        setDraggedLesson(lessonId);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedLesson || draggedLesson === targetId) return;
    };

    const handleDrop = async (targetId: string) => {
        if (!draggedLesson || !course || draggedLesson === targetId) return;

        const lessons = [...course.lessons];
        const dragIndex = lessons.findIndex((l) => l.id === draggedLesson);
        const dropIndex = lessons.findIndex((l) => l.id === targetId);

        const [removed] = lessons.splice(dragIndex, 1);
        lessons.splice(dropIndex, 0, removed);

        const newOrder = lessons.map((l) => l.id);
        try {
            await reorderLessons.mutateAsync({ courseId: courseId!, lessonIds: newOrder });
        } catch (error) {
            toast.error('Failed to reorder lessons');
        }

        setDraggedLesson(null);
    };

    const copyShareLink = async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user?.id)
            .single();

        if (profile?.username && course) {
            const url = `${window.location.origin}/${profile.username}/course/${course.slug}`;
            navigator.clipboard.writeText(url);
            toast.success('Link copied!');
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    if (!course) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h2 className="text-xl font-semibold mb-2">Course not found</h2>
                    <Button onClick={() => navigate('/dashboard/courses')}>Back to Courses</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/courses')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">{course.title}</h1>
                                <Badge variant={isActive ? 'default' : 'secondary'}>
                                    {isActive ? 'Published' : 'Draft'}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={copyShareLink}>
                                <Link className="w-4 h-4 mr-2" />
                                Copy Link
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Course Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Course title"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Short Description</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="What will students learn? (Short summary)"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="rich-description">Rich HTML Content / Detailed Description</Label>
                                        <Textarea
                                            id="rich-description"
                                            value={richDescription}
                                            onChange={(e) => setRichDescription(e.target.value)}
                                            placeholder="Detailed course content, curriculum overview, etc. (Supports some HTML)"
                                            rows={8}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Trailer & FAQ */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Enhancements</CardTitle>
                                    <CardDescription>Add trailer and FAQs to build credibility</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <Label htmlFor="trailer">Trailer Video URL</Label>
                                        <Input
                                            id="trailer"
                                            value={trailerUrl}
                                            onChange={(e) => setTrailerUrl(e.target.value)}
                                            placeholder="YouTube, Vimeo, or direct video URL"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Frequently Asked Questions</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setFaq([...faq, { question: '', answer: '' }])}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add FAQ
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {faq.map((item, index) => (
                                                <div key={index} className="p-4 border rounded-lg bg-muted/30 relative">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-8 w-8 text-destructive"
                                                        onClick={() => setFaq(faq.filter((_, i) => i !== index))}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                    <div className="space-y-3 pr-8">
                                                        <Input
                                                            placeholder="Question"
                                                            value={item.question}
                                                            onChange={(e) => {
                                                                const newFaq = [...faq];
                                                                newFaq[index].question = e.target.value;
                                                                setFaq(newFaq);
                                                            }}
                                                        />
                                                        <Textarea
                                                            placeholder="Answer"
                                                            value={item.answer}
                                                            onChange={(e) => {
                                                                const newFaq = [...faq];
                                                                newFaq[index].answer = e.target.value;
                                                                setFaq(newFaq);
                                                            }}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {faq.length === 0 && (
                                                <p className="text-sm text-center text-muted-foreground py-4 border-2 border-dashed rounded-lg">
                                                    No FAQs added yet
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Lessons */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Lessons</CardTitle>
                                        <CardDescription>Add and organize your course content</CardDescription>
                                    </div>
                                    <Button onClick={() => openLessonDialog()} size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Lesson
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {course.lessons.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                            <Video className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-muted-foreground mb-4">No lessons yet</p>
                                            <Button variant="outline" onClick={() => openLessonDialog()}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add First Lesson
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {course.lessons.map((lesson, index) => (
                                                <div
                                                    key={lesson.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(lesson.id)}
                                                    onDragOver={(e) => handleDragOver(e, lesson.id)}
                                                    onDrop={() => handleDrop(lesson.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-move ${draggedLesson === lesson.id ? 'opacity-50' : ''
                                                        }`}
                                                >
                                                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{lesson.title}</p>
                                                        {lesson.video_url && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Play className="w-3 h-3" />
                                                                {getShortFilename(lesson.video_url, 25)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {lesson.is_preview && (
                                                        <Badge variant="outline" className="text-xs">Preview</Badge>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => openLessonDialog(lesson)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteLesson(lesson.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Settings */}
                        <div className="space-y-6">
                            {/* Thumbnail */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Thumbnail</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3 relative">
                                        {thumbnailUrl ? (
                                            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Image className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <label>
                                        <Button variant="outline" className="w-full cursor-pointer" asChild disabled={isUploadingThumbnail}>
                                            <span>
                                                {isUploadingThumbnail ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Upload className="w-4 h-4 mr-2" />
                                                )}
                                                Upload Thumbnail
                                            </span>
                                        </Button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleThumbnailUpload}
                                        />
                                    </label>
                                </CardContent>
                            </Card>

                            {/* Instructor */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Instructor</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Label htmlFor="instructor">Select Instructor</Label>
                                    <select
                                        id="instructor"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={instructorId || ''}
                                        onChange={(e) => setInstructorId(e.target.value || null)}
                                    >
                                        <option value="">Default (Profile Content)</option>
                                        {instructors?.map((inst: any) => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Choose who is teaching this course. Default is you.
                                    </p>

                                    {instructorId && instructors?.find((i: any) => i.id === instructorId) && (
                                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={instructors.find((i: any) => i.id === instructorId)?.avatar_url || ''} />
                                                    <AvatarFallback>{instructors.find((i: any) => i.id === instructorId)?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold">{instructors.find((i: any) => i.id === instructorId)?.name}</p>
                                                    <p className="text-[10px] text-primary font-medium">{instructors.find((i: any) => i.id === instructorId)?.specialization || 'No specialization'}</p>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                                "{instructors.find((i: any) => i.id === instructorId)?.bio || 'No bio provided'}"
                                            </p>
                                            <Button variant="ghost" size="sm" className="w-full h-7 text-[10px]" asChild>
                                                <a href="/instructors">Manage Instructors</a>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Pricing */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Pricing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="is-free">Free Course</Label>
                                        <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
                                    </div>
                                    {!isFree && (
                                        <div>
                                            <Label htmlFor="price">Price (₹)</Label>
                                            <div className="relative mt-1">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="price"
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => setPrice(Number(e.target.value))}
                                                    className="pl-9"
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Visibility */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Visibility</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Published</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {isActive ? 'Course is visible to public' : 'Course is hidden'}
                                            </p>
                                        </div>
                                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lesson Dialog */}
            <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="lesson-title">Lesson Title</Label>
                            <Input
                                id="lesson-title"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                placeholder="e.g., Introduction to the Course"
                            />
                        </div>
                        <div>
                            <Label htmlFor="lesson-description">Description (optional)</Label>
                            <Textarea
                                id="lesson-description"
                                value={lessonDescription}
                                onChange={(e) => setLessonDescription(e.target.value)}
                                placeholder="What will be covered in this lesson?"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label>Video</Label>
                            {lessonVideoUrl ? (
                                <div className="mt-1 p-3 bg,muted rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Play className="w-4 h-4 text-primary" />
                                        <span className="truncate max-w-[200px]">{getShortFilename(lessonVideoUrl)}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setLessonVideoUrl('')}>
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-1">
                                    <Input
                                        placeholder="Paste video URL (YouTube, Vimeo, or direct link)"
                                        value={lessonVideoUrl}
                                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                                        className="mb-2"
                                    />
                                    <p className="text-xs text-muted-foreground text-center mb-2">or</p>
                                    {isUploadingVideo ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Uploading... {uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Max file size: 500MB</p>
                                        </div>
                                    ) : (
                                        <label>
                                            <Button variant="outline" className="w-full cursor-pointer" asChild>
                                                <span>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Upload Video File (Max 500MB)
                                                </span>
                                            </Button>
                                            <input
                                                ref={videoInputRef}
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={handleVideoUpload}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <Label htmlFor="is-preview">Free Preview</Label>
                                <p className="text-xs text-muted-foreground">Allow non-buyers to watch this lesson</p>
                            </div>
                            <Switch id="is-preview" checked={lessonIsPreview} onCheckedChange={setLessonIsPreview} />
                        </div>

                        {/* Ad Settings */}
                        <Separator className="my-4" />
                        <LessonAdForm
                            value={lessonAdSettings}
                            onChange={setLessonAdSettings}
                            courseId={courseId!}
                        />

                        {/* Resources Section - Only show when editing existing lesson */}
                        {editingLesson && (
                            <>
                                <Separator className="my-4" />
                                <LessonResources
                                    lessonId={editingLesson.id}
                                    courseId={editingLesson.course_id}
                                />
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLessonDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveLesson} disabled={createLesson.isPending || updateLesson.isPending}>
                            {(createLesson.isPending || updateLesson.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingLesson ? 'Update Lesson' : 'Add Lesson'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
