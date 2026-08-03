# Digital Safety Technology Maturity Workshop

Static, no-build site (same pattern as the Target_game reference repo): plain HTML/JS/CSS on GitHub Pages, data synced through Supabase.

## Pages
- `/assessment-tool/` — expert picks an auto-assigned ID, ranks current & target level (1–5) for 22 indicators across 4 domains, submits, downloads a PDF report.
- `/control/` — host-only page: set number of experts (no password, unlisted link), lock the survey, reveal/hide results, watch live submission status and domain averages.
- `/presentation/` — public display: live "N of M submitted" counter, then full radar charts + averages once the host clicks "Show Results".

## One-time Supabase setup
1. Create a project at supabase.com.
2. SQL editor → run:

```sql
create table if not exists public.experts (
  id text primary key,
  status text not null default 'unassigned',
  current_levels jsonb not null default '{}'::jsonb,
  target_levels jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  submitted_at timestamptz,
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

create policy "experts read" on public.experts for select using (true);
create policy "experts insert" on public.experts for insert with check (true);
create policy "experts update" on public.experts for update using (true) with check (true);

create policy "config read" on public.workshop_config for select using (true);
create policy "config update" on public.workshop_config for update using (true) with check (true);
```

3. Project Settings → API → copy the Project URL and the publishable/anon key into `shared/database-config.js` (`supabaseUrl`, `supabaseKey`).
4. Push to GitHub, enable Pages → GitHub Actions (the included workflow deploys automatically on push to `main`).

Before a new workshop: in `/control/`, set the expert count (15–17) and make sure "lock survey" is off. When all experts are in, click **Show Results** to reveal them on `/presentation/`. Anyone with a fresh browser opening `/assessment-tool/` gets the next free ID automatically; the same browser reopening it resumes their own progress.

## Files you edit yourself (content stays dynamic, no code changes needed)
- `data/indicators.json` — the 22 indicators: code, domain, English + Mandarin name/description/5-level text. Numbers, indicator codes and domain groupings should not change; wording can.
- `data/indicator_weights.csv` — `global_weight` (weight of each indicator overall) and `domain_weight` (its normalized weight within its own domain, should sum to 1 per domain).
- `data/domain_weights.csv` — weight of each domain toward the overall maturity score (should sum to 1).
- `data/ui_text.json` — every page label, button, instruction, and level-meaning string, in English and Mandarin (`{"key": {"en": "...", "zh": "..."}}`).

**Note:** the Mandarin level-by-level descriptions in `indicators.json` were carried over from an earlier version of this tool and may not exactly match the current English wording — worth a review pass before your first workshop.

## Language switching
Add `?lang=zh` to any page URL (or click the language link in the top bar) for Mandarin; default is English.
