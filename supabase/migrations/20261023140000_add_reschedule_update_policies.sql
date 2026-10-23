-- V4 (reschedules + consensus): the original vendor migration created only
-- SELECT/INSERT policies on these tables. Accepting or rejecting a reschedule
-- proposal (and updating a consensus vote) requires UPDATE policies, otherwise
-- RLS silently denies the write. Safe to re-run.

drop policy if exists "parties update reschedules" on public.vendor_booking_reschedules;
create policy "parties update reschedules" on public.vendor_booking_reschedules
  for update using (
    proposed_by = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_bookings b
               where b.id = vendor_booking_reschedules.booking_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()))
  );

drop policy if exists "voters update consensus" on public.vendor_booking_consensus;
create policy "voters update consensus" on public.vendor_booking_consensus
  for update using (user_id = auth.uid());
