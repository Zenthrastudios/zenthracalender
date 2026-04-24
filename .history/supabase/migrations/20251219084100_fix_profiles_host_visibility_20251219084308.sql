-- Allow attendees to view host profiles for bookings they are part of
-- This is needed for GuestDashboard/MyBookings where we fetch host profile by host_id.

DROP POLICY IF EXISTS "Anyone can view profiles for booking hosts" ON public.profiles;

CREATE POLICY "Attendees can view booking host profiles" ON public.profiles
FOR SELECT
USING (
  -- user can always see their own profile
  auth.uid() = user_id
  OR
  -- attendee can see the host's profile for bookings where attendee email matches
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.host_id = profiles.user_id
      AND LOWER(b.attendee_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  OR
  -- keep existing behavior: public profiles with a username are viewable
  username IS NOT NULL
);
