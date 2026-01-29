import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Cast supabase for new course tables not yet in type definitions
const db = supabase as any;

// Types
export interface Course {
    id: string;
    user_id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    price: number;
    is_active: boolean;
    is_free: boolean;
    created_at: string;
    updated_at: string;
}

export interface LessonAdSettings {
    enabled: boolean;
    type: 'custom' | 'product' | 'booking';
    headline?: string;
    body?: string;
    button_text?: string;
    banner_url?: string;
    link_url?: string; // For custom type
    product_id?: string; // For product type
    booking_event_type_id?: string; // For booking type
}

export interface CourseLesson {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    video_duration: number;
    order_index: number;
    is_preview: boolean;
    ad_settings: LessonAdSettings | null;
    created_at: string;
}

export interface CoursePurchase {
    id: string;
    course_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    amount: number;
    status: string;
    payment_provider: string | null;
    payment_id: string | null;
    access_token: string;
    created_at: string;
}

export interface CourseProgress {
    id: string;
    purchase_id: string;
    lesson_id: string;
    progress_seconds: number;
    is_completed: boolean;
    last_watched_at: string;
}

// Hook: Get all courses for authenticated user
export function useCourses() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['courses', user?.id],
        queryFn: async (): Promise<Course[]> => {
            if (!user) return [];

            const { data, error } = await db
                .from('courses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });
}

// Hook: Get single course with lessons
export function useCourse(courseId: string | undefined) {
    return useQuery({
        queryKey: ['course', courseId],
        queryFn: async (): Promise<(Course & { lessons: CourseLesson[] }) | null> => {
            if (!courseId) return null;

            const { data: course, error: courseError } = await db
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();

            if (courseError) throw courseError;

            const { data: lessons, error: lessonsError } = await db
                .from('course_lessons')
                .select('*')
                .eq('course_id', courseId)
                .order('order_index', { ascending: true });

            if (lessonsError) throw lessonsError;

            return {
                ...course,
                lessons: lessons || [],
            };
        },
        enabled: !!courseId,
    });
}

// Hook: Get public course by username and slug
export function useCourseBySlug(username: string | undefined, slug: string | undefined) {
    return useQuery({
        queryKey: ['public-course', username, slug],
        queryFn: async () => {
            if (!username || !slug) return null;

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_id, name, avatar_url')
                .eq('username', username)
                .maybeSingle();

            if (profileError || !profile) return null;

            // Get course
            const { data: course, error: courseError } = await db
                .from('courses')
                .select('*')
                .eq('user_id', profile.user_id)
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (courseError || !course) return null;

            // Get lessons
            const { data: lessons, error: lessonsError } = await db
                .from('course_lessons')
                .select('*')
                .eq('course_id', course.id)
                .order('order_index', { ascending: true });

            if (lessonsError) throw lessonsError;

            // Fetch branding
            const { data: branding } = await supabase
                .from('branding_settings')
                .select('brand_name, brand_logo_url, is_enabled')
                .eq('user_id', profile.user_id)
                .single();

            const isBrandingEnabled = branding?.is_enabled === true;
            const displayName =
                isBrandingEnabled && branding?.brand_name?.trim()
                    ? branding.brand_name
                    : profile.name;
            const displayLogo =
                isBrandingEnabled && branding?.brand_logo_url?.trim()
                    ? branding.brand_logo_url
                    : null;

            return {
                course: course as Course,
                lessons: (lessons || []) as CourseLesson[],
                instructor: {
                    name: displayName,
                    username,
                    avatar_url: displayLogo,
                    id: profile.user_id,
                },
                branding: isBrandingEnabled ? branding : null,
            };
        },
        enabled: !!username && !!slug,
    });
}

// Hook: Create course
export function useCreateCourse() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (data: Partial<Course>): Promise<Course> => {
            if (!user) throw new Error('Not authenticated');

            const slug =
                data.title
                    ?.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') || 'course';

            const { data: course, error } = await db
                .from('courses')
                .insert({
                    user_id: user.id,
                    title: data.title || 'Untitled Course',
                    slug,
                    description: data.description,
                    thumbnail_url: data.thumbnail_url,
                    price: data.price || 0,
                    is_active: false,
                    is_free: data.is_free || false,
                })
                .select()
                .single();

            if (error) throw error;
            return course;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
    });
}

// Hook: Update course
export function useUpdateCourse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            ...data
        }: Partial<Course> & { id: string }): Promise<Course> => {
            const updateData: any = { ...data, updated_at: new Date().toISOString() };

            // Update slug if title changed
            if (data.title) {
                updateData.slug = data.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
            }

            const { data: course, error } = await db
                .from('courses')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return course;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['course', variables.id] });
        },
    });
}

// Hook: Delete course
export function useDeleteCourse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (courseId: string): Promise<void> => {
            const { error } = await db.from('courses').delete().eq('id', courseId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
    });
}

// Hook: Create lesson
export function useCreateLesson() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            courseId,
            ...data
        }: Partial<CourseLesson> & { courseId: string }): Promise<CourseLesson> => {
            // Get max order_index
            const { data: lessons } = await db
                .from('course_lessons')
                .select('order_index')
                .eq('course_id', courseId)
                .order('order_index', { ascending: false })
                .limit(1);

            const nextOrder = (lessons?.[0]?.order_index || 0) + 1;

            const { data: lesson, error } = await db
                .from('course_lessons')
                .insert({
                    course_id: courseId,
                    title: data.title || 'Untitled Lesson',
                    description: data.description,
                    video_url: data.video_url,
                    video_duration: data.video_duration || 0,
                    order_index: nextOrder,
                    is_preview: data.is_preview || false,
                    ad_settings: data.ad_settings || null,
                })
                .select()
                .single();

            if (error) throw error;
            return lesson;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['course', variables.courseId] });
        },
    });
}

// Hook: Update lesson
export function useUpdateLesson() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            courseId,
            ...data
        }: Partial<CourseLesson> & { id: string; courseId: string }): Promise<CourseLesson> => {
            const { data: lesson, error } = await db
                .from('course_lessons')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return lesson;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['course', variables.courseId] });
        },
    });
}

// Hook: Delete lesson
export function useDeleteLesson() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            courseId,
        }: {
            id: string;
            courseId: string;
        }): Promise<void> => {
            const { error } = await db.from('course_lessons').delete().eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['course', variables.courseId] });
        },
    });
}

// Hook: Reorder lessons
export function useReorderLessons() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            courseId,
            lessonIds,
        }: {
            courseId: string;
            lessonIds: string[];
        }): Promise<void> => {
            // Update each lesson's order_index
            const updates = lessonIds.map((id, index) =>
                db.from('course_lessons').update({ order_index: index }).eq('id', id)
            );

            await Promise.all(updates);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['course', variables.courseId] });
        },
    });
}

// Hook: Get course progress for a purchase
export function useCourseProgress(purchaseId: string | undefined) {
    return useQuery({
        queryKey: ['course-progress', purchaseId],
        queryFn: async (): Promise<CourseProgress[]> => {
            if (!purchaseId) return [];

            const { data, error } = await db
                .from('course_progress')
                .select('*')
                .eq('purchase_id', purchaseId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!purchaseId,
    });
}

// Hook: Update lesson progress
export function useUpdateProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            purchaseId,
            lessonId,
            progressSeconds,
            isCompleted,
        }: {
            purchaseId: string;
            lessonId: string;
            progressSeconds?: number;
            isCompleted?: boolean;
        }): Promise<CourseProgress> => {
            const { data, error } = await db
                .from('course_progress')
                .upsert(
                    {
                        purchase_id: purchaseId,
                        lesson_id: lessonId,
                        progress_seconds: progressSeconds,
                        is_completed: isCompleted,
                        last_watched_at: new Date().toISOString(),
                    },
                    {
                        onConflict: 'purchase_id,lesson_id',
                    }
                )
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['course-progress', variables.purchaseId],
            });
        },
    });
}

// ==================== LESSON RESOURCES ====================

export interface LessonResource {
    id: string;
    lesson_id: string;
    title: string;
    description: string | null;
    resource_type: 'link' | 'pdf' | 'doc' | 'file' | 'note';
    resource_url: string | null;
    content: string | null;
    order_index: number;
    created_at: string;
    updated_at: string;
}

// Hook: Get resources for a lesson
export function useLessonResources(lessonId: string | undefined) {
    return useQuery({
        queryKey: ['lesson-resources', lessonId],
        queryFn: async (): Promise<LessonResource[]> => {
            if (!lessonId) return [];

            const { data, error } = await db
                .from('lesson_resources')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!lessonId,
    });
}

// Hook: Create lesson resource
export function useCreateLessonResource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            lessonId,
            title,
            description,
            resourceType,
            resourceUrl,
            content,
        }: {
            lessonId: string;
            title: string;
            description?: string;
            resourceType: 'link' | 'pdf' | 'doc' | 'file' | 'note';
            resourceUrl?: string;
            content?: string;
        }): Promise<LessonResource> => {
            // Get max order index
            const { data: existing } = await db
                .from('lesson_resources')
                .select('order_index')
                .eq('lesson_id', lessonId)
                .order('order_index', { ascending: false })
                .limit(1);

            const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

            const { data, error } = await db
                .from('lesson_resources')
                .insert({
                    lesson_id: lessonId,
                    title,
                    description,
                    resource_type: resourceType,
                    resource_url: resourceUrl,
                    content,
                    order_index: nextOrder,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['lesson-resources', variables.lessonId],
            });
        },
    });
}

// Hook: Update lesson resource
export function useUpdateLessonResource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            lessonId,
            ...updates
        }: {
            id: string;
            lessonId: string;
            title?: string;
            description?: string;
            resourceUrl?: string;
            content?: string;
        }): Promise<LessonResource> => {
            const { data, error } = await db
                .from('lesson_resources')
                .update({
                    ...updates,
                    resource_url: updates.resourceUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['lesson-resources', variables.lessonId],
            });
        },
    });
}

// Hook: Delete lesson resource
export function useDeleteLessonResource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            lessonId,
        }: {
            id: string;
            lessonId: string;
        }): Promise<void> => {
            const { error } = await db
                .from('lesson_resources')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['lesson-resources', variables.lessonId],
            });
        },
    });
}
