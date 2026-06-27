import type { Task, Profile } from "@/lib/queries";
import { colorForId, formatDue, initialsOf, priorityClasses, statusLabels } from "@/lib/format";
import type { Priority, TaskStatus } from "@/lib/format";

export function TaskCard({
  task,
  profiles,
  compact = false,
  onClick,
}: {
  task: Task;
  profiles: Profile[];
  compact?: boolean;
  onClick?: () => void;
}) {
  const assignee = task.assignee_id ? profiles.find((p) => p.id === task.assignee_id) : null;
  const overdue = formatDue(task.due_date) === "Overdue";
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-2xl border border-border/60 bg-panel p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-glass"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityClasses[task.priority as Priority]}`}
        >
          {task.priority}
        </span>
        <span className={`text-[10px] font-medium ${overdue ? "text-rose-600" : "text-slate-400"}`}>
          {formatDue(task.due_date)}
        </span>
      </div>
      <h3 className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">{task.title}</h3>
      {!compact && task.description && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        {assignee ? (
          <span
            className="grid size-6 place-items-center rounded-full border-2 border-panel text-[9px] font-bold text-white"
            style={{ backgroundColor: colorForId(assignee.id) }}
            title={assignee.display_name ?? ""}
          >
            {initialsOf(assignee.display_name)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">Unassigned</span>
        )}
        <span className="text-[10px] font-medium text-slate-400">
          {statusLabels[task.status as TaskStatus]}
        </span>
      </div>
    </button>
  );
}
