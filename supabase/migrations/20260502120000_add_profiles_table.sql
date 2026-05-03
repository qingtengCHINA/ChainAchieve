CREATE TABLE IF NOT EXISTS public.profiles (
  wallet VARCHAR(88) PRIMARY KEY,
  display_name VARCHAR(50),
  title VARCHAR(100),
  bio TEXT,
  avatar_emoji VARCHAR(8),
  twitter VARCHAR(50),
  github VARCHAR(50),
  website VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Self write" ON public.profiles FOR ALL USING (true);
