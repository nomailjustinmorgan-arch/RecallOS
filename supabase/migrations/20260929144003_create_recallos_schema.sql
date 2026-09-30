/*
# Create RecallOS database schema

## Purpose
Stores study plans, adaptive topic states, session results, and mistake records
for the RecallOS adaptive AI study system. This is a single-tenant app with no
authentication — all data is intentionally shared/public and accessible via the
anon key.

## New Tables

### 1. study_plans
The root entity — a student's study plan configuration.
- `id` (uuid, primary key)
- `subject` (text, not null) — the subject being studied
- `goal` (text, not null) — the student's goal
- `days_remaining` (integer, not null) — days until target date
- `daily_minutes` (integer, not null) — minutes available per day
- `weak_topics` (text[], default empty) — optional weak topic tags
- `current_day` (integer, default 1) — which day the student is on
- `created_at` (timestamptz, default now)

### 2. topics
Per-topic adaptive state, scoped to a study plan.
- `id` (uuid, primary key)
- `plan_id` (uuid, FK → study_plans, cascade delete)
- `name` (text, not null) — topic name
- `mastery` (integer, default 0) — 0–100 estimated mastery
- `confidence` (text, default 'low') — 'low' | 'medium' | 'high'
- `sessions_completed` (integer, default 0)
- `last_studied` (timestamptz, nullable) — last session timestamp
- `is_weak` (boolean, default false) — flagged weak area
- `created_at` (timestamptz, default now)

### 3. sessions
Session results — one row per completed study session.
- `id` (uuid, primary key)
- `plan_id` (uuid, FK → study_plans, cascade delete)
- `topic` (text, not null) — topic studied
- `day_number` (integer, not null)
- `accuracy` (integer, not null) — 0–100
- `confidence` (text, not null) — 'low' | 'medium' | 'high'
- `duration_minutes` (integer, not null)
- `insight` (text, not null) — generated learning insight
- `next_recommendation` (text, not null) — next session recommendation
- `created_at` (timestamptz, default now)

### 4. mistakes
Individual mistakes within a session, with pattern analysis.
- `id` (uuid, primary key)
- `session_id` (uuid, FK → sessions, cascade delete)
- `question` (text, not null) — the question prompt
- `user_answer` (text, not null) — what the student answered
- `correct_answer` (text, not null) — the correct answer
- `pattern` (text, not null) — identified mistake pattern
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on all four tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant no-auth app — the data is intentionally public.
- No user_id columns or auth.uid() checks since there is no authentication.

## Indexes
- `topics.plan_id` — frequent lookups by plan
- `sessions.plan_id` — frequent lookups by plan
- `sessions.created_at` — dashboard recent sessions ordering
- `mistakes.session_id` — lookups by session
*/

-- ── study_plans ──
CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  goal text NOT NULL,
  days_remaining integer NOT NULL,
  daily_minutes integer NOT NULL,
  weak_topics text[] NOT NULL DEFAULT '{}',
  current_day integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_study_plans" ON study_plans;
CREATE POLICY "anon_select_study_plans" ON study_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_study_plans" ON study_plans;
CREATE POLICY "anon_insert_study_plans" ON study_plans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_study_plans" ON study_plans;
CREATE POLICY "anon_update_study_plans" ON study_plans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_study_plans" ON study_plans;
CREATE POLICY "anon_delete_study_plans" ON study_plans FOR DELETE
  TO anon, authenticated USING (true);

-- ── topics ──
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  mastery integer NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
  sessions_completed integer NOT NULL DEFAULT 0,
  last_studied timestamptz,
  is_weak boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_topics" ON topics;
CREATE POLICY "anon_select_topics" ON topics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_topics" ON topics;
CREATE POLICY "anon_insert_topics" ON topics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_topics" ON topics;
CREATE POLICY "anon_update_topics" ON topics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_topics" ON topics;
CREATE POLICY "anon_delete_topics" ON topics FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_topics_plan_id ON topics(plan_id);

-- ── sessions ──
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  topic text NOT NULL,
  day_number integer NOT NULL,
  accuracy integer NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  duration_minutes integer NOT NULL,
  insight text NOT NULL,
  next_recommendation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_plan_id ON sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- ── mistakes ──
CREATE TABLE IF NOT EXISTS mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question text NOT NULL,
  user_answer text NOT NULL,
  correct_answer text NOT NULL,
  pattern text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mistakes" ON mistakes;
CREATE POLICY "anon_select_mistakes" ON mistakes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mistakes" ON mistakes;
CREATE POLICY "anon_insert_mistakes" ON mistakes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mistakes" ON mistakes;
CREATE POLICY "anon_update_mistakes" ON mistakes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mistakes" ON mistakes;
CREATE POLICY "anon_delete_mistakes" ON mistakes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_mistakes_session_id ON mistakes(session_id);
