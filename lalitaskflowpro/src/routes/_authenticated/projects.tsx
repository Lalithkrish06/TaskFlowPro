import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { ProjectDialog } from "@/components/project-dialog";
import { listProjects, listProfiles, listTasks, deleteProject, type Project } from "@/lib/queries";
import { exportProjectsPdf } from "@/lib/exports";
import { priorityClasses, projectStatusLabels, colorForId, initialsOf } from "@/lib/format";
import type { Priority, ProjectStatus } from "@/lib/format";
import { Plus, Pencil, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — TaskFlow Pro" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const del = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = projects.data ?? [];
  const profileList = profiles.data ?? [];

  return (
    <AppLayout
      title="Projects"
      eyebrow={`${list.length} total · ${list.filter((p) => p.status === "active").length} active`}
      actions={
        <>
          <button
            onClick={() => exportProjectsPdf(list, tasks.data ?? [], profileList)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-panel/70 px-3 py-2 text-xs font-medium text-slate-600 backdrop-blur-md hover:bg-panel"
          >
            <Download className="size-3.5" /> Generate PDF report
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5"
          >
            <Plus className="size-3.5" /> New project
          </button>
        </>
      }
    >
      <div className="grid gap-4 animate-reveal sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const owner = profileList.find((pp) => pp.id === p.owner_id);
          return (
            <div
              key={p.id}
              className="group relative rounded-2xl border border-border/60 bg-panel p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-glass"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityClasses[p.priority as Priority]}`}>
                  {p.priority}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  p.status === "active" ? "bg-emerald-50 text-emerald-700"
                  : p.status === "on_hold" ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
                }`}>
                  {projectStatusLabels[p.status as ProjectStatus]}
                </span>
              </div>
              <h3 className="mb-1.5 text-base font-bold tracking-tight text-foreground">{p.name}</h3>
              <p className="mb-5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{p.description}</p>

              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-foreground">{p.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${
                    p.progress >= 80 ? "bg-emerald-500" : p.progress >= 40 ? "bg-brand" : "bg-amber-400"
                  }`} style={{ width: `${p.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {owner ? (
                  <span
                    className="grid size-7 place-items-center rounded-full border-2 border-panel text-[10px] font-bold text-white"
                    style={{ backgroundColor: colorForId(owner.id) }}
                    title={owner.display_name ?? "Owner"}
                  >
                    {initialsOf(owner.display_name)}
                  </span>
                ) : <span />}
                <span className="text-[10px] text-slate-400">
                  {p.due_date ? `Due ${new Date(p.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No due date"}
                </span>
              </div>

              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => { setEditing(p); setOpen(true); }}
                  className="grid size-7 place-items-center rounded-lg bg-white shadow-card hover:bg-slate-50"
                >
                  <Pencil className="size-3.5 text-slate-500" />
                </button>
                <button
                  onClick={() => { if (confirm("Delete this project and all its tasks?")) del.mutate(p.id); }}
                  className="grid size-7 place-items-center rounded-lg bg-white shadow-card hover:bg-rose-50"
                >
                  <Trash2 className="size-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && !projects.isLoading && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <button onClick={() => setOpen(true)} className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-brand">
              Create your first project
            </button>
          </div>
        )}
      </div>

      <ProjectDialog open={open} onClose={() => setOpen(false)} project={editing} />
    </AppLayout>
  );
}
