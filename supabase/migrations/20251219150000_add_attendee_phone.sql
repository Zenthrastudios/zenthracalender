ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS attendee_phone TEXT;
