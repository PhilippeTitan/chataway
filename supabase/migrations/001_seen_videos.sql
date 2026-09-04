-- Supabase migration: Create seen_videos table for deduplication
CREATE TABLE IF NOT EXISTS seen_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_hash TEXT NOT NULL,
  site TEXT NOT NULL,
  video_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_hash)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_seen_videos_user ON seen_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_seen_videos_hash ON seen_videos(video_hash);

-- Enable Row Level Security (optional, for future auth)
ALTER TABLE seen_videos ENABLE ROW LEVEL SECURITY;
