begin;

alter table public.experts
  add column if not exists validation_answers jsonb not null default '{}'::jsonb,
  add column if not exists validation_status text not null default 'not_started',
  add column if not exists validation_version text,
  add column if not exists validation_submitted_at timestamptz;

grant select, insert, update
on table public.experts to anon, authenticated;

commit;
