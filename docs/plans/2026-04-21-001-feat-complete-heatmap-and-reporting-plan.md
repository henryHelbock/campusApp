---
title: "feat: Complete Campus Heatmap and Reporting System (User Manual §4 and §5)"
type: feat
status: completed
date: 2026-04-21
---

> **Implementation note (2026-04-21):** During `ce:work` execution, the team chose to
> descope all review-surfaced security hardening (Q1 — auth on GET endpoints, Q2 —
> stripping `reporter_id` for non-admin callers, the Unit 1 admin gate on
> `status=archived`, and the Unit 2 admin-only archived retrieval). Requirement R9
> below was dropped. The shipped behavior is: GET endpoints remain open to any
> caller, all fields are returned to everyone, and `status=archived` returns
> archived rows to any caller. The default list response still excludes archived
> rows when no `status` filter is passed, which matches how the mobile client
> already filters. Follow-up work can revisit the security boundaries if/when the
> app moves toward production.
>
> The Reports list was migrated to pass server-side filters in the same PR
> (Q10 option (c) from the open-review section). The pre-existing `jsonwebtoken`
> and `bcrypt` imports were missing from `api/package.json`, so those deps were
> installed as part of Unit 1 to unblock local API boot.

# feat: Complete Campus Heatmap and Reporting System

## Overview

Close the remaining gaps between the existing implementation and the behaviors described in User Manual Section 4 (Campus Heatmap) and Section 5 (Reporting System). Most of the UI and a significant portion of the API is already in place — this plan is the finishing pass that fills in backend filter support, the single-issue detail endpoint, 60-second heatmap auto-refresh, tap-to-expand description on report cards, consistent sort order, and a few smaller quality fixes.

## Problem Frame

The scaffolding plan from 2026-03-30 produced a working monorepo. Since then the team has shipped most of the map, the reports list, the new-report form, auth, campus-bounds validation, the POST /api/issues merge logic (`~20m` spatial group), the PATCH `/api/issues/:id/resolve` flow, and the admin moderation queue. The app is close to feature-complete for Sections 4 and 5 but still drifts from the manual in a handful of specific ways that affect user experience and the documented API contract:

- `GET /api/issues` silently ignores `category`, `severity`, `status`, `startDate`, and `endDate` query params even though `IssueFilters` is defined in shared and `issuesApi.getAll(filters)` already serializes them. Today this is hidden because the mobile list filters client-side, but the contract is inconsistent with the manual's claim of category/severity filtering at the reporting system level.
- `GET /api/issues/:id` is a 501 stub. The Reports list's "Description preview — the first two lines… tap the card to read the full text" pattern (§5.3) has nowhere to drill into.
- The heatmap only refreshes when the user taps ↻. Manual §4.1 explicitly states the heatmap "updates automatically every 60 seconds".
- The popup on the map can linger showing an issue that was just filtered out of view, because `selectedIssue` state is not reconciled against `filteredIssues`.
- Reports list has no explicit order by `created_at DESC`, so the `Just now / 2h ago / 3d ago` timeline reads inconsistently depending on insertion order.
- The demo-data fallback in `CampusMap` and `ReportsScreen` masks real backend errors: any `fetch` rejection replaces live data with three hard-coded demo issues, which is useful offline but confusing when the backend is reachable and simply returns an empty list.

The team is a group of students; the goal is practical, incremental work that can land as small PRs without introducing new frameworks.

## Requirements Trace

Grouped by domain for implementation clarity. The original `R#` identifiers are preserved so that units' `Requirements:` fields continue to point to the right rows.

**API Contract & Data Ordering**
- R1. `GET /api/issues` must honor the `IssueFilters` contract declared in `shared/src/types/issue.ts` (category, severity, status, startDate, endDate).
- R2. `GET /api/issues/:id` must return a single active or fixed issue row to standard callers (archived rows are hidden behind an admin-only flag — see R9), or 404.
- R6. `GET /api/issues` must return rows newest-first so the Reports list's time-since labels read in a natural order.

**Mobile UI & Refresh**
- R3. The heatmap on the Map tab must auto-refresh every 60 seconds while the tab is in focus (User Manual §4.1).
- R5. Reports list cards must support "tap to read full text" on the description (User Manual §5.3).

**State Correctness**
- R4. When a filter hides the currently-selected map circle, the popup must close (implicit correctness; Manual §4.4 dismissal behavior).

**Error & Failure Handling**
- R7. Demo-data fallback must only engage on genuine network failure, not when the backend returns a server error or an empty collection.

**Access Boundaries**
- R9. Archived rows must not be retrievable by non-admin callers through either list or detail endpoints (closes the unauthenticated-enumeration risk surfaced in review).

**Regression Safety**
- R8. No regressions to existing POST merge logic, severity escalation, campus-bounds validation, or the PATCH resolve flow.

## Scope Boundaries

- Lost & Found (§6), Admin dashboard (§9), Profile (§10), Troubleshooting (§7), and User Roles (§8) are **out of scope**. The admin moderation queue already works and must keep working, but no admin work is planned here.
- Push notifications (§10.2 future roadmap) are out of scope.
- No new test framework is being introduced. The repo has no Jest/Vitest today; verification for this plan is a combination of targeted manual smoke tests and a small set of `curl` assertions against the running API. If the team later adopts a test runner, the "Test scenarios" blocks in each unit map directly to unit tests.
- No spatial clustering on the client. Backend already merges reports within `~20m` at submit time (`api/src/routes/issues.ts:52-73`), so each `Issue` row returned by the API is already an aggregated cluster from the client's perspective.
- **Archived-row visibility behavior changes.** Today, `GET /api/issues` returns rows of every status (active, fixed, archived) and the mobile filters archived out client-side. After Unit 1, the default response excludes archived rows unless the caller passes `status=archived` and passes a role check (see Unit 1 approach). After Unit 2, `GET /api/issues/:id` returns 404 for archived rows unless the caller is an admin. Admin-dashboard consumers of `/api/admin/*` are unchanged — they do not depend on `GET /api/issues` for moderation, and this default change is safe for the existing admin moderation queue.
- Severity-based bubble sizing is **not** added. Re-reading Manual §4.2: "Circle size reflects volume of reports" and "Circle color reflects severity." Current sizing (`20 + reportCount * 8`) already matches the spec — color carries severity, size carries volume.
- No severity filter UI on the Map tab. Manual §4.3 lists only a category filter bar on the map, and redirects severity/date filtering to the Reports tab. The unused `severity` field in `FilterState` on `CampusMap` is cleaned up in Unit 5 as part of the popup fix.
- `GET /api/issues/heatmap/data` stub is left in place unchanged — no live consumer and no documented contract. Removing it is out of scope; the endpoint can be deleted later if it stays unused.

## Context & Research

### Relevant Code and Patterns

- **Backend reporting API**: [`api/src/routes/issues.ts`](api/src/routes/issues.ts) — existing `GET /` (lines 11-35), `POST /` with merge and severity escalation (lines 38-112), `PATCH /:id/resolve` (lines 120-157), and two stubs (`GET /:id` at 115-117, `GET /heatmap/data` at 160-162). Routes are guarded by `authenticate` globally (line 8) and `requireAuth` on writes. Response shape uses camelCase aliases in the SQL projection (`report_count AS reportCount`, etc.) — Unit 1 and Unit 2 must follow the same projection pattern to keep the `Issue` type stable on the client.
- **Middleware**: [`api/src/middleware/auth.ts`](api/src/middleware/auth.ts) and [`api/src/middleware/validateCampusBounds.ts`](api/src/middleware/validateCampusBounds.ts) — already applied correctly. No changes needed.
- **Campus map component**: [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx) — uses `react-native-maps` (`MapView` + `Circle` + `Marker`), a `FilterState` that has a dormant `severity` field, `fetchData` that is called only once from `useEffect`, and an `onPress` handler that sets `selectedIssue`. No lifecycle hook for interval-based refresh yet.
- **Reports list**: [`mobile/app/(tabs)/reports.tsx`](mobile/app/(tabs)/reports.tsx) — client-side filtering over `issues` state, `timeAgo`/`isWithinDateFilter` helpers (lines 30-47), `IssueCard` with `numberOfLines={2}` truncation (line 56) but no tap handler.
- **New-report form**: [`mobile/app/report/new.tsx`](mobile/app/report/new.tsx) — already spec-complete. Verified against Manual §5.1 steps 10-14 (category chip, severity row, 500-char description with counter, tap-to-pin mini map, submit with loading state). No changes planned.
- **API client**: [`mobile/src/services/api.ts`](mobile/src/services/api.ts) — `issuesApi.getAll(filters)` already serializes `IssueFilters` via `new URLSearchParams`; once Unit 1 lands, any future caller that passes filters starts getting server-filtered results without client code changes.
- **Shared types and constants**: [`shared/src/types/issue.ts`](shared/src/types/issue.ts) (`Issue`, `IssueFilters`, enums), [`shared/src/constants/severity.ts`](shared/src/constants/severity.ts) (`SEVERITY_LEVELS`, `SEVERITY_COLORS`, `SEVERITY_NUMERIC`), [`shared/src/constants/categories.ts`](shared/src/constants/categories.ts), [`shared/src/constants/campus.ts`](shared/src/constants/campus.ts). All match the manual's enum definitions.
- **Schema**: [`api/src/db/migrations/001-initial-schema.sql`](api/src/db/migrations/001-initial-schema.sql) — `issues` table has the correct columns and `CHECK` constraints for category/severity/status, and indexes on `(latitude, longitude)`, `status`, `category`, and `created_at`. No migration needed for this plan.

### Institutional Learnings

- No `docs/solutions/` directory exists yet. This plan is the first substantive feature-finishing pass after scaffolding.

### External References

- No external research was run for this plan. All work is grounded in existing repo patterns (better-sqlite3 prepared statements, Express route handlers, Expo Router tabs, react-native-maps) and in the User Manual itself, which is the source of truth for expected behavior.
- If the team later wants a reference for the 60-second polling pattern in Expo Router, the relevant hook is `useFocusEffect` from `@react-navigation/native` (already transitively installed — see `mobile/package.json`).

## Key Technical Decisions

- **Server-side filter support on `GET /api/issues` is added now, even though today's mobile filters are client-side.** Rationale: the `IssueFilters` type and `issuesApi.getAll(filters)` serializer already exist; closing the loop makes the API contract match the shared type, unblocks any future tab that wants server-side pagination or larger datasets, and costs roughly twenty lines of SQL building. Filter values are validated against the existing enum constants (`ISSUE_CATEGORIES`, `SEVERITY_LEVELS`, `IssueStatus`) before being bound as prepared-statement parameters; invalid values return 400. Note: this adds API capability but does **not** migrate the Reports list off its current client-side filtering — the list continues to fetch unfiltered and filter in memory. Server-side filtering becomes real only when a caller (Reports list, future admin view, or future pagination) passes `IssueFilters`.
- **`ORDER BY created_at DESC` is applied in the same unit as the filter work.** The Reports list depends on recency implicitly via `timeAgo` labels, so ordering belongs to the query contract, not the client.
- **60-second auto-refresh uses `setInterval` inside a `useFocusEffect`.** Polling stops when the user leaves the Map tab, saving battery and bandwidth for students on mobile data. No new dependencies — `useFocusEffect` is exported by `@react-navigation/native`, which is already a direct dependency at `@react-navigation/native ^7.1.8`. `setInterval` is kept at 60000ms per the manual; manual ↻ taps do not reset the interval (simpler mental model, and the interval is short enough that an extra refresh is harmless).
- **Tap-to-expand inside the card, not a new screen.** Manual §5.3 says "Tap the card to read the full text" — nothing more. An expanding local state (`expanded: boolean`) keeps the UI surface minimal and avoids adding an Expo Router route and back navigation. If the team later wants a full-detail screen with reporter name, timestamp, coordinates, and a "view on map" action, Unit 2's `GET /api/issues/:id` is the backend dependency for it.
- **`GET /api/issues/:id` filters archived rows by default and exposes them only to admins.** Non-admin callers get 404 for an archived row — the row still exists in the database but is not visible through the public detail endpoint. Admin callers (role `admin` on the JWT) get the full row. This closes the "enumerate-the-moderation-queue" risk raised in review while preserving the admin/audit read path. Active and fixed rows are always returned to any authenticated caller.
- **Demo-data fallback becomes strictly a network-error fallback, signalled by a tagged error class rather than a platform-emitted type check.** Today, *any* throw from `fetch` replaces the live data with three hard-coded demo issues — including the case where the backend responds with a 500 or with `[]`. After Unit 7, `mobile/src/services/api.ts` raises a tagged `NetworkError` whenever a `fetch` call rejects before producing a response, and the Map/Reports screens engage the demo fallback only on `err instanceof NetworkError`. This is preferred over the original `err instanceof TypeError` heuristic because (a) React Native's fetch has produced `AbortError` on timeout and `SyntaxError` on JSON parse in past SDK versions, so the platform-emitted type is fragile across Expo upgrades, and (b) a tagged class defined in `api.ts` is controlled by this codebase and cannot silently stop working.
- **No new framework, no migration, no broader auth changes.** This is deliberate. The schema and campus-bounds validation are already spec-correct; adding more infrastructure would slow a student team that just needs to finish the scope. Two auth-adjacent decisions are made in this plan: Unit 1 requires callers to be authenticated to pass `status=archived`, and Unit 2 hides archived rows from non-admins (see `GET /api/issues/:id` decision above). These are the minimum changes required by the review-surfaced archived-exposure finding.
- **Loading UI is specified per fetch trigger so users get consistent feedback.** Five fetch paths exist across Map and Reports: (1) initial mount, (2) manual ↻ tap, (3) focus-triggered refetch on tab entry (Unit 5), (4) 60-second background poll (Unit 3), (5) post-submit implicit refresh on return to Map. The treatment is:

  | Trigger | Loading indicator | Notes |
  |---|---|---|
  | Initial mount | Full-screen overlay (existing `loadingOverlay`) | Cold-load feedback |
  | Manual ↻ | Full-screen overlay | User explicitly asked for a refresh |
  | Focus refetch on tab entry | **Silent** (no overlay) | Avoids flicker on every tab switch |
  | 60-second background poll | **Silent** (no overlay) | Prevents a full-screen flash every minute |
  | Post-submit implicit refresh | Silent | Covered by focus refetch path |

  Concretely: `fetchData` in `CampusMap.tsx` takes an optional `{ silent?: boolean }` flag that skips `setLoading(true)`. Mount and manual ↻ call `fetchData()`; focus refetch and interval call `fetchData({ silent: true })`.

## Open Questions

### Resolved During Planning

- *Should the map's severity filter be exposed?* — No. Manual §4.3 lists only a category filter on the map; severity and date filtering live on the Reports tab. The dormant `severity` field in `FilterState` is removed in Unit 5.
- *Should auto-refresh also run on the Reports list?* — No. Manual §4.1 scopes the 60-second refresh to the heatmap. The Reports list exposes an explicit ↻ Refresh affordance next to its count bar (Manual §5.3).
- *Should client-side filtering be replaced by server-side filtering in the Reports list?* — Not in this plan. Unit 1 adds server-side **capability** to `GET /api/issues` so the API honors `IssueFilters` for any caller that opts in. The mobile Reports tab continues to fetch once and filter in memory for instant interaction at the current dataset size. Migrating the Reports list to pass filters through the API is a future unit once report volume grows or pagination is needed. Note: this means Unit 1 has no *shipped* consumer yet; the capability is built to match the shared type contract and to prepare for that future migration (see adversarial review notes below for the challenge to this decision).
- *How should the card's tap-to-expand render?* — Inline expansion within the same card via a local `expanded` flag. A dedicated detail screen can be layered on later using Unit 2's endpoint.
- *What happens if the backend returns an issue whose severity/category is no longer in the enum?* — Cannot happen. The `CHECK` constraints on `issues.category` and `issues.severity` enforce enum membership at write time, and Unit 1's filter validator rejects unknown values at read time.

### Deferred to Implementation

- **Exact `useFocusEffect` teardown ordering** in `CampusMap.tsx` — the cleanup must clear the interval *before* `fetchData` resolves to avoid a state update on an unmounted component. The implementer should inspect the hook's return and confirm with a quick manual test (navigate away mid-fetch).
- **Sort tiebreaker for identical `created_at` timestamps** — SQLite's `created_at` is text with seconds precision. In practice seed/demo rows can collide. A secondary `ORDER BY id DESC` is a cheap tiebreaker; worth adding during implementation if the implementer notices nondeterministic ordering.
- **Whether to truncate `updatedAt` from the list payload** — not important today; leave as-is unless the implementer spots it during work.
- **Confirming `fetch` error behavior on the current Expo SDK** — React Native's `fetch` has historically thrown `TypeError` for connection-refused, `AbortError` for timeouts, and `SyntaxError` for bad JSON; exact shapes can drift between Expo SDK versions. Unit 7's `NetworkError` tagged class sidesteps this drift but still relies on knowing which errors are network-origin inside `api.ts`. Implementer should add a single `console.log(err?.constructor?.name)` during Unit 7 bring-up to confirm the current SDK's behavior, then remove the log.

## Implementation Units

- [x] **Unit 1: Add filter-aware and ordered `GET /api/issues`**

  **Goal:** Parse `IssueFilters` query parameters on the existing list endpoint, validate them against shared enums, build a dynamic `WHERE` clause with bound parameters, and return results newest-first.

  **Requirements:** R1, R6, R8

  **Dependencies:** None

  **Files:**
  - Modify: [`api/src/routes/issues.ts`](api/src/routes/issues.ts) — rewrite the `GET /` handler (lines 11-35).
  - Modify: [`mobile/src/services/api.ts`](mobile/src/services/api.ts) — strip undefined fields before serializing `IssueFilters` so the existing `new URLSearchParams(filters as Record<string, string>).toString()` does not produce `?category=Road&severity=undefined&status=undefined` (which Unit 1's strict validator would reject as 400). One-line fix: `Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v != null && v !== ''))` before passing into `URLSearchParams`.
  - Reference (no change): [`shared/src/types/issue.ts`](shared/src/types/issue.ts), [`shared/src/constants/categories.ts`](shared/src/constants/categories.ts), [`shared/src/constants/severity.ts`](shared/src/constants/severity.ts).

  **Approach:**
  - Read `category`, `severity`, `status`, `startDate`, `endDate` from `req.query`.
  - For each param: reject arrays (`Array.isArray(req.query.<field>)` → 400) and empty strings. Express parses repeated query keys as arrays by default; the endpoint is scalar-only.
  - Validate enum params against the shared set imported from `@campusapp/shared` — `ISSUE_CATEGORIES`, `SEVERITY_LEVELS`, and a local `ISSUE_STATUSES = ['active','fixed','archived']` list. Reject unknown values with `400 { error: 'Invalid <field>' }`.
  - `startDate`/`endDate` are validated with a strict ISO-8601 regex (e.g., `/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/`) **before** `new Date()` — `new Date()` alone accepts loose formats like `"2024/03/10"` and platform-specific strings. After regex match, also confirm `!isNaN(d.getTime())`.
  - Build the SQL with a `clauses: string[]` and `params: unknown[]` pair. Append `category = ?`, `severity = ?`, `status = ?`, `created_at >= ?`, `created_at <= ?` as filters are present. Default behavior: when no `status` filter is passed, return only `status IN ('active','fixed')` — archived rows are hidden from list responses.
  - `status=archived` requires `req.user?.role === 'admin'`; non-admin callers requesting archived receive 403. This is the access-boundary enforcement for R9.
  - Append `ORDER BY created_at DESC, id DESC` so ties on `created_at` sort deterministically (see deferred note).
  - Keep the existing camelCase projection (`report_count AS reportCount`, `reporter_id AS reporterId`, etc.) so the `Issue` type on the client stays stable.

  **Patterns to follow:** The `POST /` and `PATCH /:id/resolve` handlers already use `db.prepare(...).run()` / `.all()` with bound params. Mirror that style — no string concatenation of user input.

  **Test scenarios:**
  - Happy path: `GET /api/issues` with no filters returns all non-archived rows, ordered `created_at DESC`, with camelCase fields.
  - Happy path: `GET /api/issues?category=Road&severity=Severe` returns only rows matching both.
  - Happy path: `GET /api/issues?status=fixed` returns rows with `status = 'fixed'` only.
  - Happy path: `GET /api/issues?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z` returns rows whose `created_at` falls in that window, inclusive.
  - Happy path: admin-token `GET /api/issues?status=archived` returns archived rows and only archived rows.
  - Edge case: no matching rows returns `200 []` (empty array), not 404.
  - Edge case: `GET /api/issues?category=Road&category=Water` (array-shaped) returns 400 — scalar-only enforcement.
  - Edge case: `issuesApi.getAll({ category: 'Road' })` with other filters undefined (the real mobile call shape) must not send `severity=undefined` — verify the undefined-stripping in `api.ts` is in place.
  - Error path: non-admin-token `GET /api/issues?status=archived` returns 403.
  - Error path: `GET /api/issues?category=BogusCat` returns 400 with a clear error message; SQL is never executed.
  - Error path: `GET /api/issues?startDate=not-a-date` returns 400.
  - Error path: `GET /api/issues?startDate=2024/03/10` (loose format accepted by `new Date` but rejected by the regex) returns 400.
  - Integration: the mobile `issuesApi.getAll({ category: 'Road' })` call (after the `api.ts` undefined-strip fix) receives a filtered result set — verify by temporarily wiring a filter in `ReportsScreen`'s `fetchIssues` during manual QA and confirming the list shrinks.

  **Verification:**
  - With the API running, `curl "http://localhost:3000/api/issues?category=Road" | jq length` returns a count less than or equal to the unfiltered count.
  - `curl "http://localhost:3000/api/issues?category=BogusCat" -i` returns status 400.
  - `curl "http://localhost:3000/api/issues" | jq '.[0].createdAt, .[-1].createdAt'` shows the first entry is newer than the last.
  - Existing `POST /api/issues` merge behavior still works (re-submit a nearby duplicate and confirm `reportCount` increments).

- [x] **Unit 2: Implement `GET /api/issues/:id`**

  **Goal:** Replace the 501 stub at `api/src/routes/issues.ts:115-117` with a real single-issue handler so the Reports list (Unit 6) can load full details when a card is tapped.

  **Requirements:** R2, R8

  **Dependencies:** None (no ordering dependency on Unit 1 — both touch the same file but different handlers).

  **Files:**
  - Modify: [`api/src/routes/issues.ts`](api/src/routes/issues.ts) — replace the `GET /:id` stub at lines 115-117 with the real handler, and delete the `GET /heatmap/data` stub at lines 160-162 (no live consumer, no documented contract, keeping the 501 is silent debt).

  **Approach:**
  - Parse `req.params.id` and coerce to number; reject with 400 if `Number.isNaN`.
  - `SELECT` using the same camelCase projection as the list and `POST` handlers.
  - If the row's `status === 'archived'` and `req.user?.role !== 'admin'`, respond 404 (indistinguishable from "row does not exist" — prevents enumerating archived rows via admin-dashboard timing/content differences).
  - Non-existent row → 404. Admin-visible archived row → 200 with the full `Issue` shape. Active/fixed row → 200 for any authenticated caller.
  - Route remains behind the file-level `authenticate` middleware (line 8) which decodes a JWT if present. Non-admin callers may be unauthenticated, which is acceptable for active/fixed rows — the access control is scoped to archived rows only.

  **Patterns to follow:** The `PATCH /:id/resolve` handler's fetch-by-id block (lines 125-129, 140-150) is the exact shape to mirror for the `SELECT` and 404 behavior.

  **Test scenarios:**
  - Happy path: `GET /api/issues/:id` for an existing active row returns 200 with the full `Issue` shape (camelCase fields).
  - Happy path: admin token → archived row returns 200.
  - Edge case: non-admin token (or no token) → archived row returns 404.
  - Edge case: `GET /api/issues/999999` returns 404.
  - Error path: `GET /api/issues/not-a-number` returns 400, not 500.
  - Integration: from the mobile Reports tab after Unit 6, the full description already lives in the in-memory `Issue` row returned by the list endpoint, so Unit 6 does not need to call `/api/issues/:id`. This endpoint is available for a future detail screen or admin view.

  **Verification:**
  - `curl -s http://localhost:3000/api/issues/1 | jq .description` prints the description of seed issue #1 (the `authenticate` middleware is a soft decorator; no header required for active/fixed rows — matches Unit 1's verification style).
  - `curl -i http://localhost:3000/api/issues/99999` returns `HTTP/1.1 404`.
  - `curl -i http://localhost:3000/api/issues/abc` returns `HTTP/1.1 400`.
  - To verify the admin path: log in at `POST /api/auth/login` with the seeded admin from `api/src/db/seed.ts`, copy the returned `token`, then `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/issues/<archived-id>` returns 200.
  - `curl -i http://localhost:3000/api/issues/heatmap/data` returns `HTTP/1.1 404` (route no longer registered).

- [x] **Unit 3: 60-second auto-refresh for the Campus Map**

  **Goal:** Refresh the heatmap (and lost-item pins) every 60 seconds while the Map tab is focused, per Manual §4.1. Manual ↻ still works and is preserved. Background polls are silent so the full-screen loading overlay does not flicker every minute.

  **Requirements:** R3, R8

  **Dependencies:** None at the code level. Unit 5 extends the same `useFocusEffect` block introduced here, so if both units are worked independently, complete Unit 3 before Unit 5 to avoid a merge conflict on the same hook. A consolidated implementation can also do Units 3 and 5 as a single PR.

  **Files:**
  - Modify: [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx) — (1) extend `fetchData` to take an optional `{ silent?: boolean }` argument that skips `setLoading(true)`, (2) add a `useFocusEffect` block that registers a `setInterval` calling `fetchData({ silent: true })` every 60000ms with cleanup, (3) wire manual ↻ and the polling interval through an `intervalRef` so ↻ resets the cadence, (4) add an `AppState` listener so that returning from background triggers an immediate refetch if the tab is focused.

  **Approach:**
  - Import `useFocusEffect` from `@react-navigation/native` and `AppState` from `react-native`.
  - Store the interval handle in a ref: `const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);`.
  - Refactor `fetchData` to `const fetchData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => { if (!silent) setLoading(true); try { ... } finally { if (!silent) setLoading(false); } }, []);`.
  - Focus hook: `useFocusEffect(useCallback(() => { fetchData(); intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000); return () => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; }; }, [fetchData]));`. The immediate `fetchData()` call on focus is the tap-to-Map refresh behavior formally owned by Unit 5.
  - Manual ↻ handler becomes: `const onManualRefresh = () => { if (intervalRef.current) clearInterval(intervalRef.current); fetchData(); intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000); };` — resets the 60s clock so users don't see a loading flash 1s after a manual refresh.
  - App lifecycle: add a `useEffect` that subscribes to `AppState.addEventListener('change', next => { if (next === 'active') fetchData({ silent: true }); })` with teardown, so that when the app is backgrounded and restored after >60s the map is not stuck on stale data. This is a silent fetch to match the background-poll treatment.
  - Remove the existing one-shot `useEffect(() => { fetchData(); }, [fetchData])` because the `useFocusEffect` now covers the initial load and every focus transition.

  **Patterns to follow:** Existing React hook usage in `CampusMap` (`useCallback`, `useEffect`, `useState`). `useFocusEffect` composes with `useCallback` just like `useEffect`.

  **Test scenarios:**
  - Happy path: open the Map tab, submit a new report from the Reports tab, return to the Map tab, and observe the new circle appear within ≤60 seconds without manual refresh.
  - Happy path: manual ↻ button still fetches immediately and shows the loading overlay.
  - Happy path: the background poll at 60s **does not** show the full-screen loading overlay — the user only sees the data update silently.
  - Edge case: tap manual ↻ and wait 5 seconds — no second loading overlay appears (the interval was reset by the ↻ handler).
  - Edge case: switch to the Reports tab and leave the phone idle for 2 minutes — the map's `fetchData` should not be called during that window (verify with a temporary `console.log` or via the Expo network panel).
  - Edge case: unmount mid-fetch by navigating away quickly after opening the tab — no "can't update state on unmounted component" warning in Expo logs.
  - Edge case: background the app for 3 minutes, then foreground it while the Map tab is focused — a silent fetch fires immediately and the map updates with fresh data.
  - Integration: the polling loop cooperates with the demo-fallback (Unit 7) — if the backend goes offline during a poll, the existing data remains displayed (no flash to demo) after Unit 7 lands.

  **Verification:**
  - Add a temporary `console.log('[map] polling fetch at', new Date().toISOString())` inside `fetchData`, run the app, leave the Map tab focused for 2+ minutes, and confirm two log lines appear roughly 60s apart. Remove the log before merging.
  - Navigate to the Reports tab for 2 minutes and confirm **no** polling log fires.
  - Visually confirm the loading overlay does NOT appear on the 60s tick, and that tapping ↻ within 5s does NOT trigger a second loading overlay.

  **Scale and lifecycle assumptions:** For the current expected scale (less than 200 active issues, less than 500 concurrent Map-tab users on campus), a 60s full-table poll is acceptable on better-sqlite3 with existing indexes. If active issues exceed roughly 1,000 **or** concurrent users exceed 2,500, revisit with (a) a push model (WebSocket or expo-notifications emitted from the POST /api/issues handler) and (b) a `LIMIT` clause on the list query. This plan intentionally does not build either; the thresholds are the trigger for a future plan.

- [x] **Unit 4: Dismiss popup and clean up unused state when the selected issue leaves the filter set**

  **Goal:** Ensure the detail popup in `CampusMap` cannot show stale data for an issue that the user has filtered out or that has been removed on a refresh. Also remove the dormant `severity` key from `FilterState` since there is no UI for it on the map (Manual §4.3 scopes severity filtering to the Reports tab).

  **Requirements:** R4, R8

  **Dependencies:** None

  **Files:**
  - Modify: [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx) — adjust `FilterState` type, remove unused `severity` handling, and reconcile `selectedIssue` against `filteredIssues` whenever the latter changes.

  **Approach:**
  - Narrow `FilterState` to `{ category: IssueCategory | 'All' }` — remove the `severity` field and the `filters.severity` filter check (line 79). Keep the existing chip bar unchanged.
  - Wrap `filteredIssues` in `useMemo(() => issues.filter(i => i.status === 'active' && (filters.category === 'All' || i.category === filters.category)), [issues, filters.category])`. Today `filteredIssues` is recomputed as a fresh array every render, so depending on it in the effect below would re-run the effect on every render. Memoizing stabilizes the reference.
  - Add `useEffect(() => { if (selectedIssue && !filteredIssues.some(i => i.id === selectedIssue.id)) setSelectedIssue(null); }, [filteredIssues, selectedIssue])`.
  - Tap-outside behavior (Manual §4.4) already works via the existing `onPress` handler on `MapView`.

  **Patterns to follow:** Existing hook style in the same file.

  **Test scenarios:**
  - Happy path: tap a circle → popup appears; filter to a category that does not include that issue → popup disappears.
  - Happy path: tap a circle → popup appears; refresh the map and the issue is now archived on the backend → popup disappears after the next fetch.
  - Edge case: tap a circle, then tap the ✕ — popup closes (unchanged).
  - Integration: after a 60-second auto-refresh (Unit 3) that drops the selected issue from the list, the popup closes without user action.

  **Verification:**
  - Manually reproduce the happy-path scenarios against a seeded database.
  - TypeScript compile: `cd mobile && npx tsc --noEmit` passes (the narrowed type removes a now-dead branch).

- [x] **Unit 5: Refresh Campus Map after a successful new report submission**

  **Goal:** When the user submits a new report and is routed back from `/report/new`, the Map tab shows the new circle on the next visit without waiting up to 60 seconds.

  **Requirements:** R3, R8

  **Dependencies:** Unit 3 establishes the focus-effect hook pattern; this unit adds a focus-based refetch on every focus event in addition to the 60s interval.

  **Files:**
  - Modify: [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx) — add a `fetchData()` call inside the same `useFocusEffect` introduced in Unit 3, before the interval is registered.

  **Approach:**
  - In the same `useFocusEffect` block: call `fetchData()` once on focus, then start the 60s interval. This single change makes "return to the Map tab after submitting a report" feel instant.
  - No change to `report/new.tsx` — it already navigates back via `router.back()`.

  **Patterns to follow:** React Navigation focus-on-enter pattern (official docs).

  **Test scenarios:**
  - Happy path: from the Map tab, go to Reports → + → submit a new report → navigate back to the Map tab. The new circle is visible within ~1 second of the Map tab becoming focused.
  - Edge case: quickly toggle between Map and Reports tabs — no visible flicker; `fetchData` calls are idempotent.
  - Integration: manual ↻ continues to work and does not conflict with the focus-triggered refetch.

  **Verification:**
  - Manual smoke test described above on a device or simulator.

- [x] **Unit 6: Tap a report card to view the full description**

  **Goal:** Let users read the full text of a truncated report card, per Manual §5.3 "Tap the card to read the full text."

  **Requirements:** R5, R8

  **Dependencies:** Unit 2 provides `GET /api/issues/:id` *if* the team later decides to fetch extended details (reporter email, images). For this unit, the card already holds the full `Issue` object in memory, so expanding in place is sufficient and does not require the new endpoint.

  **Files:**
  - Modify: [`mobile/app/(tabs)/reports.tsx`](mobile/app/(tabs)/reports.tsx) — add `expanded` local state to `IssueCard`, wrap the card in `TouchableOpacity`, and conditionally remove the `numberOfLines={2}` truncation when expanded.

  **Approach:**
  - Inside `IssueCard`, introduce `const [expanded, setExpanded] = useState(false);`.
  - Wrap the top-level card `<View>` in `<TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded(e => !e)}>`.
  - Change the description `<Text numberOfLines={expanded ? undefined : 2}>`.
  - Keep the "Mark as fixed" button's `onPress` intact and prevent event bubbling by ensuring the button is rendered after the expandable region (React Native's `TouchableOpacity` press-through is handled by the inner button capturing the press).
  - Ensure the FlatList that renders cards uses a stable key tied to `issue.id` (today `keyExtractor={i => String(i.id)}` at `reports.tsx:214` is correct). Per-card `expanded` state survives filter changes only while the card's key remains the same — this is already the case, but it's worth calling out so a future refactor does not regress it.
  - No visual indicator of "expand" state is added in this unit (see Design review questions below for the discoverability-affordance decision); the tap affordance is discoverable per the manual.

  **Patterns to follow:** Existing `IssueCard` styles. `keyExtractor` already in place at `reports.tsx:214`.

  **Test scenarios:**
  - Happy path: a card with a long description shows two lines initially; tapping anywhere in the card reveals the full text; tapping again collapses it.
  - Edge case: a card with a short (one-line) description is tappable but the text does not visibly change.
  - Edge case: tapping "Mark as fixed" does **not** also expand/collapse the card — only the resolve handler runs.
  - Integration: filter changes reset no state on the card (each card's `expanded` is local).

  **Verification:**
  - Manual smoke test: seed a report whose description wraps past two lines (e.g., seed data update during QA), then tap and verify expand/collapse.

- [x] **Unit 7: Demo-data fallback only on actual network errors**

  **Goal:** Stop masking backend errors (or empty results) with hard-coded demo issues on both the Map tab and the Reports list.

  **Requirements:** R7, R8

  **Dependencies:** None

  **Files:**
  - Modify: [`mobile/src/services/api.ts`](mobile/src/services/api.ts) — add an exported `NetworkError` class and throw it specifically from the `fetch` rejection path. Leaves the existing `Error` throw from the non-2xx path unchanged.
  - Modify: [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx) — replace the catch-all demo fallback with an `err instanceof NetworkError` check; surface non-network errors as an inline message (design specifics deferred to the Design review question below).
  - Modify: [`mobile/app/(tabs)/reports.tsx`](mobile/app/(tabs)/reports.tsx) — same change as `CampusMap.tsx`.

  **Approach:**
  - In `api.ts`, export `class NetworkError extends Error { constructor(cause?: unknown) { super('Network request failed'); this.name = 'NetworkError'; (this as any).cause = cause; } }`. Wrap the `await fetch(...)` call in a try/catch: on catch, re-throw as `throw new NetworkError(err)`. Do **not** change the `!res.ok` branch — server-returned errors keep throwing a plain `Error` with the server's message.
  - In both screens, narrow the demo fallback to `catch (err) { if (err instanceof NetworkError) { setIssues(DEMO_ISSUES); /* and setLostItems(DEMO_LOST) on Map */ } else { setFetchError(err instanceof Error ? err.message : 'Something went wrong'); } }`.
  - This makes the fallback behavior controlled by tagged intent from `api.ts`, immune to Expo/RN SDK changes in platform-emitted error types (e.g., `AbortError` on timeout or `SyntaxError` on JSON parse failures).
  - Keep `DEMO_ISSUES` and `DEMO_LOST` constants — they are still useful when Expo Go cannot reach the backend across networks.
  - The visual treatment of `fetchError` (banner? toast? dismissible? retry button?) is a design call — see the Design Review Questions section below. This unit defines the *data path*; the *presentation* is specified in the next review pass or left as a simple inline `<Text>` placeholder near the count bar on Reports and above the legend on Map.

  **Patterns to follow:** Existing `setIssues` / `setLoading` state machine in both screens.

  **Test scenarios:**
  - Happy path: backend returns `[]` → Reports tab shows empty-state copy; Map shows no circles; no demo data appears.
  - Happy path: backend returns real rows → both screens render them.
  - Error path: backend returns 500 → both screens show an inline error message; no demo data appears.
  - Error path: backend is unreachable (`Expo Go` on a different network) → `api.ts` throws `NetworkError`, screens fall back to demo data as before; user can still see something while the team debugs.
  - Error path: request times out on a slow network → if the underlying cause is thrown from `fetch`, `api.ts` catches it and re-throws as `NetworkError`, preserving the fallback. Log the actual error class during bring-up to confirm (deferred implementation note).
  - Edge case: `res.json()` throws on a malformed response body → reaches the caller as plain `Error`, not `NetworkError` → shows the error surface, not demo data.
  - Integration: after Unit 3, a mid-poll network drop does not flash the UI to demo data — it keeps the previously-fetched list until connectivity returns (a known property of keeping the prior state when a new fetch errors).

  **Verification:**
  - Manually stop the API server and reload the app → demo data appears; verify via `console.log(err?.constructor?.name)` during bring-up that the caught error is `NetworkError`.
  - Manually force a 500 (e.g., temporarily `res.status(500)` in `GET /api/issues`) → the error surface appears and the existing data stays on screen (or empty state on a cold load).

- [x] **Unit 8: End-to-end smoke pass and cleanup**

  **Goal:** Walk through the full Section 4 + Section 5 experience to confirm no regression, remove any `console.log`s added during implementation, and confirm the scaffolding plan's checkboxes are still accurate.

  **Requirements:** R8

  **Dependencies:** Units 1-7.

  **Files:**
  - Reference only — no functional code changes expected.

  **Approach:**
  - Seed a fresh database (`cd api && npm run migrate && npm run seed`).
  - Start the API (`npm run dev`) and Expo (`cd ../mobile && npx expo start`).
  - Run through each Manual §4 and §5 behavior in order: map navigation, category filter, toggle heatmap/L&F, refresh, legend, tap circle for popup, submit a report (form steps 10-14), confirm new circle appears on Map tab within ~60s, Reports tab filters, tap card to expand, mark fixed.
  - Remove any temporary logs from Units 3, 5, 6, 7.
  - Update the scaffolding plan's checkboxes in [`docs/plans/2026-03-30-001-feat-initial-project-scaffolding-plan.md`](docs/plans/2026-03-30-001-feat-initial-project-scaffolding-plan.md) only if a checkbox claims a feature is pending (`- [ ]`) when it is actually shipped, or claims it is done (`- [x]`) when this plan's units depended on behavior that turned out to be stubbed. Do not retroactively mark new work from this plan against the old scaffolding plan — that work is tracked in this document.

  **Test expectation:** none -- manual QA pass only

  **Verification:**
  - All Manual §4 and §5 behaviors reproduce on a clean seed.
  - No regressions in POST merge, PATCH resolve, auth gate, or campus-bounds validation.
  - No stray logs in the final diff.

## System-Wide Impact

- **Interaction graph:**
  - Mobile `issuesApi.getAll(filters)` → `GET /api/issues` now honors the full `IssueFilters` contract. Any future consumer (e.g., admin analytics, future pagination) gets server-side filtering without an API change.
  - `GET /api/issues/:id` is new. Immediate consumers: none. Latent consumer: Unit 6 or any later "issue detail screen" feature.
  - `CampusMap`'s `useFocusEffect` adds a new navigation-lifecycle dependency path. If the tab structure ever changes (e.g., from `(tabs)` to nested stacks), the focus behavior must be re-verified.
- **Error propagation:**
  - Server-side filter validation produces 400s that travel through `api.ts`'s `throw new Error(err.message)` → the mobile callers' `catch`. After Unit 7, those errors surface in-app rather than silently falling back to demo data.
- **State lifecycle risks:**
  - `setInterval` cleanup in Unit 3 is the only new long-lived async hazard. If the cleanup is missed, the user would see duplicate fetches after returning to the tab. Test scenarios cover this.
  - The popup/selectedIssue reconciliation in Unit 4 prevents a small stale-state bug that exists today.
- **API surface parity:**
  - `GET /api/issues` now matches the `IssueFilters` type exactly. `shared/src/types/issue.ts` is the single source of truth for allowed filter keys — if a new filter is added later, both ends should move together.
  - The admin dashboard's existing endpoints (`/api/admin/*`) are untouched. The admin moderation queue continues to key off `report_count > 1`.
- **Integration coverage:**
  - Cross-layer scenarios in Unit 1 (enum validation → SQL binding), Unit 3 (polling → rendering), Unit 6 (tap → local state → layout reflow), and Unit 7 (error-type branching → user-visible fallback) are the combinations worth manually exercising before merge.
- **Unchanged invariants:**
  - `POST /api/issues` merge logic at `api/src/routes/issues.ts:52-73` (~20m spatial group, severity escalation, `report_count` increment) is unchanged.
  - `PATCH /api/issues/:id/resolve` status transition is unchanged.
  - `validateCampusBounds` middleware is unchanged and still enforces `isWithinCampus` on writes.
  - Auth (`authenticate` + `requireAuth`) and campus boundary constants are unchanged.
  - Database schema is unchanged; no migration is needed.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `useFocusEffect` import path drift with Expo Router upgrades | `@react-navigation/native` is a direct dependency at `^7.1.8` in `mobile/package.json`; the import is stable across React Navigation v6 and v7. If the import fails, fall back to a plain `useEffect` + `setInterval` keyed on `useIsFocused()`. |
| Interval stays alive after navigation in a corner case | Unit 3's test scenarios explicitly cover the "switch tabs → no polling" case. If polling persists, the cleanup return is wrong. |
| Error-type heuristic in Unit 7 (`err instanceof TypeError`) diverges on platforms | React Native's `fetch` implementation has thrown `TypeError` for network failures since RN 0.60. If a specific Expo build no longer does, the fallback gracefully degrades to "always show live state, with the error surface" — which is acceptable for a student team. |
| Enum validation adds a maintenance burden if a new category is introduced | Both the server validator and the shared constant come from the same module — `ISSUE_CATEGORIES` — so adding a new category is a one-place change. |
| Tap-to-expand conflicts with the "Mark as fixed" button | React Native's press hit-testing lets the inner `TouchableOpacity` capture the press without bubbling. Test scenario in Unit 6 verifies this explicitly. |
| QA coverage for Section 4 is mostly manual | The team has no test framework today. The plan surfaces specific `curl` checks and manual steps rather than pretending automated coverage exists. |

## Documentation / Operational Notes

- No docs changes required. The User Manual is the source of truth and is already correct.
- No operational or rollout concerns — this is client + server code in a student project, no feature flags, no migrations.
- After the plan is complete, consider seeding one "long description" issue in `api/src/db/seed.ts` so the tap-to-expand behavior in Unit 6 is visible on a fresh install.

## Open Review Questions (Require Judgment Before Implementation)

A document review pass surfaced a set of decisions that cannot be answered mechanically from the User Manual or the existing code. Each should be resolved by the team before the corresponding unit is merged; suggested defaults are included so the plan can ship in a coherent state if the team accepts them.

### Access boundaries and data exposure

1. **Should `GET /api/issues` and `GET /api/issues/:id` require authentication?** The existing `authenticate` middleware is a soft decorator — it parses a JWT if present, but does not reject missing or invalid tokens. Only `requireAuth` enforces. Today, both GETs are reachable anonymously. Two options:
   - (a) Add `requireAuth` to both routes so reads match the authenticated posture on POST/PATCH.
   - (b) Accept reads as public-to-anyone and document this as an intentional decision (with implications for `reporter_id`, description free-text, and coordinates being visible to unauthenticated callers).
   - Suggested default: (a), since the admin moderation queue and POST flow both expect an authenticated user context.

2. **Should the GET endpoints strip `reporter_id` from responses for non-admin callers?** The current projection exposes `reporterId` on every list and detail row. For a campus safety app, revealing which user reported which issue to every other user can be uncomfortable (e.g., a Social or Fight report exposes the reporter's user ID). A safe default is to omit `reporter_id` for non-admin callers and include it only when `req.user?.role === 'admin'`. Suggested default: strip `reporterId` from non-admin responses.

3. **Integer-ID enumeration for `GET /api/issues/:id`**: with sequential IDs, an authenticated or anonymous caller can iterate `/api/issues/1..N`. Combined with whatever Q1 and Q2 resolve to, is any additional defense needed (rate limiting, UUID IDs, scoped tokens)? Suggested default: no action in this plan — rate limiting is a separate infrastructure concern.

4. **`JWT_SECRET` fallback hardening**: `api/src/middleware/auth.ts:20` uses `process.env.JWT_SECRET || "super_secret_dev_key_123"`. If the API is ever deployed without `JWT_SECRET` set, tokens are trivially forgeable. Suggested default: make the API refuse to start unless `process.env.JWT_SECRET` is set in non-dev environments. This is a single-line change that can land inside Unit 1 or as a follow-up security unit.

5. **Threat-model note**: for the eventual `docs/solutions/` capture, the top three plan-level exposures are (in order of likelihood): anonymous `GET /api/issues` harvesting all current reports; authenticated `GET /api/issues/:id` iterating archived rows (mitigated by Unit 2 after this review); forgeable JWTs if the secret defaults to the dev fallback in production.

### UX specifics

6. **Unit 7 error surface — how should a server error appear on each screen?** Options: inline banner above the list / map, top toast with auto-dismiss, modal alert. For mixed-fetch screens like Reports (list-driven) and Map (overlay-driven), a consistent treatment matters more than the exact shape. Suggested default: a single-line inline banner with retry button; copy "Couldn't reach the server — showing the last data we have. Retry?"; auto-dismisses on the next successful fetch.

7. **Unit 6 discoverability affordance for the tappable card.** Options:
   - (a) No affordance — users discover tap-to-expand by trying.
   - (b) A small chevron icon on the right that rotates from ▾ to ▴ on expand.
   - (c) A "Read more" / "Show less" link beneath the truncated text.
   - Suggested default: (b) chevron, since it is unambiguous and does not add line height to every card.

8. **Unit 4 popup dismissal UX during auto-refresh.** The current plan silently closes the popup when the selected issue leaves `filteredIssues`, including on a background poll that archived the row. This can be jarring to a user mid-read. Options: silent close (current plan), or show a brief "This report was updated" note before closing. Suggested default: silent close for filter-driven removal; keep popup open for auto-refresh-driven disappearance and add a small "Report updated — tap to dismiss" banner inside the popup.

9. **Accessibility pass for Units 3, 4, 6.** Minimum props: `accessibilityRole='button'` and `accessibilityState={{expanded}}` on the tappable card, `accessibilityLabel` on the Mark-as-fixed button so it reads as a separate action, and an `accessibilityLiveRegion='polite'` announcement when the popup auto-dismisses. Suggested default: add these props in the same PRs that implement Units 3/4/6; do not split into a separate accessibility unit.

### Scope and strategy challenges from adversarial review

10. **Should Unit 1 exist at this scope?** The adversarial reviewer notes that server-side filtering has no current consumer and is justified by a future caller. Two alternatives:
    - (a) Keep Unit 1 as a contract-completion with no shipped consumer. (Current plan.)
    - (b) Cut Unit 1 down to just the `ORDER BY created_at DESC, id DESC` change (which the Reports list actually benefits from immediately). Defer enum/date-range filter support until a consumer is wired.
    - (c) Expand Unit 1: migrate the Reports list off client-side filtering in the same PR so Unit 1 has a shipped consumer on day one.
    - Suggested default: (c) — if we are adding server-side filtering, the Reports list should actually use it. Otherwise (b) — ship the ordering fix and wait.

11. **If the team picks (c) above, the Reports list's `fetchIssues` should pass the current `catFilter / sevFilter / dateFilter / statusFilter` state as `IssueFilters` and re-fetch on filter changes.** This adds a small amount of latency (one HTTP round-trip per chip tap) in exchange for a shrinking payload. For the current dataset size the tradeoff is neutral; for any growth it is strictly better.

12. **Should a test framework be introduced now?** The plan currently relies on manual `curl` and device testing. Unit 1 alone defines roughly a dozen scenarios whose verification is otherwise human-driven. Installing `vitest + supertest` in `api/` and `@testing-library/react-native` in `mobile/` is a ~1-hour setup that converts every "Test scenarios" block into a runnable test. Suggested default: defer to a follow-up plan — this finishing-pass scope is already full. But the question should be a conscious decision, not a drifted assumption.

13. **Calibrate the "User Manual is source of truth" stance.** The manual was authored in Phase 3 of this coursework-derived project and has not been user-tested. Treat the manual as spec-conformant because the team deadline precedes user validation, not because the manual's specific numbers (60-second refresh, `~20m` merge, 500-char description limit) were validated against users. Follow-up plans can adjust from user feedback.

## Sources & References

- User Manual (Software D&D Phase 4), §§ 3.5, 4.1-4.4, 5.1-5.4 — the authoritative spec for every requirement in this plan.
- Origin scaffolding plan: [`docs/plans/2026-03-30-001-feat-initial-project-scaffolding-plan.md`](docs/plans/2026-03-30-001-feat-initial-project-scaffolding-plan.md) — establishes file layout, shared-type conventions, and the controller structure that Units 1-2 extend.
- Repo references (primary): [`api/src/routes/issues.ts`](api/src/routes/issues.ts), [`mobile/src/components/map/CampusMap.tsx`](mobile/src/components/map/CampusMap.tsx), [`mobile/app/(tabs)/reports.tsx`](mobile/app/(tabs)/reports.tsx), [`mobile/app/report/new.tsx`](mobile/app/report/new.tsx), [`mobile/src/services/api.ts`](mobile/src/services/api.ts), [`shared/src/types/issue.ts`](shared/src/types/issue.ts), [`shared/src/constants/severity.ts`](shared/src/constants/severity.ts), [`api/src/middleware/auth.ts`](api/src/middleware/auth.ts), [`api/src/db/migrations/001-initial-schema.sql`](api/src/db/migrations/001-initial-schema.sql).
- Recent commits informing current state: `260d329` (status and filter updates for L&F and reports), `c21918a` (mark as fixed), `003b825` (POST merge logic).
- Platform note for Unit 7: React Native's `fetch` has historically thrown `TypeError` for connection-refused, `AbortError` for timeouts, and `SyntaxError` for bad JSON — exact shapes drift between SDK versions. The `NetworkError` tagged class sidesteps this by controlling the error class from `api.ts` rather than relying on platform-emitted types.
