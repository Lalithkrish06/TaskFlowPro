import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { TaskCard } from "@/components/task-card";
import { listProjects, listTasks, listProfiles } from "@/lib/queries";
import {
  CheckCircle2,
  FolderKanban,
  AlertTriangle,
  ListTodo,
  ArrowUpRight,
} from "lucide-react";
import { formatDue } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — TaskFlow Pro" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });

  const projectList = projects.data ?? [];
  const taskList = tasks.data ?? [];
  const profileList = profiles.data ?? [];

  const active = projectList.filter((p) => p.status === "active");
  const completed = projectList.filter((p) => p.status === "completed");
  const pending = taskList.filter((t) => t.status !== "done");
  const overdue = pending.filter((t) => formatDue(t.due_date) === "Overdue");
  const dueToday = pending.filter((t) => formatDue(t.due_date) === "Due today");

  const sprintTasks = taskList
    .filter((t) => t.status === "in_progress" || t.status === "review")
    .slice(0, 4);

  return (
    <AppLayout title="Welcome back" eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}>
      <div className="space-y-7 animate-reveal">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active Projects" value={active.length} delta={`${projectList.length} total`} tone="emerald" Icon={FolderKanban} />
          <StatCard label="Pending Tasks" value={pending.length} delta={`${dueToday.length} due today`} tone="amber" Icon={ListTodo} />
          <StatCard label="Completed" value={completed.length} delta={`${taskList.filter((t) => t.status === "done").length} tasks done`} tone="brand" Icon={CheckCircle2} />
          <StatCard label="Overdue" value={overdue.length} delta={overdue.length ? "Action required" : "All clear"} tone="rose" Icon={AlertTriangle} />
        </section>

        <section>
          <SectionHeader title="Key Milestones" linkTo="/projects" linkLabel="View all" />
          <div className="rounded-3xl border border-white glass-panel p-5 space-y-5">
            {active.slice(0, 3).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="truncate text-slate-700">{p.name}</span>
                  <span className={p.progress >= 80 ? "text-brand" : "text-slate-400"}>{p.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${p.progress >= 80 ? "bg-brand" : "bg-slate-300"}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {active.length === 0 && (
              <p className="text-xs text-slate-400">No active projects yet. Create one to get started.</p>
            )}
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionHeader title="Current Sprint" linkTo="/board" linkLabel="Open board" rightBadge={`${sprintTasks.length} active`} />
            <div className="grid gap-3 sm:grid-cols-2">
              {sprintTasks.map((t) => (
                <TaskCard key={t.id} task={t} profiles={profileList} />
              ))}
              {sprintTasks.length === 0 && (
                <p className="text-xs text-slate-400 sm:col-span-2">Nothing in flight right now.</p>
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Team" linkTo="/team" linkLabel="Manage" />
            <div className="rounded-3xl border border-border/60 bg-panel p-5 shadow-card space-y-3">
              {profileList.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-brand/10 text-[10px] font-bold text-brand">
                    {(m.display_name ?? "·").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.display_name ?? "Member"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.role_title ?? "Team member"}</p>
                  </div>
                </div>
              ))}
              {profileList.length === 0 && (
                <p className="text-xs text-slate-400">No teammates yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  label, value, delta, tone, Icon,
}: { label: string; value: number; delta: string; tone: "emerald" | "amber" | "brand" | "rose"; Icon: typeof FolderKanban }) {
  const t = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-brand/10 text-brand",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/60 bg-panel p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`grid size-7 place-items-center rounded-lg ${t}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${t}`}>{delta}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel, rightBadge }: { title: string; linkTo?: string; linkLabel?: string; rightBadge?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
      {rightBadge ? (
        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{rightBadge}</span>
      ) : linkTo && linkLabel ? (
        <Link to={linkTo} className="flex items-center gap-1 text-xs font-medium text-brand">
          {linkLabel} <ArrowUpRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
