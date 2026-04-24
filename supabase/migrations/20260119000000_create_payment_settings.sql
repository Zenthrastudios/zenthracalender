CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    razorpay_key_id TEXT,
    razorpay_key_secret TEXT,
    cashfree_app_id TEXT,
    cashfree_secret_key TEXT,
    is_razorpay_enabled BOOLEAN DEFAULT false,
    is_cashfree_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own payment settings"
    ON public.payment_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment settings"
    ON public.payment_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment settings"
    ON public.payment_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_settings_updated
    BEFORE UPDATE ON public.payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
