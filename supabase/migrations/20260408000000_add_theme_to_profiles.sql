-- Add theme column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT;

-- Update existing profiles with default theme (system)
UPDATE public.profiles SET theme = 'system' WHERE theme IS NULL;