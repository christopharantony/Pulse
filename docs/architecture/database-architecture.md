# Pulse — Backend & Database Architecture

**Status:** Planning document, no implementation code.
**Grounded against actual repo state as of this writing:** Next.js 15 (App Router), native `mongodb` driver (no ORM), TypeScript, Zod, feature-based folders (`src/features/{auth,tasks,habits,goals,calendar,dashboard,profile}`), JWT auth with refresh-token rotation already implemented in `src/lib/auth/*` and `src/db/client.ts`.

---

## 0. Executive Summary & Where I'm Pushing Back

You asked me to challenge assumptions, so here are the four places I disagree with the brief as written, before the detailed design. Everything after this section assumes these positions.

**1. "Pulse starts as a personal product, design so it can *later* support teams" — I disagree with the word "later."**
Adding `workspaceId` to every document and introducing a `workspaces` collection now costs you one extra field and one extra index. Retrofitting tenancy onto a live database — every collection, every query, every index, every API contract — after you have real user data is one of the most expensive migrations in SaaS engineering, and it's usually done under pressure because a customer is asking for a team plan. I'm designing tenancy in from day one (Section 11), with team features staying dark/unbuilt in the UI. This is the single highest-leverage decision in this document.

**2. "Design a single generic activity model that every timer session references" — correct instinct, but I'm splitting it into two collections, not one.**
Conflating "the thing that can be timed" with "a recorded interval of time" produces a collection that mixes slow-changing metadata with high-frequency append-only writes, which is a MongoDB anti-pattern (Section 5, Section 10). I'm proposing `activities` (lightweight pointer/metadata) + `time_sessions` (append-only interval log), connected by `activityId`. This is how Toggl/Clockify actually model it, and it's what makes the timer system genuinely independent of Task/Habit, which was your explicit requirement.

**3. MongoDB is a defensible choice here, but I want it on the record that it's not the obvious one.** Pulse's domain (User → Workspace → Project → Task → Activity → TimeSession, plus Habit/Goal/Calendar cross-references, recurrence rules, and rollup analytics) is more relationally-shaped than document-shaped. A relational engine (Postgres) would give you multi-document transactions without replica-set caveats, foreign key integrity you don't have to hand-enforce in application code, and much easier ad-hoc analytics via SQL. I'm not recommending you switch — you've already built auth on the native `mongodb` driver and re-platforming now would cost far more than it buys — but every design decision from here on exists to compensate for things Postgres would give you for free (referential integrity, transactional multi-collection writes, ad-hoc joins). I flag each compensation explicitly as it comes up.

**4. "Repository Pattern" doesn't have to mean Java-style classes.** Your existing code (`src/db/client.ts`, `src/lib/auth/session.ts`) already uses plain async functions operating on typed `Collection<T>` objects, not classes. I'm recommending you formalize that into a repository *pattern* (a consistent factory producing typed, testable data-access modules) rather than introduce class hierarchies and `this`-binding that don't match the rest of the codebase. Same architectural guarantees (SRP, dependency inversion, testability), less ceremony.

Everything below is designed under these four positions.

---

## 1. Domain Analysis

| Domain | Responsibility |
|---|---|
| **Identity & Access** | Authentication (already built), password/session lifecycle, email verification. Owns *who can log in*, not *what they can do*. |
| **Workspace (Tenancy)** | The billing/permission boundary. Every other domain's data lives inside exactly one workspace. Owns membership, roles, invitations. |
| **User / Profile** | Personal identity, preferences, display info. Distinct from Workspace because a user can belong to multiple workspaces. |
| **Project** | A named container that groups Tasks (and optionally Notes/Calendar events) toward an outcome. Pure organization, no business logic of its own. |
| **Task** | Discrete units of work with status, due dates, priority, checklist items. The most-read, most-written domain in the app. |
| **Habit** | Recurring commitments tracked by completion streaks, not by "done/not done" like a task. Different lifecycle semantics from Task even though both are "schedulable." |
| **Goal** | Longer-horizon outcomes that Tasks/Habits/time can roll up into. Mostly a *view* over other domains plus its own targets/milestones. |
| **Activity** | The central, source-agnostic "thing that can be timed." Decouples the timer engine from Task/Habit/Goal/Calendar entirely. This is the domain the rest of the system pivots around (Section 5). |
| **Time Tracking** | Owns the actual start/stop interval records (`time_sessions`) and the "exactly one running timer per user" invariant. Reads Activity, never Task/Habit directly. |
| **Calendar** | Time-boxed events on a date/time grid. Can originate an Activity (timing a meeting/event) same as Task/Habit can. |
| **Notes** | Freeform rich-text content, optionally linked to a Project/Task/Goal. Independent lifecycle — notes can exist with zero relationships. |
| **Notifications** | Cross-domain fan-in: reminders, due-date alerts, habit-streak warnings, mentions. Reads from every domain but is written to by none of them directly (see Section 7). |
| **Analytics** | Read-optimized rollups derived from Activity/TimeSession/Task/Habit data. Never a source of truth — always derived, always rebuildable. |
| **Settings** | Per-user and per-workspace configuration (theme, notification preferences, default project, week-start-day, etc). |
| **AI (future)** | Natural-language command parsing and contextual memory. Consumes the same service layer everything else does — it is a new *caller*, not a new *data model* (Section 12). |
| **Team Collaboration (future)** | Built entirely on top of Workspace membership/roles established in Section 11. No new tenancy concept needed. |

---

## 2. Database Collections

Legend: **Phase 1** = build for MVP now. **Phase 2** = build when the feature ships (schema/indexes reserved now where cheap). **Phase 3** = future, mentioned for completeness only.

| Collection | Phase | Purpose | Relationships | Expected size / growth | Indexing strategy |
|---|---|---|---|---|---|
| `users` | 1 (exists) | Login identity, profile basics | 1 workspace membership → N via `workspace_members` | Low — 1 doc/user | unique `email` (exists) |
| `sessions`, `email_verification_tokens`, `password_reset_tokens`, `rate_limit_attempts` | 1 (exists) | Auth infra | → `users` | Self-pruning via TTL | already indexed, see `src/db/client.ts` |
| `workspaces` | **1 — new, foundational** | Tenancy boundary, billing anchor | 1 → N `workspace_members`, 1 → N of every domain collection | Low — 1 doc/tenant (≈1 per user at launch) | unique `slug`; `ownerId` |
| `workspace_members` | **1 — new, foundational** | Who belongs to a workspace, with what role | `workspaceId` + `userId` | Low, grows with team size | compound unique `{workspaceId, userId}`; `{userId}` for "my workspaces" lookup |
| `workspace_invitations` | 2 | Pending invites | `workspaceId`, invited email | Low, self-expiring | `{tokenHash}` unique; TTL on `expiresAt` |
| `projects` | 1 | Group tasks toward an outcome | `workspaceId`; 1 → N `tasks` | Low-medium | `{workspaceId, isArchived}` |
| `tasks` | 1 | Unit of work | `workspaceId`, `projectId?`, `assigneeId` (future team), tags | **High** — largest collection long-term | see Section 9 |
| `task_comments` | 2 | Discussion thread per task | `taskId` | Medium, unbounded per task | `{taskId, createdAt}` |
| `habits` | 1 | Habit definition (recurrence rule, target) | `workspaceId` | Low | `{workspaceId, isArchived}` |
| `habit_logs` | 1 | One doc per day a habit was completed/skipped | `habitId`, `userId` | **High** — grows daily per habit, forever | compound unique `{habitId, date}` |
| `goals` | 2 | Long-horizon target, links to Tasks/Habits/time totals | `workspaceId`; loosely references Tasks/Habits via tags or explicit link array | Low | `{workspaceId, status}` |
| `activities` | **1 — central domain** | Polymorphic pointer: "the thing being timed" | `sourceType` + `sourceId` → Task/Habit/Goal/CalendarEvent/none | Medium — one per distinct trackable thing + custom/quick activities | see Section 5 & 9 |
| `time_sessions` | **1 — central domain** | Append-only start/stop interval log | `activityId` | **Highest write volume in the system** | see Section 5 & 9 |
| `calendar_events` | 1 | Time-boxed events | `workspaceId`, optional `taskId` link | Medium | `{workspaceId, startsAt}` |
| `notes` | 2 | Rich-text content | `workspaceId`, optional link to Project/Task/Goal | Medium, individual docs can be large | text index on extracted plain text |
| `note_versions` | 3 | Version history for notes | `noteId` | Unbounded — cap or TTL old versions | `{noteId, createdAt}` |
| `tags` | 1 | Shared taxonomy across Task/Note/Habit/Goal | `workspaceId` | Low | unique `{workspaceId, name}` |
| `notifications` | 2 | Fan-in alerts for a user | `userId`, references source entity | Medium-high, prune old read ones | `{userId, createdAt}`; TTL on read+aged docs |
| `analytics_daily_rollups` | 2 | Precomputed per-user/day aggregates (time tracked, tasks completed, habit streaks) | `workspaceId`, `userId`, `date` | Low relative to source data — 1 doc/user/day | unique `{workspaceId, userId, date}` |
| `attachments` | 3 | File metadata (blob lives in object storage) | polymorphic `ownerType/ownerId` | Medium | `{ownerType, ownerId}` |
| `webhooks`, `webhook_deliveries` | 3 | Outbound integration events | `workspaceId` | deliveries unbounded, TTL after N days | `{workspaceId}`; TTL on deliveries |
| `api_keys` | 3 | Public API auth | `workspaceId` | Low | unique hashed key |
| `subscriptions` | 3 | Billing state mirrored from Stripe | `workspaceId` | Low, 1/workspace | unique `{workspaceId}` |
| `audit_logs` | 3 | Security/compliance trail once roles exist | `workspaceId` | High, append-only | `{workspaceId, createdAt}`; consider capped or TTL |

**Why not embed more?** Todoist/Notion-style products tempt you to embed checklist items in a task, log entries in a habit, comments in a task. I'm keeping those as separate referenced collections wherever the child grows *unboundedly* (comments, habit logs, time sessions, note versions) and embedding only where the child is small and *bounded by product design* (e.g. a task's checklist sub-items, capped at some reasonable UI limit). This is the standard MongoDB embed-vs-reference heuristic: **embed what's read together and bounded, reference what grows without bound.**

---

## 3. Entity Design

I'll go deep on the entities that carry real design decisions (Workspace, Task, Habit, Activity, TimeSession) rather than restate CRUD-obvious fields for every collection.

### Workspace
- **Required:** `_id`, `name`, `slug`, `ownerId`, `plan` (`personal` default), `createdAt`.
- **Optional:** `settings` (embedded — small, bounded, always read with the workspace: default week-start, timezone, theme).
- **Embedded vs referenced:** members are **referenced** (`workspace_members`), not embedded, even though today every workspace has exactly one member. An embedded members array is the classic mistake — it works at 1 member and becomes a hot, lock-contended document the moment teams ship and members start being added/removed/role-changed concurrently.
- **Ownership:** owned by `ownerId` (a user); transfer-of-ownership is a service-level operation, not a field mutation, because it has side effects (billing contact change, audit log).
- **Lifecycle:** created implicitly at user registration (auto-provision a "Personal Workspace"). Never hard-deleted while it has children — soft-delete only (`deletedAt`), because deleting a workspace cascades to every domain collection and must be a reviewable, reversible, async operation, not a synchronous `deleteOne`.

### Task
- **Required:** `_id`, `workspaceId`, `title`, `status` (enum: `todo`/`in_progress`/`done`), `createdBy`, `createdAt`, `updatedAt`.
- **Optional:** `projectId`, `dueDate`, `priority`, `description` (rich text), `checklist` (embedded array, bounded), `tagIds` (array of ObjectId), `recurrence` (shared `Schedulable` shape — see below), `assigneeId` (future team).
- **Embedded vs referenced:** checklist items embedded (small, bounded, always rendered with the task). Comments referenced (`task_comments` — unbounded). Tags referenced by id, not embedded by value, so renaming a tag doesn't require rewriting every task.
- **Ownership:** `createdBy` for audit; visibility/access controlled by `workspaceId` + workspace membership, not by an owner field, since tasks are workspace-scoped, not user-scoped, from day one.
- **Lifecycle:** soft-delete (`deletedAt`) to support trash/undo — Notion/Todoist-parity feature the brief didn't ask for explicitly but is table-stakes for this product category. Hard-delete only via a scheduled purge job after N days in trash.
- **Validation:** enforce `status` enum and `dueDate` sanity (not required to be future — users log past-due tasks) at the Zod validator layer, not in the database. MongoDB schema validation (`$jsonSchema`) can be layered on as a second line of defense but should never be the *only* enforcement, since it's easy to drift from application-level Zod schemas.

### Habit
- **Required:** `_id`, `workspaceId`, `name`, `recurrence` (shared `Schedulable` shape), `createdAt`.
- **Optional:** `targetPerPeriod` (e.g., "3x per week"), `color`, `archivedAt`.
- **Critically: no timer fields, no streak-count field stored redundantly here beyond a denormalized cache.** Streaks are *derived* from `habit_logs`, cached onto the habit doc (`currentStreak`, `longestStreak`) and recomputed by the service layer on each log write — never trust a client to set a streak number directly.
- **`habit_logs` is the source of truth**, one document per `{habitId, date}` — not an array embedded in `habits`, because that array grows forever and MongoDB arrays that grow without bound degrade update performance and eventually threaten the 16MB document limit for long-lived habits (a daily habit tracked for 10 years is 3,650 entries — still under the limit today, but there's no reason to accept that risk when a referenced collection costs nothing extra).

### Shared `Schedulable` shape (not a collection — a reused sub-schema)
Task, Habit, Goal, and CalendarEvent all need recurrence/scheduling (due date, repeat rule, reminder offsets). Rather than duplicate this logic four times with four chances to drift, define one `Schedulable` value shape (recurrence rule, reminder config) at the TypeScript-type and Zod-validator level, reused by all four entity types. MongoDB doesn't enforce shared schemas across collections the way a relational base table would, so this reuse **must** be enforced at the application layer (shared Zod schema + shared TypeScript type), not assumed from the database.

### Activity & TimeSession
Covered in full in Section 5 — this is the domain that matters most.

---

## 4. Relationships

```
Workspace
  │
  ├── workspace_members ── User (M:N via join collection)
  │
  ├── Project
  │     └── Task ──────────────┐
  │                             │
  ├── Habit ────────────────────┼── (lazy, optional) ──▶ Activity ──▶ TimeSession (1:N)
  │                             │                            ▲
  ├── Goal ──────────────────────┘                            │
  │                                                            │
  ├── CalendarEvent ───────────────────────────────────────────┘
  │
  ├── Activity (sourceType = "custom" / "quick_focus", sourceId = null)
  │
  ├── Note ── (optional) ──▶ Project / Task / Goal
  │
  └── Tag ── (M:N, referenced by id) ──▶ Task / Note / Habit / Goal
```

**Why each relationship exists:**

- **Workspace → everything:** the tenancy boundary (Section 11). Every query in the system is implicitly scoped by `workspaceId` — this is the single filter that makes "personal today, team tomorrow" possible without a rewrite.
- **Project → Task (1:N, referenced):** a task belongs to at most one project; a project has many tasks. Referenced, not embedded, because Task is independently queried far more often than "give me a project and all its tasks" (task lists, today view, search all cut across projects).
- **Task/Habit/Goal/CalendarEvent → Activity (lazy, optional, one-directional):** this is the load-bearing relationship in the whole design, detailed in Section 5. Note the arrow direction — **Activity points back at its source via `sourceId`, the source never points at Activity.** Task/Habit/Goal/CalendarEvent have zero fields related to timing. That's what "the timer system is independent from Tasks and Habits" means at the schema level, not just the code level.
- **Activity → TimeSession (1:N, referenced):** one activity accumulates many timed intervals over its life. Always referenced — this is the highest-write-volume relationship in the system and must never be an embedded array (Section 10).
- **Note → Project/Task/Goal (optional, referenced):** a note can exist standalone (a journal entry) or be attached to something. Optional reference, never required, because forcing every note into a parent contradicts how freeform note-taking actually gets used.
- **Tag → Task/Note/Habit/Goal (M:N via id array):** referenced by ObjectId array on each entity rather than a join collection, because tag sets per entity are small and bounded (a task rarely has more than a handful of tags) — this is one of the few M:N relationships where the embedded-array-of-ids pattern is correct instead of a join collection, precisely because it's bounded.

---

## 5. Activity Engine (Central Domain)

This is the most important design decision in the document, so I'm giving it the space it needs.

### The core problem with a single "Activity" collection
If `activities` holds both the definition of a trackable thing *and* every interval ever tracked against it, you get one collection serving two totally different access patterns: rare writes to slow-changing metadata (title, color, archived state) interleaved with extremely frequent writes to fast-changing state (is a timer running right now, what's the latest interval). That collision is a classic MongoDB anti-pattern — hot fields and cold fields sharing a document mean every timer tick contends with metadata reads, and the document's write-frequency profile becomes unpredictable as the product grows. Splitting into two collections avoids this entirely and maps directly onto how every real timer product (Toggl, Clockify) models it.

### `activities` — the polymorphic pointer
Represents "a thing that can be timed," created **lazily**: the first time a user starts a timer against a Task/Habit/Goal/CalendarEvent, the service layer does a `findOrCreate` on `activities` keyed by `{workspaceId, sourceType, sourceId}`. Task/Habit/Goal/CalendarEvent never need to know an Activity exists until someone starts a timer on them.

Key fields (conceptually, not code):
- `sourceType`: `task | habit | goal | calendar_event | quick_focus | custom`
- `sourceId`: ObjectId reference to the origin document, or `null` for `quick_focus`/`custom`
- `title`, `color`/`icon`: **denormalized snapshot** copied from the source at creation time (and refreshed on source rename) — this lets the time-tracking UI render a running-timer widget or a timesheet without joining back to four different collections depending on `sourceType`. This is a deliberate, bounded denormalization: it can drift from the source of truth for a short window between a rename and the next sync, which is an acceptable tradeoff for a UI-display-only field.
- `totalTrackedSeconds`, `lastTrackedAt`: **denormalized rollup**, updated atomically (`$inc`) every time a session stops. This is what makes "show total time spent on this task" an O(1) read instead of an aggregation over every session ever recorded.
- `isArchived`

### `time_sessions` — the append-only interval log
- `activityId`, `userId`, `workspaceId`
- `startedAt`, `endedAt` (`null` while running)
- `durationSeconds` — computed and written once, at stop time, not recomputed on every read
- `note` (optional, per-interval annotation — "worked on X")

**The one invariant that matters:** a user can have at most one running timer at a time, *regardless of source* — that's the entire point of unifying the model. Enforce this with a **partial unique index** on `{userId: 1}` where `endedAt: null` (detailed in Section 9), so the database — not application code — guarantees it even under concurrent requests (double-click "start timer," two browser tabs, etc). Application code should still check-and-stop-existing before starting a new one for good UX (a friendly "you had a timer running on X, we stopped it" message), but the index is the actual correctness guarantee.

### How every consumer plugs in

| Consumer | How it connects | What it never needs to know |
|---|---|---|
| **Task** | `activities.findOrCreate({sourceType: 'task', sourceId: task._id})` when "Start Timer" is clicked on a task | Nothing about timers, sessions, or the running-timer invariant |
| **Habit** | Same pattern, `sourceType: 'habit'` — timing a habit session (e.g., a 20-minute meditation habit) | Same |
| **Goal (future)** | Same pattern — lets a user time work directly against a goal without an intermediate task | Same |
| **Calendar Event** | Same pattern — "start timer" on a meeting to track actual vs. scheduled duration | Same |
| **Quick Focus** | `sourceType: 'quick_focus', sourceId: null` — title/description live directly on the Activity doc | N/A, it has no source |
| **Custom Activity** | `sourceType: 'custom'` — user-defined activities not tied to any task system ("Reading", "Exercise") | N/A |
| **Future AI** | Reads `time_sessions` joined with `activities.sourceType` to answer "how much time did I spend on X this week" without any domain-specific query logic — one query shape covers every source type | Nothing about Task/Habit/Goal internals — the Activity layer already normalized them |
| **Future Analytics** | Same — `analytics_daily_rollups` aggregates `time_sessions` grouped by `activities.sourceType`, giving "time by category" for free | Nothing domain-specific |

This is the payoff of the split: **every future feature that needs "time spent" only ever talks to `activities` + `time_sessions`.** Nobody writes a switch statement over Task-vs-Habit-vs-Goal query logic. That switch statement exists exactly once, at Activity-creation time, and nowhere else in the system.

---

## 6. Repository Layer

**Recommendation: typed factory functions producing data-access modules, not class hierarchies.** Your existing `src/db/client.ts` already does the first half of this (typed `Collection<T>` getters); I'm proposing you formalize the second half.

A `BaseRepository` (conceptually — described, not coded) provides, per collection:
- `findById`, `findOne(filter)`, `find(filter, {sort, limit, cursor})`
- `insertOne`, `updateOne` (by id, with `$set` + auto `updatedAt`)
- `softDelete` (sets `deletedAt`, never calls `deleteOne` for domain entities)
- `count(filter)`

Every domain repository (`TaskRepository`, `ActivityRepository`, `TimeSessionRepository`, …) is built on this shared base and adds collection-specific queries (e.g., `TimeSessionRepository.findRunningForUser(userId)`, `ActivityRepository.findOrCreateBySource(sourceType, sourceId)`).

**What must NOT live in repositories:**
- Business rules ("can this user start a timer right now") — that's a service concern.
- Cross-collection orchestration (stopping the old timer before starting a new one touches both `time_sessions` reads and writes plus `activities` rollup updates) — that's a service concern, because it spans repositories and needs to be transactional (Section 10 covers the transaction boundary).
- Authorization checks (does this user have access to this workspace) — that's a service/middleware concern; a repository should never need to know about the calling user's permissions, only the filter it's given.
- Side effects — sending notifications, updating denormalized counters on *other* collections, emitting webhook events. A repository touches exactly one collection.
- Request/response shaping (pagination envelope, API error codes) — that's an API-route concern.

This boundary is what makes the layer testable and swappable: a repository is "give me a filter, get typed documents back," nothing more.

---

## 7. Service Layer

Services own **business rules and cross-collection orchestration**. Concretely, for the Activity/TimeTracking domain:

`TimeTrackingService.startTimer(userId, workspaceId, {sourceType, sourceId})`:
1. Authorization: does this user have access to `sourceId` in `sourceType`'s collection, within `workspaceId`? (calls the relevant repository's `findById`, not a raw query)
2. `ActivityRepository.findOrCreateBySource(...)`
3. `TimeSessionRepository.findRunningForUser(userId)` — if one exists, stop it (compute duration, `$set endedAt`, `$inc` the old activity's `totalTrackedSeconds`)
4. `TimeSessionRepository.insertOne({activityId, userId, startedAt: now, endedAt: null})`
5. (future) emit a `timer.started` event for notifications/webhooks/AI-memory to observe, without those consumers being coupled into this function

That's five repository calls across two collections orchestrated as one business operation with one invariant (`only one running timer`) — exactly the kind of logic that must not live in a repository and must not live in a Next.js route handler either (route handlers should be thin: parse request → call service → shape response).

**What stays outside the service layer:** raw query construction (repository), HTTP concerns like status codes and request parsing (API route), UI state (client-side hooks/TanStack Query, which the codebase already separates well under `features/*/hooks`).

---

## 8. Query Strategy

- **Filtering:** build filter objects from validated Zod input (never trust raw query params into a Mongo filter directly — classic NoSQL injection surface if a client can pass operator objects like `{$ne: null}` through an unvalidated field). A shared `lib/query/build-filter.ts`-style utility maps an allow-listed set of filterable fields per domain to a Mongo filter.
- **Pagination: cursor-based from day one, not `skip`/`limit`.** `skip` degrades linearly as the offset grows (Mongo still has to walk past every skipped document) and is fine for a 50-user MVP but becomes a real problem on a `tasks` collection that's designed to be the largest in the system. More importantly, once a public API exists (Section 12), pagination shape is a contract you can't casually break — building cursor-based (`{createdAt, _id}` compound cursor) now avoids a breaking API change later for the cost of slightly more work today.
- **Sorting:** allow-listed sortable fields per domain (never accept an arbitrary field name to sort by — that's an index-less-query and a minor DoS surface).
- **Projections:** every list-view query uses an explicit projection that excludes large fields (rich-text `description`, embedded `checklist` if long) — list views and detail views are different read shapes and should query differently, not fetch-full-then-trim in application code.
- **Search:** MongoDB `$text` indexes (Section 9) are fine for "search my tasks" at current scale. Flag now, don't build now: once search needs fuzzy matching, ranking relevance across multiple entity types, or search-as-you-type latency, that's a signal to move to Atlas Search or an external engine (Meilisearch/Typesense) — don't over-invest in tuning `$text` relevance scoring, it has a ceiling.
- **Aggregations:** reserved for analytics rollups (Section 10) and genuinely relational reads (e.g., "tasks with their project name") via `$lookup` — used sparingly, never as the primary way to serve a list view.

Recommended shared utilities (described, not coded): `buildFilter()`, `buildPagination()` (cursor encode/decode), `buildSort()`, `withWorkspaceScope()` (injects `{workspaceId}` into every filter — see Section 11, this is the single most important utility in the system since forgetting it once is a cross-tenant data leak).

---

## 9. MongoDB Index Strategy

| Collection | Index | Type | Why |
|---|---|---|---|
| `users` | `{email: 1}` | unique | login lookup (exists) |
| `workspace_members` | `{workspaceId: 1, userId: 1}` | compound unique | prevents duplicate membership; primary membership-check lookup |
| `workspace_members` | `{userId: 1}` | single | "which workspaces am I in" on every request |
| `workspace_invitations` | `{tokenHash: 1}` | unique | invite acceptance lookup |
| `workspace_invitations` | `{expiresAt: 1}` | **TTL** | auto-expire stale invites |
| `projects` | `{workspaceId: 1, isArchived: 1}` | compound | project list view, filtered by tenant + archive state |
| `tasks` | `{workspaceId: 1, status: 1, dueDate: 1}` | compound | the "today/upcoming" view — the single most common query in the app |
| `tasks` | `{workspaceId: 1, projectId: 1}` | compound | project detail's task list |
| `tasks` | `{title: "text", description: "text"}` | text | in-app search |
| `tasks` | `{deletedAt: 1}` | sparse | trash view / purge job |
| `habit_logs` | `{habitId: 1, date: 1}` | compound unique | one log per habit per day; also the streak-calculation query |
| `activities` | `{workspaceId: 1, sourceType: 1, sourceId: 1}` | compound unique | the `findOrCreateBySource` lookup — this is the index the entire Activity Engine's lazy-creation depends on |
| `activities` | `{workspaceId: 1, userId: 1, lastTrackedAt: -1}` | compound | "recently tracked" quick-start list in the timer UI |
| `time_sessions` | `{userId: 1}` partial `{endedAt: null}` | **partial unique** | enforces "one running timer per user" at the database layer — the load-bearing index in Section 5 |
| `time_sessions` | `{activityId: 1, startedAt: -1}` | compound | "sessions for this activity" / timesheet view |
| `time_sessions` | `{workspaceId: 1, userId: 1, startedAt: -1}` | compound | user's timesheet across all activities, date-ranged |
| `calendar_events` | `{workspaceId: 1, startsAt: 1}` | compound | calendar grid queries (date-range scan) |
| `notes` | `{content: "text", title: "text"}` | text | search |
| `notes` | `{workspaceId: 1, projectId: 1}` sparse | compound sparse | "notes for this project" only when linked |
| `tags` | `{workspaceId: 1, name: 1}` | compound unique | prevents duplicate tag names per tenant |
| `notifications` | `{userId: 1, createdAt: -1}` | compound | notification feed, newest first |
| `notifications` | `{readAt: 1}` sparse + app-level TTL job | — | old, read notifications don't need to live forever |
| `analytics_daily_rollups` | `{workspaceId: 1, userId: 1, date: -1}` | compound unique | one row per user per day, dashboard chart queries |
| `sessions`, `*_tokens`, `rate_limit_attempts` | (already indexed) | TTL/unique | see existing `src/db/client.ts` |

**Standout non-obvious index:** the partial unique index on `time_sessions {userId: 1}` where `endedAt: null` is worth calling out specifically — it's what makes "only one running timer, from any source" an actual database-enforced guarantee rather than a hope that application code always remembers to check.

**General rule I'm applying throughout:** every compound index leads with `workspaceId` (or is scoped by a parent that already carries it) wherever the collection is tenant-scoped, because that's the field every single query will filter on once tenancy is real (Section 11). Indexes are also the reason `workspaceId`-everywhere isn't just a "nice to have" — an index without the tenant field as its leading key means a future team-plan query has to either rebuild indexes across a live collection or scan without one.

---

## 10. Performance Strategy

**Document growth — the anti-pattern to actively avoid:** `time_sessions`, `habit_logs`, `task_comments`, `note_versions`, `notifications`, `audit_logs` are all unbounded, append-only, per-parent-growing data. None of them are ever embedded arrays inside their parent document. This is worth restating because it's the single most common MongoDB modeling mistake in productivity-app clones — embedding a "logs" or "history" array feels natural early on and becomes a 16MB-document risk and a write-amplification problem (every log append rewrites/relocates a growing document) as soon as a single habit or task has years of history.

**Read-heavy paths:** dashboard "today" view, task list, calendar grid. Served by the compound indexes in Section 9. As traffic grows, these are also the best caching candidates (short-TTL cache, 30-60s, on the "today" aggregate) since staleness of a few seconds is imperceptible for a todo list.

**Write-heavy paths:** `time_sessions` (every start/stop) and `activities.totalTrackedSeconds` (incremented on every stop). Use atomic `$inc`/`$set` operations, never read-modify-write from application code — a read-then-write for a counter under concurrent requests (two devices, a flaky retry) will lose updates.

**Multi-document consistency:** stopping a running timer touches two documents (`time_sessions.endedAt` + `activities.totalTrackedSeconds`) that must not go out of sync. This is exactly the kind of thing Postgres gives you for free with a transaction and a foreign key; in MongoDB, wrap this specific operation in a **multi-document transaction** (requires a replica set, which Atlas gives you by default) rather than accepting eventual inconsistency here — a timer total that's occasionally wrong is a trust-breaking bug in a time-tracking product, so this is one of the few places I'd spend the transaction cost.

**Aggregation usage:** never synchronous-on-request for anything dashboard-shaped. `analytics_daily_rollups` is written by a scheduled job (cron/worker, run nightly or incrementally on each session-stop) that aggregates `time_sessions`/`tasks`/`habit_logs` into one small pre-computed row per user per day. The dashboard reads the rollup collection, not raw event data — this is what keeps analytics fast regardless of how many years of `time_sessions` history a power user accumulates.

**Caching:** cache low-churn, high-read data — user profile, workspace settings, tag lists. Do not cache `tasks`/`time_sessions` lists beyond a very short TTL; the churn rate defeats the cache-hit benefit and risks showing stale "is my timer running" state, which is the one piece of UI state users notice immediately if wrong.

**Sharding (future, not needed at current scale):** if Pulse ever needs horizontal sharding, `workspaceId` is the natural shard key for every tenant-scoped collection — another concrete payoff of making it a first-class field everywhere from day one rather than retrofitting it later, since shard key selection on an already-large unsharded collection is itself a significant migration.

---

## 11. Multi-Tenant Readiness

This is where I'm most directly overriding the brief's phrasing. The brief says "starts as a personal product, design so it can later support teams" — my recommendation is: **don't design for it, build it now, just don't build the team *features* yet.**

**What ships now (invisible to the user, personal-only UX):**
- `workspaces` collection exists; every user gets exactly one auto-created "Personal Workspace" at registration.
- `workspace_members` exists; every user is inserted as the sole `owner` of their personal workspace.
- **Every domain document — Task, Habit, Goal, Activity, TimeSession, Note, CalendarEvent, Tag, Project — carries `workspaceId` from its very first row.** No feature-flag, no "we'll add it later" — it's a required field in every entity from Section 3 onward.
- Every repository query is scoped through a shared `withWorkspaceScope()` utility (Section 8) so there is exactly one place tenant-filtering logic lives, not one per feature.

**What's deferred (genuinely fine to defer, because the schema doesn't change when you build it):**
- `workspace_invitations` collection and the invite-accept flow.
- UI for inviting members, switching workspaces, workspace settings.
- Roles beyond `owner` (add `admin`/`member`/`viewer` enum values to `workspace_members.role` — this is a value addition, not a schema migration).
- Resource-level permissions (e.g., "this project is private to me even within a team workspace") — reserved as a future `resource_shares` collection (`{workspaceId, resourceType, resourceId, principalId, permission}`) layered on top without touching any existing collection.

**Why this order specifically:** the expensive part of multi-tenancy is the *data model* — backfilling a tenant id across every existing document and every existing index, and auditing every existing query for a missing tenant filter, is the actual hard/risky part, and it's a one-time cost that's nearly free before you have data. The *feature* part (invite UI, roles UI, permission checks) is ordinary, low-risk, incremental engineering you can build whenever the business actually needs a team plan. Sequencing it this way means "add team collaboration" becomes a normal feature project instead of a database migration project.

---

## 12. Future Features

| Feature | How the architecture supports it |
|---|---|
| **AI Assistant** | A new *caller* of the existing service layer (Section 7), not a new data model. `AIService.handleCommand()` parses intent and calls `TaskService.createTask()` / `TimeTrackingService.startTimer()` etc. — the same functions the REST API and the web UI call. |
| **AI Memory** | A future `ai_memory` collection with `sourceType/sourceId` + embedding vector, mirroring the polymorphic pattern established by `activities`. Doesn't require changes to any existing collection. |
| **Natural Language Commands** | Same as AI Assistant — a parser producing calls into the existing service layer. Validates that the layering is doing its job: if NL commands required touching repositories directly, the service boundary would have failed its purpose. |
| **Offline Sync** | Every mutable document should carry `updatedAt` and a monotonic `version`/`revision` counter (cheap to add now, expensive to retrofit) to support future conflict resolution (last-write-wins today, vector-clock or operational-transform later if needed). |
| **Mobile Apps** | Because domain logic sits in services behind repositories, independent of Next.js route handlers, exposing the same services through a mobile-facing API surface is additive — no domain rewrite. |
| **Public API** | Cursor-based pagination (Section 8) and allow-listed filters/sorts (also Section 8) are the two contract decisions that are painful to change after external consumers exist — both are already being built that way from Phase 1, specifically because of this future need. |
| **Integrations / Webhooks** | Reserve `webhooks`/`webhook_deliveries` (Section 2, Phase 3). Recommend adding a no-op internal event emission point in services now (e.g., `TimeTrackingService.stopTimer()` conceptually "emits" `time_session.completed`) even before anything subscribes to it — trivial now, and it's the seam webhooks/notifications/AI-memory will all eventually hook into. |
| **Billing** | `subscriptions` collection mirrors Stripe state, keyed by `workspaceId` — only possible because `workspaceId` is already the universal tenancy boundary (Section 11). Feature-gating reads `workspace.plan`. |
| **Plugins** | Furthest-out and genuinely speculative — flag now rather than design for: a plugin system needs a sandboxed execution boundary and a stable public API (the same one from the Public API row) as a prerequisite. Don't build plugin infrastructure before the Public API exists; it has nothing to attach to yet. |

---

## 13. Folder Structure

Extends the folder convention **already established** in this repo (`src/features/{auth,tasks,habits,goals,calendar}/{api,components,hooks,services,types,validators}`) rather than introducing a parallel global structure. Two additions: a `repositories/` and `queries/` subfolder per feature, and two new top-level feature folders for the domains that don't map to an existing UI screen.

```
src/
  db/
    client.ts                  (exists — connection + typed collection getters)
    base-repository.ts         (new — generic repository factory)
    indexes.ts                 (new — composes ensureIndexes() across every feature)

  features/
    workspace/                 (new — foundational, built first)
      repositories/
      services/
      types/
      validators/

    tasks/
      repositories/            (new)
      services/
      types/
      validators/
      queries/                 (new — task-specific filter/sort builders)
      api/  components/  hooks/   (existing pattern)

    habits/  goals/  calendar/  (same shape as tasks/, extended not replaced)

    activity/                  (new — its own feature, NOT nested under tasks or habits)
      repositories/
      services/
      types/

    time-tracking/             (new — its own feature, references activity/, never tasks/ or habits/ directly)
      repositories/
      services/
      types/

    notes/  notifications/  analytics/  settings/   (new, as each ships)

  lib/                          (exists — cross-cutting infra)
    auth/  email/               (existing)
    query/                      (new — buildFilter, buildPagination, buildSort, withWorkspaceScope)
    pagination.ts                (new)

  types/                        (exists — shared cross-domain types, e.g. User, Session)
```

**Why `activity/` and `time-tracking/` are their own top-level features, not nested inside `tasks/` or `habits/`:** this is the folder-structure expression of Section 5's core rule — the dependency arrow only ever points *from* Task/Habit/Goal/Calendar *toward* Activity, never the reverse. If `time-tracking/` lived inside `features/tasks/`, it would be structurally implying tasks own timing, which is exactly the coupling the brief said not to build. A developer should be able to delete `features/habits/` entirely and `features/time-tracking/` keeps working untouched — that's the actual test for whether the independence requirement was honored, not just stated.

**Why this scales:** each feature folder is a vertically-sliced, independently deletable unit (data access → business logic → validation → UI), which is what "feature isolation" in your brief actually cashes out to structurally. Cross-cutting concerns (query utilities, base repository, workspace scoping) live in `lib/`/`db/` exactly once, so they're shared without every feature reimplementing pagination or filter-building.

---

## 14. Development Roadmap

| Order | Step | Why this position |
|---|---|---|
| 1 | **Workspace & tenancy foundation** (`workspaces`, `workspace_members`, auto-provisioning on registration) | Must exist before any other domain writes its first document, since every subsequent collection requires `workspaceId` from its first row (Section 11). Doing this after Task/Habit exist means backfilling — exactly the expensive migration this roadmap exists to avoid. |
| 2 | **Shared DB infrastructure**: `base-repository` factory, `lib/query/*` utilities, `db/indexes.ts` composition pattern | Build once, every subsequent domain reuses it. Building it after 3-4 features already have ad hoc query code means a retrofit and inconsistent patterns across features. |
| 3 | **Tags** | Small, cheap, and used by nearly every other domain (Task/Note/Habit/Goal). Building it early means Task/Habit/Goal are built *with* tagging from day one instead of retrofitting a tag field + migration onto four collections later. |
| 4 | **Project** | Task references Project; build the referenced side first so Task isn't built against a stub. |
| 5 | **Task** | The highest-traffic, most product-critical domain — also the first, best-understood proving ground for the repository/service/query patterns established in step 2 before they're reused elsewhere. |
| 6 | **Activity Engine** (`activities` collection, lazy `findOrCreateBySource`) | Built immediately after Task exists specifically so it can be validated end-to-end against **one real, working source type** before Habit/Goal/Calendar are added. |
| 7 | **Time Tracking** (`time_sessions`, running-timer invariant, partial unique index) | Validated against Task-sourced activities first — proves the split-collection design (Section 5) and the transaction boundary (Section 10) work before more source types are layered on. |
| 8 | **Habit + `habit_logs`** | The **second** consumer of Activity — this is the step that actually proves the polymorphism works, not just the Task integration. If the Activity abstraction has a flaw, it surfaces here, after one integration, not after three. |
| 9 | **Goal** | Third consumer of Activity; by now the pattern is proven twice and this should be close to mechanical. |
| 10 | **Calendar** | Fourth consumer of Activity, plus introduces `quick_focus`/`custom` source types (no `sourceId`) — the edge case of the polymorphic design, deliberately last among the Activity consumers so the "normal" cases are solid first. |
| 11 | **Notes** | Largely independent of the Activity Engine — can be built in parallel by a second engineer once steps 1-2 (tenancy + shared infra) are stable, since it has no dependency on Task/Habit/Activity. |
| 12 | **Notifications** | Needs real source domains (Task due dates, Habit streaks, Goal deadlines) to have something to notify about — building it earlier means building against stubs. |
| 13 | **Analytics rollups** | By definition derived from Task/Habit/TimeSession data — must come after those exist and have real usage patterns to design rollup shapes around. |
| 14 | **Settings** | Mostly UI-driven with a thin backend surface; low risk, can slot in wherever convenient once workspace/user foundations exist. |
| 15+ | **AI, Team Collaboration UI, Billing, Public API, Webhooks, Plugins** | Out of MVP scope; each is additive on the foundation above per Section 12, none require revisiting steps 1-14. |

**The one sequencing rule I'd defend hardest:** step 6 (Activity) must come right after step 5 (Task) and before steps 8-10 (Habit/Goal/Calendar) — building all four source domains first and bolting Activity on at the end is the single biggest risk to the "no separate timers" requirement actually landing correctly, because any flaw in the polymorphic design would then require refactoring four already-built domains simultaneously instead of course-correcting after one.

---

## Summary of Deviations from the Brief

1. Tenancy (`workspaceId` everywhere) is built in **Phase 1**, not deferred — Section 11.
2. Activity is **two collections** (`activities` + `time_sessions`), not one — Section 5.
3. Repository pattern is **function-factory based**, matching existing codebase conventions, not class-based — Section 6.
4. Soft-delete (`deletedAt`) and a shared `Schedulable` sub-schema are added as cross-cutting requirements the brief didn't explicitly ask for but that this product category (Notion/Todoist-class) needs for feature parity — Section 3.
5. Pagination is cursor-based from day one, anticipating the future Public API, rather than `skip`/`limit` — Section 8.
6. MongoDB itself is flagged, once, as a non-obvious choice for this domain's shape — Section 0 — without recommending you actually switch, since auth is already built on it.
