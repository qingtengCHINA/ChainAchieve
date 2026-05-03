create table if not exists public.courses (
  id uuid primary key,
  name text not null,
  symbol text not null,
  description text not null,
  image_url text not null default '',
  teacher_wallet text not null,
  mint_address text,
  metadata_url text,
  config_key text,
  launch_signature text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null,
  description text not null,
  token_reward integer not null default 100 check (token_reward > 0),
  sort_order integer not null default 0
);

create table if not exists public.completions (
  id uuid primary key,
  task_id uuid not null references public.tasks(id) on delete restrict,
  student_wallet text not null,
  tx_signature text,
  completed_at timestamptz not null default now(),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  unique (task_id, student_wallet)
);

create index if not exists idx_courses_created_at on public.courses (created_at desc);
create index if not exists idx_courses_teacher_wallet on public.courses (teacher_wallet);
create index if not exists idx_tasks_course_sort on public.tasks (course_id, sort_order);
create index if not exists idx_completions_task on public.completions (task_id);
create index if not exists idx_completions_student_status on public.completions (student_wallet, status);
create index if not exists idx_completions_status_completed_at on public.completions (status, completed_at desc);

alter table public.courses enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('chainachieve-frontend', 'chainachieve-frontend', true, 52428800)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public ChainAchieve frontend assets are readable'
  ) then
    create policy "Public ChainAchieve frontend assets are readable"
      on storage.objects
      for select
      using (bucket_id = 'chainachieve-frontend');
  end if;
end
$$;
