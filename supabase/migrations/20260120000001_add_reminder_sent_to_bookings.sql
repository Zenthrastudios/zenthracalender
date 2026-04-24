-- Add reminder_sent column to bookings table for tracking reminder notifications
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of bookings needing reminders
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_lookup 
ON public.bookings (status, start_time, reminder_sent) 
WHERE status = 'confirmed';

-- Comment explaining the column
COMMENT ON COLUMN public.bookings.reminder_sent IS 'Tracks whether a reminder notification has been sent for this booking';
