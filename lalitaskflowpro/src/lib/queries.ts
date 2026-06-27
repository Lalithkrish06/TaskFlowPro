import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;
export type Profile = Tables<"profiles">;
export type Attachment = Tables<"task_attachments">;

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createProject(input: ProjectInsert) {
  const { data, error } = await supabase.from("projects").insert(input).select().single();
  if (error) throw error;
  // auto add owner as member
  await supabase
    .from("project_members")
    .insert({ project_id: data.id, user_id: input.owner_id, role: "owner" })
    .select();
  return data;
}

export async function updateProject(id: string, patch: ProjectUpdate) {
  const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function createTask(input: TaskInsert) {
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, patch: TaskUpdate) {
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// Attachments
export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadAttachment(opts: {
  taskId: string;
  projectId: string;
  userId: string;
  file: File;
}) {
  const { taskId, projectId, userId, file } = opts;
  if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25 MB)");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${projectId}/${taskId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage
    .from("task-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      storage_path: path,
      filename: file.name,
      size: file.size,
      mime_type: file.type || null,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachment(att: Attachment) {
  await supabase.storage.from("task-attachments").remove([att.storage_path]);
  const { error } = await supabase.from("task_attachments").delete().eq("id", att.id);
  if (error) throw error;
}
