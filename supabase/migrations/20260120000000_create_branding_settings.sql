-- Create branding_settings table
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT DEFAULT 'CalSchedule',
  brand_logo_url TEXT,
  brand_color TEXT DEFAULT '#111827',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Branding settings policies
CREATE POLICY "Users can view their own branding settings" ON public.branding_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding settings" ON public.branding_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding settings" ON public.branding_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Branding settings are publicly viewable by user_id" ON public.branding_settings
  FOR SELECT USING (true);

-- Create trigger for new user branding settings
CREATE OR REPLACE FUNCTION public.handle_new_user_branding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.branding_settings (user_id, brand_name)
  VALUES (NEW.id, 'CalSchedule');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_branding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_branding();

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing users
INSERT INTO public.branding_settings (user_id, brand_name)
SELECT id, 'CalSchedule'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
