import { useState, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  updateTask,
  deleteTask,
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  getAttachmentUrl,
  type Task,
  type Project,
  type Profile,
} from "@/lib/queries";
import { useAuthUser } from "@/hooks/use-auth";
import { X, Paperclip, Trash2, Download, Upload } from "lucide-react";

export function TaskDialog({
  open,
  onClose,
  task,
  projects,
  profiles,
  defaultProjectId,
  defaultStatus = "todo",
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  projects: Project[];
  profiles: Profile[];
  defaultProjectId?: string;
  defaultStatus?: string;
}) {
  const user = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(task?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "");
  const [status, setStatus] = useState(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const fileInput = useRef<HTMLInputElement>(null);

  const attachmentsQ = useQuery({
    queryKey: ["attachments", task?.id],
    enabled: !!task?.id,
    queryFn: () => listAttachments(task!.id),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!projectId) throw new Error("Pick a project");
      if (task) {
        return updateTask(task.id, {
          title,
          description,
          project_id: projectId,
          status,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
        });
      }
      return createTask({
        title,
        description,
        project_id: projectId,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(task ? "Task updated" : "Task created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteTask(task!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!task || !user) throw new Error("Save task first");
      return uploadAttachment({
        taskId: task.id,
        projectId: task.project_id,
        userId: user.id,
        file,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", task?.id] });
      toast.success("Uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAtt = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", task?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-panel p-6 shadow-glass"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{task ? "Edit task" : "New task"}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select value={assigneeId ?? ""} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name ?? "Member"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Under Review</option>
                <option value="done">Completed</option>
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Due">
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {task && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Attachments
                </span>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Upload className="size-3" /> Upload
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload.mutate(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {(attachmentsQ.data ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="size-3 shrink-0 text-slate-400" />
                      <span className="truncate">{a.filename}</span>
                      <span className="shrink-0 text-slate-400">
                        {(a.size / 1024).toFixed(0)} KB
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const url = await getAttachmentUrl(a.storage_path);
                            window.open(url, "_blank");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Download failed");
                          }
                        }}
                        className="grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-200"
                      >
                        <Download className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAtt.mutate(a)}
                        className="grid size-6 place-items-center rounded text-rose-500 hover:bg-rose-100"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  </div>
                ))}
                {attachmentsQ.data?.length === 0 && (
                  <p className="text-xs text-slate-400">No attachments yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {task ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this task?")) del.mutate();
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-brand disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : task ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "block w-full rounded-xl border border-border bg-panel px-3 py-2 text-sm shadow-card outline-none focus:border-brand focus:ring-4 focus:ring-brand/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
