-- Add policy to allow attendees to view their bookings by email
-- This allows logged-in users to see bookings where their email matches attendee_email
-- Using LOWER() for case-insensitive comparison

DROP POLICY IF EXISTS "Attendees can view their own bookings" ON public.bookings;

CREATE POLICY "Attendees can view their own bookings" ON public.bookings
  FOR SELECT USING (
    LOWER(attendee_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );
