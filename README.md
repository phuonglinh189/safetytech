# Digital Safety Technology Maturity Workshop

Static, no-build site (same pattern as the Target_game reference repo): plain HTML/JS/CSS on GitHub Pages, data synced through Supabase.

## Pages
- `/consent/` — bilingual participant information and consent gate; an expert ID is created only after consent is recorded.
- `/assessment-tool/` — consented expert provides organization role, company/organization name and size, ranks current & target level (1–5) for 22 indicators across 4 domains, submits, and downloads a one-page PDF report.
- `/validation/` — submitted expert completes the bilingual maturity-model Validation form with the organization role prefilled and locked, four remaining background questions, 13 sliders and optional comments.
- `/control/` — host-only page: set number of experts (no password, unlisted link), lock the survey, reveal/hide results, watch live submission status and domain averages.
- `/presentation/` — public display: live "N of M submitted" counter, then full radar charts + averages once the host clicks "Show Results".

## One-time Supabase setup
1. Create a project at supabase.com.
2. SQL editor → run:

```sql
begin;

create table if not exists public.experts (
  id text primary key,
  status text not null default 'unassigned',
  current_levels jsonb not null default '{}'::jsonb,
  target_levels jsonb not null default '{}'::jsonb,
  organization_profile jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  submitted_at timestamptz,
  consent_given boolean not null default false,
  consented_at timestamptz,
  consent_version text,
  consent_language text,
  validation_answers jsonb not null default '{}'::jsonb,
  validation_status text not null default 'not_started',
  validation_version text,
  validation_submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_config (
  key text primary key,
  max_experts int not null default 15,
  results_revealed boolean not null default false,
  survey_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.workshop_config (key, max_experts) values ('main', 15)
on conflict (key) do nothing;

alter table public.experts enable row level security;
alter table public.workshop_config enable row level security;

-- The browser uses the Supabase publishable/anon key.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.experts to anon, authenticated;
grant select, update on table public.workshop_config to anon, authenticated;

-- CREATE POLICY has no IF NOT EXISTS, so drop each policy before recreating it.
drop policy if exists "experts read" on public.experts;
drop policy if exists "experts insert" on public.experts;
drop policy if exists "experts update" on public.experts;
drop policy if exists "experts delete" on public.experts;

create policy "experts read"
on public.experts for select
to anon, authenticated
using (true);

create policy "experts insert"
on public.experts for insert
to anon, authenticated
with check (true);

create policy "experts update"
on public.experts for update
to anon, authenticated
using (true)
with check (true);

create policy "experts delete"
on public.experts for delete
to anon, authenticated
using (true);

drop policy if exists "config read" on public.workshop_config;
drop policy if exists "config update" on public.workshop_config;

create policy "config read"
on public.workshop_config for select
to anon, authenticated
using (true);

create policy "config update"
on public.workshop_config for update
to anon, authenticated
using (true)
with check (true);

commit;
```

For every Supabase project, run `supabase-organization-report-migration.sql` after the base SQL above; it adds the profile column and creates the private `assessment-reports` bucket with an insert-only PDF policy. For an existing project that predates Consent or Validation, also run `supabase-consent-migration.sql` and `supabase-validation-migration.sql`. The migrations use `add column if not exists` or idempotent Storage setup, so they are safe to run again.

3. Project Settings → API → copy the Project URL and the publishable/anon key into `shared/database-config.js` (`supabaseUrl`, `supabaseKey`). Keep `reportsBucket` set to `assessment-reports` unless the SQL migration and config are changed together.
4. Push to GitHub, enable Pages → GitHub Actions (the included workflow deploys automatically on push to `main`).

Before a new workshop: in `/control/`, set the expert count (15–17) and make sure "lock survey" is off. When all experts are in, click **Show Results** to reveal them on `/presentation/`. A fresh participant follows `/consent/` → `/assessment-tool/` → `/validation/`. Assessment submission remains the workshop submission count; Validation completion is tracked separately in Control. The same browser can resume unfinished Assessment and Validation progress for its assigned Expert ID.

## Files you edit yourself (content stays dynamic, no code changes needed)
- `data/indicators.json` — the 22 indicators: code, domain, English + Mandarin name/description/5-level text. Numbers, indicator codes and domain groupings should not change; wording can.
- `data/indicator_weights.csv` — `global_weight` (weight of each indicator overall) and `domain_weight` (its normalized weight within its own domain, should sum to 1 per domain).
- `data/domain_weights.csv` — weight of each domain toward the overall maturity score (should sum to 1).
- `data/ui_text.json` — every page label, button, instruction, and level-meaning string, in English and Mandarin (`{"key": {"en": "...", "zh": "..."}}`).
- `data/consent_text.json` — the bilingual consent content and consent version used by the consent gate.
- `data/validation_text.json` — the bilingual expert-background questions, 13 Validation criteria, scale labels and Validation form version.
- `data/organization_profile.json` — bilingual organization role/size labels and the contractor class mapping (A/B/C ↔ 甲/乙/丙).
- `data/maturity_level_transition_recommendations.json` — bilingual recommendation text for each maturity-level transition shown in the PDF.

The `organization_profile` JSON stores `role`, `role_other`, `company_name`, and `size`. Each PDF download is generated once in the selected language. The same Blob is downloaded locally and archived to the private Supabase Storage path `{expertId}/{timestamp}-{language}.pdf`. If the Storage upload fails, the local download still proceeds and the participant sees a warning.

**Note:** the Mandarin level-by-level descriptions in `indicators.json` were carried over from an earlier version of this tool and may not exactly match the current English wording — worth a review pass before your first workshop.

## Language switching
Add `?lang=zh` to any page URL (or click the language link in the top bar) for Mandarin; default is English.
