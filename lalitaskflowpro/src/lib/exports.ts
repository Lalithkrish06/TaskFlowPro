import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, Task, Profile } from "@/lib/queries";
import { statusLabels, projectStatusLabels } from "@/lib/format";

function nameOf(profiles: Profile[], id: string | null) {
  if (!id) return "Unassigned";
  return profiles.find((p) => p.id === id)?.display_name ?? "Member";
}

export function exportProjectsXlsx(projects: Project[], tasks: Task[], profiles: Profile[]) {
  const wb = XLSX.utils.book_new();
  const projRows = projects.map((p) => ({
    Project: p.name,
    Status: projectStatusLabels[p.status as keyof typeof projectStatusLabels] ?? p.status,
    Priority: p.priority,
    Progress: `${p.progress}%`,
    Owner: nameOf(profiles, p.owner_id),
    Start: p.start_date ?? "",
    Due: p.due_date ?? "",
    "Task count": tasks.filter((t) => t.project_id === p.id).length,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), "Projects");

  const taskRows = tasks.map((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    return {
      Task: t.title,
      Project: proj?.name ?? "",
      Status: statusLabels[t.status as keyof typeof statusLabels] ?? t.status,
      Priority: t.priority,
      Assignee: nameOf(profiles, t.assignee_id),
      Due: t.due_date ?? "",
      Created: new Date(t.created_at).toLocaleDateString(),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "Tasks");

  const prodRows = profiles.map((m) => {
    const assigned = tasks.filter((t) => t.assignee_id === m.id);
    const done = assigned.filter((t) => t.status === "done").length;
    return {
      Member: m.display_name ?? "—",
      Role: m.role_title ?? "",
      Assigned: assigned.length,
      Completed: done,
      "Completion %": assigned.length ? Math.round((done / assigned.length) * 100) : 0,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodRows), "Productivity");

  XLSX.writeFile(wb, `taskflow-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProjectsPdf(projects: Project[], tasks: Task[], profiles: Profile[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.text("TaskFlow Pro — Project & Productivity Report", 10, 12);
  doc.setTextColor(20);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 10, 24);

  autoTable(doc, {
    startY: 28,
    head: [["Project", "Status", "Priority", "Progress", "Owner", "Due", "Tasks"]],
    body: projects.map((p) => [
      p.name,
      projectStatusLabels[p.status as keyof typeof projectStatusLabels] ?? p.status,
      p.priority,
      `${p.progress}%`,
      nameOf(profiles, p.owner_id),
      p.due_date ?? "—",
      String(tasks.filter((t) => t.project_id === p.id).length),
    ]),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  doc.setFontSize(13);
  doc.text("Productivity by member", 10, 14);
  autoTable(doc, {
    startY: 18,
    head: [["Member", "Role", "Assigned", "Completed", "Completion %"]],
    body: profiles.map((m) => {
      const assigned = tasks.filter((t) => t.assignee_id === m.id);
      const done = assigned.filter((t) => t.status === "done").length;
      return [
        m.display_name ?? "—",
        m.role_title ?? "",
        String(assigned.length),
        String(done),
        assigned.length ? `${Math.round((done / assigned.length) * 100)}%` : "0%",
      ];
    }),
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9 },
  });

  doc.save(`taskflow-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
