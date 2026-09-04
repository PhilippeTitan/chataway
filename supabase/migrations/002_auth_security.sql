-- Tie deduplication records to the Supabase Auth identity.
-- This remains compatible with the existing TEXT column while auth.uid() is UUID.
ALTER TABLE seen_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own seen videos" ON seen_videos;
DROP POLICY IF EXISTS "Users can create their own seen videos" ON seen_videos;
DROP POLICY IF EXISTS "Users can update their own seen videos" ON seen_videos;

CREATE POLICY "Users can read their own seen videos"
  ON seen_videos FOR SELECT
  TO authenticated, anon
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own seen videos"
  ON seen_videos FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own seen videos"
  ON seen_videos FOR UPDATE
  TO authenticated, anon
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_seen_videos_user_hash
  ON seen_videos(user_id, video_hash);