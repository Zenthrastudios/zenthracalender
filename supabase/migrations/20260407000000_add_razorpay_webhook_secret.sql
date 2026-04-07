-- Add razorpay_webhook_secret to payment_settings
-- Razorpay uses a separate webhook secret (set in the Razorpay dashboard)
-- that is different from the API key secret.
ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT;
