-- Add instagram_account_id column to store the Instagram Business Account ID
-- This is the ID that appears in webhook payloads (e.g., 17841403285682665)
ALTER TABLE instagram_integrations 
ADD COLUMN IF NOT EXISTS instagram_account_id TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_instagram_integrations_account_id 
ON instagram_integrations(instagram_account_id);

-- Update existing records to copy instagram_user_id to instagram_account_id
UPDATE instagram_integrations 
SET instagram_account_id = instagram_user_id 
WHERE instagram_account_id IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN instagram_integrations.instagram_account_id IS 'Instagram Business Account ID used in webhook recipient.id field';
