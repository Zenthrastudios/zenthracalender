-- Add media_id column to instagram_automation_rules for content-specific automation
ALTER TABLE instagram_automation_rules 
ADD COLUMN IF NOT EXISTS media_id TEXT;

-- Create index for faster lookups when filtering by media_id
CREATE INDEX IF NOT EXISTS idx_instagram_automation_rules_media_id 
ON instagram_automation_rules(media_id);

-- Add comment for clarity
COMMENT ON COLUMN instagram_automation_rules.media_id IS 'Instagram media (post/reel) ID for content-specific comment automation. NULL means trigger on all posts.';
