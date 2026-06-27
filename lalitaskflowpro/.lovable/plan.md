# TaskFlow Pro — Backend & Realtime Build

This is a large scope. I'll enable **Lovable Cloud** (managed Postgres + Auth + Storage + Realtime) and replace the mock data layer end-to-end. Note: MongoDB isn't part of Lovable's stack — Lovable Cloud is Postgres-based and gives you the same capabilities (DB, auth, storage, realtime) with zero setup. If you specifically require MongoDB I'd need to bring your own backend; otherwise I'll proceed with Cloud.

## 1. Enable Lovable Cloud
- Provision project, generate types, wire client.
- Configure Email/Password + Google sign-in on `/login`, plus `/reset-password` page.

## 2. Schema (migrations + GRANTs + RLS)
- `profiles` (id → auth.users, display_name, avatar_url)
- `app_role` enum (`admin`, `manager`, `member`) + `user_roles` table + `has_role()` security-definer fn
- `projects` (owner, name, description, status, due_date, progress)
- `project_members` (project_id, user_id, role)
- `tasks` (project_id, title, description, status, priority, assignee_id, due_date, position)
- `task_attachments` (task_id, storage_path, filename, size, mime, uploaded_by)
- Storage bucket `task-attachments` (private) with RLS by project membership
- Triggers: auto-create profile on signup; updated_at maintenance
- Realtime publication enabled on `tasks` and `projects`

## 3. RBAC
- Route gate: `_authenticated` layout redirects to `/login`
- Admin-only actions (delete project, manage members, change roles) gated by `has_role(uid, 'admin'|'manager')` both in RLS and UI
- Members can CRUD tasks within projects they belong to

## 4. CRUD wiring
- Replace `src/lib/mock-data.ts` with TanStack Query hooks calling Supabase directly from the client (RLS-enforced)
- Pages updated: dashboard, projects, board, calendar, team, analytics
- Create/edit dialogs for projects and tasks (shadcn Dialog + react-hook-form + zod)

## 5. Realtime Kanban
- Subscribe to `postgres_changes` on `tasks` filtered by project
- Optimistic drag-and-drop status/position updates (@dnd-kit) with server reconcile
- Presence indicator showing active viewers per board

## 6. File attachments
- Upload to `task-attachments/{project_id}/{task_id}/{uuid}-{filename}` via Supabase Storage
- Signed URLs for downloads; size/mime validation client + server (zod)
- Attachments list on task detail drawer with delete (owner/admin only)

## 7. Exports (PDF + Excel)
- Excel: `xlsx` library — Project report (tasks, status, assignees, dates) and Productivity report (per-member completion, velocity)
- PDF: `jspdf` + `jspdf-autotable` — same two reports, branded header
- Export buttons on `/analytics` and per-project page; generated client-side from live data

## Technical notes
- Stack: TanStack Start + Supabase JS client (browser RLS). No edge functions needed for v1.
- Auth: managed Supabase auth; `_authenticated/route.tsx` gate.
- New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `xlsx`, `jspdf`, `jspdf-autotable`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns` (if not present).

## Out of scope for this pass
- Chat/comments, AI features, email notifications, calendar sync, mobile push — can follow in later turns.

Confirm to proceed (and confirm Postgres-via-Lovable-Cloud is acceptable instead of MongoDB).
