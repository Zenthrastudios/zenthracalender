-- Drop the old unique constraint that doesn't include schedule_id
ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_user_id_weekday_start_time_key;

-- Create new unique constraint that includes schedule_id
-- This allows the same user to have the same weekday/time in different schedules
ALTER TABLE public.availability 
ADD CONSTRAINT availability_schedule_weekday_start_time_key 
UNIQUE (schedule_id, weekday, start_time);
