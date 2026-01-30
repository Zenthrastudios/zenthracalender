-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, slug)
);

-- If courses table already exists, make sure is_active exists for policies/filters
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create course_lessons table
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    is_free BOOLEAN DEFAULT false,
    ad_settings JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    payment_id TEXT,
    UNIQUE(course_id, user_email)
);

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Public can view active courses" 
    ON public.courses FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Users can manage their own courses" 
    ON public.courses FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for course_lessons
CREATE POLICY "Public can view lessons of active courses" 
    ON public.course_lessons FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_lessons.course_id 
            AND courses.is_active = true
        )
    );

CREATE POLICY "Users can manage lessons of their own courses" 
    ON public.course_lessons FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_lessons.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Policies for course_enrollments
CREATE POLICY "Users can view their own enrollments" 
    ON public.course_enrollments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_enrollments.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can enroll in courses" 
    ON public.course_enrollments FOR INSERT 
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
