drop policy if exists "Authenticated can update bookings" on public.bookings;

create policy "Authenticated can update bookings"
  on public.bookings
  for update
  to authenticated
  using (true)
  with check (true);
