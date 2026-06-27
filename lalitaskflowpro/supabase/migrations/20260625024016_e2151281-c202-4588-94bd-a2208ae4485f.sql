
-- Tighten search_path
alter function public.tg_updated_at() set search_path = public;

-- Replace overly permissive update policy
drop policy if exists "projects_update_owner_mgr" on public.projects;
create policy "projects_update_owner_mgr" on public.projects for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

-- Revoke execute from public/anon on security-definer helpers
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_project_member(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
