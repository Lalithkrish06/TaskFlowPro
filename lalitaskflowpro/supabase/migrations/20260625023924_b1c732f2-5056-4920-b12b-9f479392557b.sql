
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update, insert on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- App roles
create type public.app_role as enum ('admin','manager','member');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "user_roles_admin_all" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','on_hold','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','manager','member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
grant select, insert, update, delete on public.project_members to authenticated;
grant all on public.project_members to service_role;

create or replace function public.is_project_member(_project_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = _project_id and user_id = _user_id)
      or exists (select 1 from public.projects where id = _project_id and owner_id = _user_id)
$$;

alter table public.projects enable row level security;
create policy "projects_select_member" on public.projects for select to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "projects_insert_self" on public.projects for insert to authenticated
  with check (owner_id = auth.uid());
create policy "projects_update_owner_mgr" on public.projects for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (true);
create policy "projects_delete_owner_admin" on public.projects for delete to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

alter table public.project_members enable row level security;
create policy "pm_select_member" on public.project_members for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())
         or public.has_role(auth.uid(),'admin'));
create policy "pm_insert_owner_admin" on public.project_members for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())
              or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));
create policy "pm_delete_owner_admin" on public.project_members for delete to authenticated
  using (exists (select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid())
         or public.has_role(auth.uid(),'admin'));

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  position int not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "tasks_select_member" on public.tasks for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "tasks_insert_member" on public.tasks for insert to authenticated
  with check (public.is_project_member(project_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "tasks_update_member" on public.tasks for update to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_project_member(project_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "tasks_delete_member" on public.tasks for delete to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

-- Attachments
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  size bigint not null,
  mime_type text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.task_attachments to authenticated;
grant all on public.task_attachments to service_role;
alter table public.task_attachments enable row level security;
create policy "att_select_member" on public.task_attachments for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and (public.is_project_member(t.project_id, auth.uid()) or public.has_role(auth.uid(),'admin')))
);
create policy "att_insert_member" on public.task_attachments for insert to authenticated with check (
  uploaded_by = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (public.is_project_member(t.project_id, auth.uid()) or public.has_role(auth.uid(),'admin')))
);
create policy "att_delete_member" on public.task_attachments for delete to authenticated using (
  uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin')
);

-- Updated_at trigger
create or replace function public.tg_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger trg_projects_updated before update on public.projects for each row execute function public.tg_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.tg_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.tg_updated_at();

-- Auto profile on signup + default role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'member')
  on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime
alter table public.projects replica identity full;
alter table public.tasks replica identity full;
alter table public.task_attachments replica identity full;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_attachments;

-- Storage policies for task-attachments bucket (path: {project_id}/{task_id}/{file})
create policy "storage_att_select" on storage.objects for select to authenticated using (
  bucket_id = 'task-attachments' and public.is_project_member((split_part(name,'/',1))::uuid, auth.uid())
);
create policy "storage_att_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'task-attachments' and public.is_project_member((split_part(name,'/',1))::uuid, auth.uid())
);
create policy "storage_att_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'task-attachments' and (owner = auth.uid() or public.is_project_member((split_part(name,'/',1))::uuid, auth.uid()))
);
