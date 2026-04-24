-- Add policy to allow attendees to view their bookings by email
-- This allows logged-in users to see bookings where their email matches attendee_email

CREATE POLICY "Attendees can view their own bookings" ON public.bookings
  FOR SELECT USING (
    attendee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
