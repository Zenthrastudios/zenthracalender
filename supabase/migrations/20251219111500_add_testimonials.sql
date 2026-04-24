-- Add testimonials feature linked to event types

-- Add toggle on event_types to show/hide testimonials on booking page
ALTER TABLE public.event_types
ADD COLUMN show_testimonials boolean NOT NULL DEFAULT true;

-- Create testimonials table
CREATE TABLE public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type_id uuid NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_title text,
  avatar_url text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
ON public.testimonials
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Event owners can manage testimonials for their own event types
CREATE POLICY "Event owners can manage testimonials"
ON public.testimonials
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = testimonials.event_type_id
      AND et.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = testimonials.event_type_id
      AND et.user_id = auth.uid()
  )
);

-- Public can view visible testimonials only when enabled on the event type
CREATE POLICY "Public can view visible testimonials"
ON public.testimonials
FOR SELECT
USING (
  testimonials.is_visible = true
  AND EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = testimonials.event_type_id
      AND et.is_active = true
      AND et.show_testimonials = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
