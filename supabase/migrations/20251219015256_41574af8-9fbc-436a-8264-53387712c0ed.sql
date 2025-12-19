-- Create instructors table to store instructor accounts
-- These are users who can be assigned to event types
CREATE TABLE public.instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  avatar_url text,
  bio text,
  specialization text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Add instructor_id to event_types to assign instructors
ALTER TABLE public.event_types ADD COLUMN instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL;

-- Enable RLS on instructors
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructors
-- Admins can do everything
CREATE POLICY "Admins can manage instructors"
ON public.instructors
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Instructors can view and update their own record
CREATE POLICY "Instructors can view their own record"
ON public.instructors
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Instructors can update their own record"
ON public.instructors
FOR UPDATE
USING (auth.uid() = user_id);

-- Public can view active instructors (for booking page)
CREATE POLICY "Public can view active instructors"
ON public.instructors
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_instructors_updated_at
BEFORE UPDATE ON public.instructors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix bookings visibility: Allow attendees to view their own bookings
CREATE POLICY "Attendees can view their bookings"
ON public.bookings
FOR SELECT
USING (attendee_email = (SELECT auth.email()));

-- Update profiles RLS to allow viewing host profiles for bookings
CREATE POLICY "Anyone can view profiles for booking hosts"
ON public.profiles
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings 
  WHERE bookings.host_id = profiles.user_id
));