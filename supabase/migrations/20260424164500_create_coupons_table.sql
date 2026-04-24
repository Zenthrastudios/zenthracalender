-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure a creator cannot have duplicate coupon codes
  UNIQUE(user_id, code)
);

-- RLS Policies
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Creators can read their own coupons
CREATE POLICY "Creators can view their own coupons"
  ON public.coupons FOR SELECT
  USING (auth.uid() = user_id);

-- Creators can insert their own coupons
CREATE POLICY "Creators can create their own coupons"
  ON public.coupons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Creators can update their own coupons
CREATE POLICY "Creators can update their own coupons"
  ON public.coupons FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Creators can delete their own coupons
CREATE POLICY "Creators can delete their own coupons"
  ON public.coupons FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read active coupons to validate them (only the necessary fields could be read, or we allow read if they have the code)
CREATE POLICY "Anyone can view coupons by code"
  ON public.coupons FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
