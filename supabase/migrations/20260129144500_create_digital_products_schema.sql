-- Create Digital Products Table
CREATE TABLE IF NOT EXISTS public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  thumbnail_url TEXT,
  slug TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, slug)
);

-- Create Product Purchases Table
CREATE TABLE IF NOT EXISTS public.product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.digital_products(id),
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  payment_id TEXT,
  access_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Product Analytics Table
CREATE TABLE IF NOT EXISTS public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.product_purchases(id),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  device_info TEXT
);

-- Enable Row Level Security
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for Digital Products
CREATE POLICY "Public products are viewable by everyone" 
  ON public.digital_products FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Users can manage their own products" 
  ON public.digital_products FOR ALL 
  USING (auth.uid() = user_id);

-- Policies for Product Purchases
CREATE POLICY "Public can insert purchases" 
  ON public.product_purchases FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Public can view purchases via ID (for flow)" 
  ON public.product_purchases FOR SELECT 
  USING (true);

CREATE POLICY "Public can update purchases (for payment flow)" 
  ON public.product_purchases FOR UPDATE 
  USING (true);

-- Policies for Analytics
CREATE POLICY "Public can insert analytics" 
  ON public.product_analytics FOR INSERT 
  WITH CHECK (true);

-- Create Storage Bucket for Digital Products (if not exists)
-- Note: This might need to be run manually or via Supabase Dashboard if SQL is restricted
INSERT INTO storage.buckets (id, name, public) 
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

-- Create Storage Bucket for Public Images/Thumbnails (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-images', 'public-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access for Thumbnails"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-images' );

CREATE POLICY "Authenticated Users can upload Thumbnails"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'public-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Users can upload Products"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'digital-products' AND auth.role() = 'authenticated' );

-- Product File Access: Only Owner or Purchaser (requires logic, simplifying for now to Owner)
CREATE POLICY "Owners can view their product files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'digital-products' AND auth.role() = 'authenticated' );
