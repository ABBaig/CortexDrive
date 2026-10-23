-- No-show auto-refund (Feature 3): if the instructor doesn't arrive, the
-- learner can report a no-show once the grace window has passed. The check and
-- the money movement run atomically in one SECURITY DEFINER RPC — client time
-- is never trusted, and there is no cron dependency.
--
-- Refund policy: FULL refund of instructor_rate (instructor at fault), unlike
-- a learner-initiated cancel which deducts the platform fee.

insert into platform_settings (key, value)
values ('no_show_grace_minutes', '15')
on conflict (key) do nothing;

create or replace function public.report_instructor_no_show(p_booking_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_wallet_id uuid;
  v_balance numeric;
  v_amount numeric;
  v_grace numeric;
begin
  select * into b from bookings where id = p_booking_id;
  if not found or b.learner_id is distinct from auth.uid() then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- only a still-active lesson can be reported
  if b.status <> 'booked' then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0003';
  end if;

  -- idempotent: never refund the same booking twice
  if exists (select 1 from transactions t
             where t.related_booking = p_booking_id and t.kind = 'refund') then
    raise exception 'ALREADY_REFUNDED' using errcode = 'P0005';
  end if;

  -- server-side grace window (default 15 minutes, configurable)
  select coalesce(max(case when s.key = 'no_show_grace_minutes'
                          then s.value::numeric end), 15)
    into v_grace
  from platform_settings s;

  if now() < b.start_time + (v_grace || ' minutes')::interval then
    raise exception 'GRACE_NOT_PASSED' using errcode = 'P0004';
  end if;

  v_amount := coalesce(b.instructor_rate, 0);
  if v_amount <= 0 then
    raise exception 'NO_AMOUNT' using errcode = 'P0006';
  end if;

  select w.id into v_wallet_id from wallets w where w.user_id = b.learner_id limit 1;
  if v_wallet_id is null then
    insert into wallets (user_id, balance) values (b.learner_id, 0)
      returning id into v_wallet_id;
  end if;

  update wallets set balance = balance + v_amount where id = v_wallet_id
    returning balance into v_balance;

  update bookings set status = 'refunded' where id = p_booking_id;

  insert into transactions (wallet_id, kind, amount, balance_after, related_booking, meta)
  values (v_wallet_id, 'refund', v_amount, v_balance, p_booking_id,
          jsonb_build_object('reason', 'instructor_no_show', 'full_refund', true));

  return v_amount;
end $$;

-- only signed-in users may call it (the function itself verifies the caller
-- is the booking's learner)
revoke execute on function public.report_instructor_no_show(uuid) from anon;
grant execute on function public.report_instructor_no_show(uuid) to authenticated;
