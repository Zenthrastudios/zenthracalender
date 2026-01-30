-- Add button fields to instagram_automation_rules for interactive messages
ALTER TABLE instagram_automation_rules 
ADD COLUMN IF NOT EXISTS response_button_text TEXT,
ADD COLUMN IF NOT EXISTS response_button_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN instagram_automation_rules.response_button_text IS 'Button text for interactive messages (optional)';
COMMENT ON COLUMN instagram_automation_rules.response_button_url IS 'Button URL for interactive messages (optional)';
