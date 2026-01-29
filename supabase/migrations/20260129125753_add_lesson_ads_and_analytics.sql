
-- Add ad_settings column to course_lessons table
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS ad_settings JSONB DEFAULT NULL;

-- Create table for tracking ad events
CREATE TABLE IF NOT EXISTS lesson_ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- specific user or anonymous if possible/needed
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
    metadata JSONB DEFAULT NULL, -- store extra info like device, browser, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for lesson_ad_events
ALTER TABLE lesson_ad_events ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_ad_events
-- Allow inserts from authenticated users (and maybe anon if you have public courses)
CREATE POLICY "Allow public insert for ad events" 
ON lesson_ad_events FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow creators to view their ad events
CREATE POLICY "Allow creators to view their ad events"
ON lesson_ad_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM course_lessons cl
        JOIN courses c ON cl.course_id = c.id
        WHERE cl.id = lesson_ad_events.lesson_id
        AND c.user_id = auth.uid()
    )
);
