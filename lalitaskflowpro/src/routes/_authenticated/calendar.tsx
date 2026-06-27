import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { listProjects, listTasks, type Task } from "@/lib/queries";
import { priorityClasses } from "@/lib/format";
import type { Priority } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — TaskFlow Pro" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDay = new Map<number, Task[]>();
  (tasks.data ?? []).forEach((t) => {
    if (!t.due_date) return;
    const d = new Date(t.due_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const arr = tasksByDay.get(d.getDate()) ?? [];
      arr.push(t);
      tasksByDay.set(d.getDate(), arr);
    }
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const upcoming = [...(tasks.data ?? [])]
    .filter((t) => t.status !== "done" && t.due_date)
    .sort((a, b) => +new Date(a.due_date!) - +new Date(b.due_date!))
    .slice(0, 5);

  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <AppLayout title="Calendar" eyebrow={monthName}>
      <div className="grid gap-6 animate-reveal lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-border/60 bg-panel p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">{monthName}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="grid size-8 place-items-center rounded-lg border border-border/60 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setCursor(new Date())}
                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="grid size-8 place-items-center rounded-lg border border-border/60 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const dayTasks = d ? tasksByDay.get(d) ?? [] : [];
              const isToday = d != null && isCurrentMonth && d === today.getDate();
              return (
                <div
                  key={i}
                  className={`min-h-20 rounded-xl border p-1.5 text-left lg:min-h-24 ${
                    d ? (isToday ? "border-brand/40 bg-brand/5" : "border-border/60 bg-panel hover:bg-slate-50") : "border-transparent"
                  }`}
                >
                  {d && (
                    <>
                      <div className={`mb-1 text-[11px] font-semibold ${isToday ? "text-brand" : "text-slate-600"}`}>{d}</div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${priorityClasses[t.priority as Priority]}`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[9px] font-semibold text-slate-400">+{dayTasks.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-3">
          <h2 className="text-sm font-bold tracking-tight">Upcoming deadlines</h2>
          {upcoming.map((t) => {
            const proj = (projects.data ?? []).find((p) => p.id === t.project_id);
            const d = new Date(t.due_date!);
            return (
              <div key={t.id} className="rounded-2xl border border-border/60 bg-panel p-4 shadow-card">
                <div className="mb-2 flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                    <div className="text-center leading-tight">
                      <div className="text-[9px] font-bold uppercase">{d.toLocaleDateString(undefined, { month: "short" })}</div>
                      <div className="text-base font-bold">{d.getDate()}</div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{t.title}</h3>
                    <p className="truncate text-[11px] text-muted-foreground">{proj?.name}</p>
                  </div>
                </div>
                <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityClasses[t.priority as Priority]}`}>
                  {t.priority}
                </span>
              </div>
            );
          })}
          {upcoming.length === 0 && <p className="text-xs text-slate-400">No upcoming deadlines.</p>}
        </aside>
      </div>
    </AppLayout>
  );
}
