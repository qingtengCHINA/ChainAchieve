-- Public read access for the Data API (anon role).
-- All writes still go through the Edge Function using the service_role key,
-- which bypasses RLS, so no INSERT/UPDATE/DELETE policies are needed here.

-- Courses: anyone can read the course catalogue
create policy "Public can read courses"
  on public.courses
  for select
  using (true);

-- Tasks: anyone can read tasks
create policy "Public can read tasks"
  on public.tasks
  for select
  using (true);

-- Completions: completed records are public (leaderboard / resume)
create policy "Public can read completed completions"
  on public.completions
  for select
  using (status = 'completed');