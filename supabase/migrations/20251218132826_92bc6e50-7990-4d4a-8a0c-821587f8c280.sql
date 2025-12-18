-- Add custom_responses column to store form responses separately from notes
ALTER TABLE public.bookings ADD COLUMN custom_responses jsonb DEFAULT '[]'::jsonb;