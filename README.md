# RecallOS

## One-line pitch

"An adaptive AI study system that remembers how you learn."

## Problem

Conventional AI study assistants generate a study plan upfront and then leave it static. They don't maintain a persistent model of the learner's evolving performance. When you score poorly on a topic, the plan doesn't meaningfully change. When you master something quickly, it doesn't accelerate. The study schedule is the same on day 1 as it is on day 30, regardless of what actually happened during study sessions.

## Solution

RecallOS maintains a persistent learner state and continuously changes recommendations based on:

- **Accuracy** — how well you performed on each session
- **Confidence** — your self-assessed comfort level per topic
- **Mistakes** — specific error patterns that reveal conceptual gaps
- **Mastery** — estimated topic mastery that grows with performance
- **Goals** — what you're working toward and how much time remains
- **Time remaining** — days until your target date, which affects pacing

## Key Innovation

RecallOS does not simply generate a static study plan. Its core loop is:

```
Learner evidence (session results)
    ↓
Neural Pulse learner state (persisted, evolving)
    ↓
AI reasoning (Neural Pulse chat engine)
    ↓
Adaptive recommendation (next topic, activity, duration)
    ↓
New learner evidence (next session)
    ↓ ... repeats
```

Each session produces evidence. That evidence updates the learner state. The Neural Pulse AI engine reasons over the full state and generates a new recommendation. The next session is different because the last one happened.

## Neural Pulse Integration

RecallOS uses [Evorozen Neural Pulse](https://pulse.evorozen.com/docs) as its primary intelligence and learner-state layer.

**Endpoint:** `https://pulse.evorozen.com/api/neural`

**Server-side architecture:** The API key (`EVOROZEN_API_KEY`) is stored as a Supabase Edge Function secret and is never exposed to the client. All Neural Pulse calls pass through a server-side proxy edge function (`supabase/functions/neural-pulse`).

### Neural Pulse actions used

| Action | Purpose |
|--------|---------|
| `create_schema` | Registers the RecallOS table structure (learners, learning_topics, study_sessions, adaptive_plans) into Neural Pulse LivingDNA |
| `insert_data` | Persists learner setup, learning topics, study session results, and adaptive plan recommendations |
| `select_data` | Retrieves learner session history for the reasoning engine |
| `update_data` | Updates topic mastery, confidence, and session counts after each study session |
| `delete_data` | Cleans up learner records when a plan is reset |
| `chat` | Invokes the AI reasoning engine to generate adaptive recommendations based on learner state |

### Trace IDs

Every Neural Pulse response includes a `traceId` for debugging. RecallOS logs these in development mode only (`import.meta.env.DEV`) — never in production builds, and never alongside credentials.

### Why Neural Pulse is the primary layer

Neural Pulse stores the learner's living state, processes structured data operations, and provides the AI reasoning that generates each adaptive recommendation. The application also maintains a Supabase compatibility/cache layer for local persistence and UI state management, but the adaptive intelligence — the reasoning that decides what to study next — flows through Neural Pulse.

## Architecture

```
Student
    ↓
RecallOS React UI (Vite + TypeScript + Tailwind)
    ↓
Server-side Neural Pulse proxy (Supabase Edge Function)
    ↓
Evorozen Neural Pulse (https://pulse.evorozen.com/api/neural)
├── Living learner data
├── Structured data operations (insert, select, update, delete)
└── AI reasoning engine (chat)
    ↓
Adaptive recommendation
    ↓
RecallOS UI
```

## Data Model

### learners
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique learner identifier |
| subject | text | Study subject (e.g., Biology) |
| goal | text | Learning goal (e.g., Final exam preparation) |
| days_remaining | integer | Days until target date |
| daily_minutes | integer | Available study time per day |
| weak_topics | text[] | Topics the learner struggles with |
| current_day | integer | Current day in the study plan |
| created_at | timestamp | Setup timestamp |

### learning_topics
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique topic identifier |
| learner_id | uuid | Links to learner |
| name | text | Topic name (e.g., Genetics) |
| mastery | integer | Estimated mastery percentage (0-100) |
| confidence | text | Learner confidence level (low/medium/high) |
| sessions_completed | integer | Number of sessions on this topic |
| last_studied | timestamp | Last session timestamp |
| is_weak | boolean | Whether this is a weak area |

### study_sessions
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique session identifier |
| learner_id | uuid | Links to learner |
| topic | text | Topic studied |
| accuracy | integer | Percentage correct (0-100) |
| confidence | text | Self-assessed confidence |
| duration_minutes | integer | Session duration |
| mistakes | json | Array of mistake records |
| insight | text | Generated learning insight |
| day_number | integer | Which day in the plan |
| created_at | timestamp | Session timestamp |

### adaptive_plans
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique plan identifier |
| learner_id | uuid | Links to learner |
| priority_topic | text | AI-recommended next topic |
| recommended_activity | text | Type of study activity |
| reasoning | text | AI reasoning for the recommendation |
| estimated_duration | integer | Recommended session length |
| adaptation_notes | text | How the plan adapted from prior performance |
| day_number | integer | Which day this recommendation is for |
| trace_id | text | Neural Pulse trace ID |
| created_at | timestamp | Recommendation timestamp |

## Security

- `EVOROZEN_API_KEY` is stored as a Supabase Edge Function secret, accessible only server-side
- The key is never included in frontend source code, `VITE_*` environment variables, localStorage, or any client-accessible location
- All Neural Pulse API calls pass through the server-side edge function proxy at `/functions/v1/neural-pulse`
- Trace IDs are used for debugging without exposing credentials
- No secrets appear in logs, README, or user-facing UI

## Local Development

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   The `EVOROZEN_API_KEY` must be set as a Supabase Edge Function secret (not in `.env`).

3. **Configure Supabase / Edge Function:**
   The edge function source is at `supabase/functions/neural-pulse/index.ts`.
   Deploy via the Supabase MCP `deploy_edge_functions` tool.
   Ensure `EVOROZEN_API_KEY` is set as an edge function secret.

4. **Run development server:**
   ```
   npm run dev
   ```

5. **Build production version:**
   ```
   npm run build
   ```

## Verification

Results from the live smoke test performed on 2026-09-30:

| Check | Result |
|-------|--------|
| TypeScript / typecheck | PASS |
| Production build | PASS |
| Neural Pulse edge function deployed | PASS |
| create_schema | PASS — 4 tables registered, trace ID received |
| insert_data | PASS — learner record inserted, status: success |
| select_data | PASS — inserted record retrieved correctly |
| update_data | PASS — 2 fields modified, status: success |
| delete_data | PASS — demo record cleaned up, deleted_count: 1 |
| chat endpoint | HTTP 200 + trace ID received. During the final smoke test, the Neural Pulse AI engine returned a temporary service-unavailable message from the provider side. RecallOS correctly falls back to Offline Mode with a local adaptive recommendation when this occurs. The chat action's API connectivity, authentication, and proxy infrastructure are verified; the AI reasoning engine itself was temporarily unavailable. |

## Go-To-Market

### Initial audience
Students preparing for exams and intensive coursework.

### Acquisition
- Short-form study content demonstrating the adaptive loop
- Student Discord communities
- Reddit and student communities where permitted
- Student ambassadors on university campuses
- Shareable progress snapshots showing mastery growth

### Growth loop
```
Student creates study plan
→ gets personalized progress
→ shares progress
→ another student joins
→ referral / organic acquisition
```

### Monetization

**Free:**
- One active study goal
- Core adaptive planning
- Basic progress dashboard

**Premium:**
- Multiple goals / subjects
- Deeper learner analytics
- Advanced adaptive scheduling
- Longer-term learning history

## Future Expansion

- More subjects with domain-specific assessment banks
- Richer assessment signals (free-response, timed problems, spaced repetition intervals)
- Exam-specific planning templates (SAT, MCAT, bar exam, certifications)
- Educator dashboards for classroom use
- Institutional and student-community distribution channels

---

RecallOS is a new project built for the Evorozen Neural Pulse hackathon. It is not derived from or copied from any prior codebase.
