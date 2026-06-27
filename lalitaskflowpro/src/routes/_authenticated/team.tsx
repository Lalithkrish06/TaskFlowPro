import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { listProfiles, listTasks } from "@/lib/queries";
import { colorForId, initialsOf } from "@/lib/format";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — TaskFlow Pro" }] }),
  component: TeamPage,
});

function TeamPage() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const list = profiles.data ?? [];
  const taskList = tasks.data ?? [];

  return (
    <AppLayout title="Team" eyebrow={`${list.length} members`}>
      <div className="grid gap-4 animate-reveal sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => {
          const assigned = taskList.filter((t) => t.assignee_id === m.id);
          const done = assigned.filter((t) => t.status === "done").length;
          const score = assigned.length ? Math.round((done / assigned.length) * 100) : 0;
          return (
            <div key={m.id} className="rounded-2xl border border-border/60 bg-panel p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="grid size-12 place-items-center rounded-2xl text-sm font-bold text-white"
                  style={{ backgroundColor: colorForId(m.id) }}
                >
                  {initialsOf(m.display_name)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">{m.display_name ?? "Member"}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">{m.role_title ?? "Team member"}</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Assigned" value={assigned.length} />
                <Mini label="Done" value={done} />
                <Mini label="Score" value={`${score}%`} />
              </div>

              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <MessageCircle className="size-3.5" /> Message
                </button>
                <button className="grid size-9 place-items-center rounded-xl border border-border/60 text-slate-600 hover:bg-slate-50">
                  <Mail className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No teammates yet.</p>
        )}
      </div>
    </AppLayout>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}
