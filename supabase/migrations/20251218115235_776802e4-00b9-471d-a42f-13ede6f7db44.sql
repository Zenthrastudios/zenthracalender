-- Create table to store user OAuth tokens for integrations
CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  provider_user_id TEXT,
  provider_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view their own integrations" 
ON public.user_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can insert their own integrations" 
ON public.user_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update their own integrations" 
ON public.user_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete their own integrations" 
ON public.user_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();