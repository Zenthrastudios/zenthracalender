-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_types table
CREATE TABLE public.event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30,
  buffer_before INTEGER NOT NULL DEFAULT 0,
  buffer_after INTEGER NOT NULL DEFAULT 5,
  location_type TEXT NOT NULL DEFAULT 'google_meet',
  location_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  minimum_notice INTEGER NOT NULL DEFAULT 60,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Create availability table
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time INTEGER NOT NULL CHECK (start_time >= 0 AND start_time < 1440),
  end_time INTEGER NOT NULL CHECK (end_time > 0 AND end_time <= 1440),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, weekday, start_time)
);

-- Create availability_overrides table
CREATE TABLE public.availability_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_unavailable BOOLEAN NOT NULL DEFAULT false,
  start_time INTEGER,
  end_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_timezone TEXT NOT NULL DEFAULT 'UTC',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled', 'pending')),
  notes TEXT,
  reschedule_token UUID DEFAULT gen_random_uuid(),
  cancel_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by username" ON public.profiles
  FOR SELECT USING (username IS NOT NULL);

-- Event types policies
CREATE POLICY "Users can view their own event types" ON public.event_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event types" ON public.event_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event types" ON public.event_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event types" ON public.event_types
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Active event types are publicly viewable" ON public.event_types
  FOR SELECT USING (is_active = true);

-- Availability policies
CREATE POLICY "Users can view their own availability" ON public.availability
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own availability" ON public.availability
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view availability for booking" ON public.availability
  FOR SELECT USING (true);

-- Availability overrides policies
CREATE POLICY "Users can view their own overrides" ON public.availability_overrides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own overrides" ON public.availability_overrides
  FOR ALL USING (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view bookings where they are host" ON public.bookings
  FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Anyone can create a booking" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Hosts can update their bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Public can view booking by token" ON public.bookings
  FOR SELECT USING (true);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Also create default availability (Mon-Fri 9am-5pm)
  INSERT INTO public.availability (user_id, weekday, start_time, end_time)
  VALUES
    (NEW.id, 1, 540, 1020),
    (NEW.id, 2, 540, 1020),
    (NEW.id, 3, 540, 1020),
    (NEW.id, 4, 540, 1020),
    (NEW.id, 5, 540, 1020);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_types_updated_at
  BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_event_types_user_id ON public.event_types(user_id);
CREATE INDEX idx_event_types_slug ON public.event_types(slug);
CREATE INDEX idx_availability_user_id ON public.availability(user_id);
CREATE INDEX idx_bookings_host_id ON public.bookings(host_id);
CREATE INDEX idx_bookings_event_type_id ON public.bookings(event_type_id);
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_profiles_username ON public.profiles(username);