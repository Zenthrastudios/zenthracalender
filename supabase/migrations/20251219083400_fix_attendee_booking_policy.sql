-- Fix the attendee booking policy with case-insensitive comparison
DROP POLICY IF EXISTS "Attendees can view their own bookings" ON public.bookings;

CREATE POLICY "Attendees can view their own bookings" ON public.bookings
  FOR SELECT USING (
    LOWER(attendee_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );
