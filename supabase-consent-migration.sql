begin;

alter table public.experts
  add column if not exists consent_given boolean not null default false,
  add column if not exists consented_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists consent_language text;

grant select, insert, update
on table public.experts to anon, authenticated;

commit;
`