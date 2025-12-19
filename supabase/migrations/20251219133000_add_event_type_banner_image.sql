-- Add banner image for event types (displayed on public booking page)

ALTER TABLE public.event_types
ADD COLUMN banner_image_url text;
