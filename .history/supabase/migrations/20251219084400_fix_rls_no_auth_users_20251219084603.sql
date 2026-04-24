-- Fix RLS policies to avoid selecting from auth.users (clients don't have permission)
-- Use auth.email() instead.

-- BOOKINGS: allow attendees to view their own bookings
DROP POLICY IF EXISTS "Attendees can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Attendees can view their own bookings" ON public.bookings;

CREATE POLICY "Attendees can view their bookings" ON public.bookings
FOR SELECT
USING (
  auth.email() IS NOT NULL
  AND LOWER(attendee_email) = LOWER(auth.email())
);

-- PROFILES: allow attendees to view host profiles for their bookings
DROP POLICY IF EXISTS "Attendees can view booking host profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles for booking hosts" ON public.profiles;

CREATE POLICY "Attendees can view booking host profiles" ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR username IS NOT NULL
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.host_id = profiles.user_id
      AND auth.email() IS NOT NULL
      AND LOWER(b.attendee_email) = LOWER(auth.email())
  )
);
