import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Search,
  LogOut,
  Plus,
} from "lucide-react";
import { useMyProfile } from "@/hooks/use-auth";
import { initialsOf } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/projects", label: "Projects", Icon: FolderKanban },
  { to: "/board", label: "Board", Icon: KanbanSquare },
  { to: "/calendar", label: "Calendar", Icon: Calendar },
  { to: "/team", label: "Team", Icon: Users },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
] as const;

export function AppLayout({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const initials = initialsOf(profile?.display_name);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-surface text-foreground overflow-x-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 size-[28rem] bg-brand/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-40 size-[28rem] bg-accent-2/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 size-[20rem] bg-emerald-300/10 rounded-full blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-panel/40 backdrop-blur-md px-4 py-6 lg:flex">
          <Link to="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-brand shadow-brand">
              <div className="size-3.5 rotate-45 border-2 border-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TaskFlow Pro</span>
          </Link>

          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand text-brand-foreground shadow-brand"
                      : "text-slate-600 hover:bg-panel hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-border/60 bg-panel/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.display_name ?? "Member"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.role_title ?? "Team member"}
                </p>
              </div>
              <button
                onClick={signOut}
                className="ml-auto text-slate-400 hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-surface/70 px-5 pb-4 pt-7 backdrop-blur-md lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {eyebrow ?? "TaskFlow Pro"}
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground lg:text-2xl">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="hidden h-10 items-center gap-2 rounded-xl border border-border/60 bg-panel/60 px-3 text-sm text-muted-foreground backdrop-blur-md transition hover:bg-panel md:flex"
                type="button"
              >
                <Search className="size-4" />
                <span className="text-xs">Search…</span>
              </button>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-border/60 bg-panel/60 backdrop-blur-md transition hover:bg-panel"
                aria-label="Notifications"
              >
                <Bell className="size-4 text-slate-600" />
              </button>
              <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
                {initials}
              </div>
            </div>
          </header>

          {actions && (
            <div className="flex items-center justify-end gap-2 px-5 pb-3 lg:px-8">{actions}</div>
          )}

          <main className="px-5 pb-28 lg:px-8 lg:pb-12">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-border/60 bg-panel/80 px-7 py-3 backdrop-blur-xl lg:hidden">
        <BottomItem to="/dashboard" label="Home" active={pathname === "/dashboard"} />
        <BottomItem to="/projects" label="Projects" active={pathname.startsWith("/projects")} />
        <Link
          to="/board"
          className="-mt-9 grid size-12 place-items-center rounded-full border-4 border-surface bg-brand shadow-brand"
          aria-label="Board"
        >
          <Plus className="size-5 text-white" strokeWidth={2.5} />
        </Link>
        <BottomItem to="/team" label="Team" active={pathname.startsWith("/team")} />
        <BottomItem to="/analytics" label="Stats" active={pathname.startsWith("/analytics")} />
      </nav>
    </div>
  );
}

function BottomItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1">
      <span className={`size-1.5 rounded-full ${active ? "bg-brand" : "bg-transparent"}`} />
      <span
        className={`text-[10px] font-bold uppercase tracking-tight ${
          active ? "text-brand" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
