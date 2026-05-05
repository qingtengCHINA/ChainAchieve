-- 1. Fix profiles RLS: remove the permissive ALL policy.
--    Writes go through the Edge Function (service_role), which bypasses RLS entirely.
--    Anon/authenticated clients should only be able to read profiles.
DROP POLICY IF EXISTS "Self write" ON public.profiles;

-- 2. Leaderboard aggregation function for efficient server-side grouping.
--    Replaces in-memory JS aggregation that fetched every completion row.
CREATE OR REPLACE FUNCTION public.get_leaderboard(lim INT DEFAULT 20)
RETURNS TABLE(
  student_wallet TEXT,
  completion_count BIGINT,
  course_count     BIGINT,
  latest_at        TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    c.student_wallet,
    COUNT(*)                        AS completion_count,
    COUNT(DISTINCT t.course_id)     AS course_count,
    MAX(c.completed_at)             AS latest_at
  FROM completions c
  JOIN tasks t ON t.id = c.task_id
  WHERE c.status = 'completed'
  GROUP BY c.student_wallet
  ORDER BY completion_count DESC, latest_at ASC
  LIMIT lim;
$$;

-- 3. Course stats batch function — one call per teacher dashboard load
--    instead of 2N separate queries (one tasks + one completions per course).
CREATE OR REPLACE FUNCTION public.get_course_stats_batch(course_ids UUID[])
RETURNS TABLE(
  course_id          UUID,
  total_tasks        BIGINT,
  student_count      BIGINT,
  total_completions  BIGINT,
  earned_students    BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH task_counts AS (
    SELECT t.course_id, COUNT(*) AS total_tasks
    FROM tasks t
    WHERE t.course_id = ANY(course_ids)
    GROUP BY t.course_id
  ),
  completion_agg AS (
    SELECT
      t.course_id,
      c.student_wallet,
      COUNT(DISTINCT c.task_id) AS done_tasks
    FROM completions c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.status = 'completed'
      AND t.course_id = ANY(course_ids)
    GROUP BY t.course_id, c.student_wallet
  ),
  student_agg AS (
    SELECT
      ca.course_id,
      COUNT(*)                                               AS student_count,
      SUM(ca.done_tasks)                                     AS total_completions,
      COUNT(*) FILTER (WHERE ca.done_tasks >= tc.total_tasks) AS earned_students
    FROM completion_agg ca
    JOIN task_counts tc USING (course_id)
    GROUP BY ca.course_id
  )
  SELECT
    tc.course_id::UUID,
    tc.total_tasks,
    COALESCE(sa.student_count,     0) AS student_count,
    COALESCE(sa.total_completions, 0) AS total_completions,
    COALESCE(sa.earned_students,   0) AS earned_students
  FROM task_counts tc
  LEFT JOIN student_agg sa USING (course_id);
$$;
