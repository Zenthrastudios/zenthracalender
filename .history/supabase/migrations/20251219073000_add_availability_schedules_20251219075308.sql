-- Create availability_schedules table for named availability templates
CREATE TABLE public.availability_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add schedule_id to availability table
ALTER TABLE public.availability 
ADD COLUMN schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE CASCADE;

-- Add schedule_id to event_types table
ALTER TABLE public.event_types 
ADD COLUMN schedule_id UUID REFERENCES public.availability_schedules(id) ON DELETE SET NULL;

-- Enable RLS on availability_schedules
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for availability_schedules
CREATE POLICY "Users can view their own schedules" ON public.availability_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own schedules" ON public.availability_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view schedules for booking" ON public.availability_schedules
  FOR SELECT USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_availability_schedules_updated_at
  BEFORE UPDATE ON public.availability_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_availability_schedules_user_id ON public.availability_schedules(user_id);
CREATE INDEX idx_availability_schedule_id ON public.availability(schedule_id);
CREATE INDEX idx_event_types_schedule_id ON public.event_types(schedule_id);

-- Function to create default schedule for existing users
CREATE OR REPLACE FUNCTION public.migrate_existing_availability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_schedule_id UUID;
BEGIN
  -- For each user with existing availability, create a default schedule
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.availability WHERE schedule_id IS NULL
  LOOP
    -- Create default schedule
    INSERT INTO public.availability_schedules (user_id, name, is_default, timezone)
    VALUES (user_record.user_id, 'Working Hours', true, 'Asia/Kolkata')
    RETURNING id INTO new_schedule_id;
    
    -- Update existing availability to use this schedule
    UPDATE public.availability 
    SET schedule_id = new_schedule_id 
    WHERE user_id = user_record.user_id AND schedule_id IS NULL;
  END LOOP;
END;
$$;

-- Run migration for existing data
SELECT public.migrate_existing_availability();

-- Update handle_new_user function to create default schedule
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_schedule_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id, name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Create default availability schedule
  INSERT INTO public.availability_schedules (user_id, name, is_default, timezone)
  VALUES (NEW.id, 'Working Hours', true, 'Asia/Kolkata')
  RETURNING id INTO new_schedule_id;
  
  -- Create default availability (Mon-Fri 9am-5pm) linked to schedule
  INSERT INTO public.availability (user_id, weekday, start_time, end_time, schedule_id)
  VALUES
    (NEW.id, 1, 540, 1020, new_schedule_id),
    (NEW.id, 2, 540, 1020, new_schedule_id),
    (NEW.id, 3, 540, 1020, new_schedule_id),
    (NEW.id, 4, 540, 1020, new_schedule_id),
    (NEW.id, 5, 540, 1020, new_schedule_id);
  
  RETURN NEW;
END;
$$;
