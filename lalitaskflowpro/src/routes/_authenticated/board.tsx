import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { TaskCard } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import {
  listProjects,
  listTasks,
  listProfiles,
  updateTask,
  type Task,
} from "@/lib/queries";
import { statusLabels } from "@/lib/format";
import type { TaskStatus } from "@/lib/format";
import { Plus, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({ meta: [{ title: "Board — TaskFlow Pro" }] }),
  component: BoardPage,
});

const columns: { key: TaskStatus; dot: string }[] = [
  { key: "todo", dot: "bg-slate-300" },
  { key: "in_progress", dot: "bg-brand" },
  { key: "review", dot: "bg-indigo-400" },
  { key: "done", dot: "bg-emerald-500" },
];

function BoardPage() {
  const qc = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const profilesQ = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [live, setLive] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("board-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast.error("Move failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = tasksQ.data ?? [];
  const profileList = profilesQ.data ?? [];
  const projectList = projects.data ?? [];

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const dest = e.over?.id ? String(e.over.id) : null;
    if (!dest) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === dest) return;
    move.mutate({ id, status: dest as TaskStatus });
  }

  return (
    <AppLayout
      title="Sprint Board"
      eyebrow="Live · drag to update status"
      actions={
        <>
          <span className={`flex items-center gap-1.5 rounded-full border border-border/60 bg-panel px-2.5 py-1 text-[10px] font-medium ${live ? "text-emerald-600" : "text-slate-400"}`}>
            <Wifi className="size-3" /> {live ? "Realtime on" : "Connecting…"}
          </span>
          <button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5"
          >
            <Plus className="size-3.5" /> New task
          </button>
        </>
      }
    >
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 animate-reveal lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
          {columns.map(({ key, dot }) => {
            const colTasks = tasks.filter((t) => t.status === key);
            return (
              <DroppableColumn key={key} status={key}>
                <header className="flex items-center justify-between px-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${dot}`} />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {statusLabels[key]}
                    </h2>
                    <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px] font-semibold text-slate-600">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                    className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </header>

                <div className="flex flex-col gap-3">
                  {colTasks.map((t) => (
                    <DraggableTask key={t.id} task={t}>
                      <TaskCard
                        task={t}
                        profiles={profileList}
                        compact
                        onClick={() => { setEditing(t); setOpen(true); }}
                      />
                    </DraggableTask>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-slate-400">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>

      <TaskDialog
        open={open}
        onClose={() => setOpen(false)}
        task={editing}
        projects={projectList}
        profiles={profileList}
      />
    </AppLayout>
  );
}

function DroppableColumn({ status, children }: { status: TaskStatus; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col gap-3 rounded-3xl border p-3 backdrop-blur-md transition lg:w-full ${
        isOver ? "border-brand/60 bg-brand/5" : "border-border/60 bg-panel/40"
      }`}
    >
      {children}
    </section>
  );
}

function DraggableTask({ task, children }: { task: Task; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
