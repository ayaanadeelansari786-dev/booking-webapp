drop policy if exists "Authenticated can delete technicians" on public.technicians;

create policy "Authenticated can delete technicians"
  on public.technicians
  for delete
  to authenticated
  using (true);
