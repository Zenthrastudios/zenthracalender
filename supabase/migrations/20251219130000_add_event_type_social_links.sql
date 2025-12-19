-- Add social links on event types (for public booking page)

ALTER TABLE public.event_types
ADD COLUMN social_links jsonb;
