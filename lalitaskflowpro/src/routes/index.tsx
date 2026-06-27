import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  KanbanSquare,
  Calendar,
  BarChart3,
  Users,
  FolderKanban,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow Pro — Smart Project Management" },
      {
        name: "description",
        content:
          "Premium project management for modern teams: projects, Kanban tasks, calendar, team chat, and analytics.",
      },
      { property: "og:title", content: "TaskFlow Pro — Smart Project Management" },
      {
        property: "og:description",
        content:
          "Run your team's work like a precision instrument. Projects, Kanban, calendar, and analytics in one workspace.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { Icon: FolderKanban, title: "Projects", desc: "Plan, scope, and track every initiative." },
  { Icon: KanbanSquare, title: "Kanban Board", desc: "Drag-and-drop tasks across stages." },
  { Icon: Calendar, title: "Calendar", desc: "See deadlines in a unified timeline." },
  { Icon: Users, title: "Team", desc: "Collaborate with shared visibility." },
  { Icon: BarChart3, title: "Analytics", desc: "Insights into throughput and velocity." },
  { Icon: Shield, title: "Secure", desc: "OTP sign-in, RLS, SOC 2 ready." },
] as const;

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-foreground">
      <div className="pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 size-[28rem] rounded-full bg-accent-2/15 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand shadow-brand">
            <div className="size-3.5 rotate-45 border-2 border-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">TaskFlow Pro</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5"
          >
            Get started <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Project management, refined
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Run your team's work like a precision instrument.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Projects, Kanban tasks, calendar, team, and analytics — together in one beautifully
          designed workspace.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-brand transition hover:-translate-y-0.5"
          >
            Sign in to your workspace <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="rounded-xl border border-border bg-panel px-5 py-3 text-sm font-semibold text-foreground shadow-card transition hover:bg-slate-50"
          >
            Create an account
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-panel/70 p-6 shadow-card backdrop-blur-md"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TaskFlow Pro
      </footer>
    </div>
  );
}
