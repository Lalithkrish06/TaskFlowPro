import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { listProjects, listTasks, listProfiles } from "@/lib/queries";
import { exportProjectsPdf, exportProjectsXlsx } from "@/lib/exports";
import { colorForId, initialsOf } from "@/lib/format";
import { Download, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TaskFlow Pro" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });

  const projectList = projects.data ?? [];
  const taskList = tasks.data ?? [];
  const profileList = profiles.data ?? [];

  const total = taskList.length;
  const byStatus = {
    todo: taskList.filter((t) => t.status === "todo").length,
    in_progress: taskList.filter((t) => t.status === "in_progress").length,
    review: taskList.filter((t) => t.status === "review").length,
    done: taskList.filter((t) => t.status === "done").length,
  };
  const completionRate = total ? Math.round((byStatus.done / total) * 100) : 0;

  // Velocity: tasks completed per day in last 7 days based on updated_at for done tasks
  const velocity = useMemo(() => {
    const days: { day: string; value: number; date: Date }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), value: 0, date: d });
    }
    taskList
      .filter((t) => t.status === "done")
      .forEach((t) => {
        const upd = new Date(t.updated_at);
        const idx = days.findIndex(
          (x) => upd >= x.date && upd < new Date(x.date.getTime() + 86400000),
        );
        if (idx >= 0) days[idx].value += 1;
      });
    return days;
  }, [taskList]);
  const peak = Math.max(1, ...velocity.map((v) => v.value));

  return (
    <AppLayout
      title="Analytics"
      eyebrow="Last 7 days · live data"
      actions={
        <>
          <button
            onClick={() => exportProjectsPdf(projectList, taskList, profileList)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-panel/70 px-3 py-2 text-xs font-medium text-slate-600 backdrop-blur-md hover:bg-panel"
          >
            <Download className="size-3.5" /> Generate PDF report
          </button>
          <button
            onClick={() => exportProjectsXlsx(projectList, taskList, profileList)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-panel/70 px-3 py-2 text-xs font-medium text-slate-600 backdrop-blur-md hover:bg-panel"
          >
            <FileSpreadsheet className="size-3.5" /> Excel
          </button>
        </>
      }
    >
      <div className="space-y-6 animate-reveal">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI label="Completion rate" value={`${completionRate}%`} delta={`${byStatus.done}/${total} tasks`} />
          <KPI label="Active projects" value={projectList.filter((p) => p.status === "active").length} delta={`${projectList.length} total`} />
          <KPI label="In progress" value={byStatus.in_progress} delta="active work" />
          <KPI label="Open tasks" value={byStatus.todo + byStatus.in_progress + byStatus.review} delta="across all projects" />
        </section>

        <section className="rounded-3xl border border-border/60 bg-panel p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight">Project velocity</h2>
              <p className="text-xs text-muted-foreground">Tasks completed per day</p>
            </div>
          </div>
          <div className="flex h-40 items-end gap-3">
            {velocity.map((v, i) => {
              const isPeak = v.value === peak && v.value > 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${isPeak ? "bg-brand" : "bg-slate-200"}`}
                      style={{ height: `${(v.value / peak) * 100}%`, minHeight: 2 }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{v.day}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border/60 bg-panel p-6 shadow-card">
            <h2 className="mb-5 text-base font-bold tracking-tight">Task status distribution</h2>
            <div className="space-y-4">
              {(
                [
                  { label: "Completed", count: byStatus.done, color: "bg-emerald-500" },
                  { label: "In Progress", count: byStatus.in_progress, color: "bg-brand" },
                  { label: "Under Review", count: byStatus.review, color: "bg-indigo-400" },
                  { label: "To Do", count: byStatus.todo, color: "bg-slate-300" },
                ] as const
              ).map((row) => {
                const pct = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="text-foreground">{row.count} · {pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-panel p-6 shadow-card">
            <h2 className="mb-5 text-base font-bold tracking-tight">Top performers</h2>
            <ol className="space-y-3">
              {profileList
                .map((m) => {
                  const assigned = taskList.filter((t) => t.assignee_id === m.id);
                  const done = assigned.filter((t) => t.status === "done").length;
                  return { m, score: assigned.length ? Math.round((done / assigned.length) * 100) : 0, done };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(({ m, score, done }, i) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span
                      className="grid size-8 place-items-center rounded-lg text-[10px] font-bold text-white"
                      style={{ backgroundColor: colorForId(m.id) }}
                    >
                      {initialsOf(m.display_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.display_name ?? "Member"}</p>
                      <p className="text-[11px] text-muted-foreground">{done} tasks completed</p>
                    </div>
                    <span className="text-sm font-bold text-brand">{score}%</span>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <section className="rounded-3xl border border-border/60 bg-panel p-6 shadow-card">
          <h2 className="mb-5 text-base font-bold tracking-tight">Project completion</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {projectList.map((p) => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="truncate text-slate-700">{p.name}</span>
                  <span className="text-slate-500">{p.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function KPI({ label, value, delta }: { label: string; value: string | number; delta: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-panel p-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-medium text-slate-500">{delta}</p>
    </div>
  );
}
