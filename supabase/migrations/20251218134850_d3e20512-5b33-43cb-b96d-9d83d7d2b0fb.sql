-- Add payment fields to event_types
ALTER TABLE public.event_types 
ADD COLUMN is_paid BOOLEAN DEFAULT false,
ADD COLUMN price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN payment_provider TEXT DEFAULT NULL; -- 'cashfree', 'razorpay', or null