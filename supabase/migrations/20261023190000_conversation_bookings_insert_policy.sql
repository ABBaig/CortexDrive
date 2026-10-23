-- Booking -> chat link (completes the feature flagged since the chat audit):
-- conversation_bookings existed with a SELECT policy, but no INSERT policy,
-- so the app could never write the link. Booking parties (learner or
-- instructor of the linked booking) may create the link; duplicates are
-- ignored by the app (unique constraint).

drop policy if exists "booking parties link conversation" on public.conversation_bookings;
create policy "booking parties link conversation" on public.conversation_bookings
  for insert with check (
    exists (select 1 from public.bookings b
            where b.id = booking_id
              and (b.learner_id = auth.uid() or b.instructor_id = auth.uid()))
  );
