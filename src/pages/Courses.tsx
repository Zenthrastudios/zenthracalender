import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses, useCreateCourse, useDeleteCourse, useUpdateCourse } from '@/hooks/useCourses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Link,
    PlayCircle,
    Loader2,
    GraduationCap,
    IndianRupee,
    Video,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Courses() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: courses = [], isLoading } = useCourses();
    const createCourse = useCreateCourse();
    const deleteCourse = useDeleteCourse();
    const updateCourse = useUpdateCourse();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

    const handleCreateCourse = async () => {
        if (!newCourseTitle.trim()) {
            toast.error('Please enter a course title');
            return;
        }

        try {
            const course = await createCourse.mutateAsync({ title: newCourseTitle });
            toast.success('Course created!');
            setIsCreateDialogOpen(false);
            setNewCourseTitle('');
            navigate(`/dashboard/courses/${course.id}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to create course');
        }
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            await deleteCourse.mutateAsync(courseToDelete);
            toast.success('Course deleted');
            setIsDeleteDialogOpen(false);
            setCourseToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete course');
        }
    };

    const handleToggleActive = async (courseId: string, currentState: boolean) => {
        try {
            await updateCourse.mutateAsync({ id: courseId, is_active: !currentState });
            toast.success(currentState ? 'Course unpublished' : 'Course published!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update course');
        }
    };

    const copyLink = async (course: any) => {
        const { data: profile } = await (await import('@/integrations/supabase/client')).supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user?.id)
            .single();

        if (profile?.username) {
            const url = `${window.location.origin}/${profile.username}/course/${course.slug}`;
            navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
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

    return (
        <DashboardLayout>
            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <GraduationCap className="w-7 h-7 text-primary" />
                                Courses
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Create and manage your video courses
                            </p>
                        </div>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Course
                        </Button>
                    </div>

                    {/* Courses Grid */}
                    {courses.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <PlayCircle className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                                <p className="text-muted-foreground text-center max-w-sm mb-4">
                                    Create your first video course and start teaching. Add lessons, upload videos, and share your knowledge.
                                </p>
                                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create Your First Course
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map((course) => (
                                <Card
                                    key={course.id}
                                    className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => navigate(`/dashboard/courses/${course.id}`)}
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-12 h-12 text-zinc-600" />
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <Badge
                                            variant={course.is_active ? 'default' : 'secondary'}
                                            className="absolute top-3 left-3"
                                        >
                                            {course.is_active ? 'Published' : 'Draft'}
                                        </Badge>

                                        {/* Menu */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem onClick={() => navigate(`/dashboard/courses/${course.id}`)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(course.id, course.is_active)}>
                                                    {course.is_active ? (
                                                        <>
                                                            <EyeOff className="w-4 h-4 mr-2" />
                                                            Unpublish
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Publish
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyLink(course)}>
                                                    <Link className="w-4 h-4 mr-2" />
                                                    Copy Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        setCourseToDelete(course.id);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Content */}
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{course.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                            {course.description || 'No description'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-primary font-semibold">
                                                {course.is_free ? (
                                                    <span className="text-emerald-500">Free</span>
                                                ) : (
                                                    <>
                                                        <IndianRupee className="w-4 h-4" />
                                                        {course.price}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Course</DialogTitle>
                        <DialogDescription>
                            Give your course a name to get started. You can add lessons and videos next.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="e.g., Complete Web Development Bootcamp"
                            value={newCourseTitle}
                            onChange={(e) => setNewCourseTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCourse()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCourse} disabled={createCourse.isPending}>
                            {createCourse.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Course
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Course</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this course? This will also delete all lessons and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteCourse} disabled={deleteCourse.isPending}>
                            {deleteCourse.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
