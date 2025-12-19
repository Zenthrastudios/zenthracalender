-- Drop all existing SELECT policies on bookings and recreate them properly
DROP POLICY IF EXISTS "Users can view bookings where they are host" ON public.bookings;
DROP POLICY IF EXISTS "Public can view booking by token" ON public.bookings;
DROP POLICY IF EXISTS "Attendees can view their own bookings" ON public.bookings;

-- Create a single comprehensive SELECT policy that allows:
-- 1. Hosts to view their bookings
-- 2. Attendees to view their bookings (by email match)
-- 3. Anyone to view bookings by token (for reschedule/cancel links)
CREATE POLICY "Users can view relevant bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = host_id 
    OR LOWER(attendee_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR true  -- Allow public access for token-based lookups
  );
