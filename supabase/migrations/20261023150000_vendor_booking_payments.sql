-- V5 (vendor booking payments): automatic escrow -> fee-split -> refund chain
-- for vendor_bookings, using the existing wallets/transactions tables.
--
-- Wallet RLS only lets a user write their OWN wallet, so crediting the vendor's
-- wallet from the learner's session is impossible in app code. These SECURITY
-- DEFINER trigger functions run the ledger atomically, driven purely by booking
-- status transitions:
--   pending -> booked      : escrow_hold  (learner wallet debited)
--   *      -> completed    : fee_split    (vendor wallet credited, net of platform fee)
--   *      -> cancelled    : refund       (escrow returned to learner, if held)
-- Idempotent: each phase runs at most once per booking (checked in-function).

create or replace function public.handle_vendor_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_fee_pct numeric;
  v_fee numeric;
  v_net numeric;
  v_learner_wallet_id uuid;
  v_vendor_wallet_id uuid;
  v_balance numeric;
  v_gross numeric;
begin
  v_total := coalesce(new.total_price, 0);
  if v_total <= 0 then
    return new;
  end if;

  -- ---------- ESCROW: pending -> booked ----------
  if new.status = 'booked' and old.status = 'pending' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new;
    end if;

    select w.id, w.balance into v_learner_wallet_id, v_balance
    from wallets w where w.user_id = new.learner_id limit 1;

    if v_learner_wallet_id is null or v_balance is null or v_balance < v_total then
      raise exception 'INSUFFICIENT_FUNDS'
        using errcode = 'P0002',
              message = 'Learner wallet has insufficient funds for this booking';
    end if;

    update wallets set balance = balance - v_total where id = v_learner_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_learner_wallet_id, 'escrow_hold', v_total, v_balance,
            jsonb_build_object('vendor_booking_id', new.id), new.id);

  -- ---------- SETTLE: -> completed ----------
  elsif new.status = 'completed' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'fee_split') then
      return new;
    end if;
    if not exists (select 1 from transactions t
                   where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new; -- never escrowed (e.g. legacy rows); nothing to split
    end if;

    select coalesce(max(case when s.key = 'platform_fee_percent'
                        then s.value::numeric end), 10)
      into v_fee_pct
    from platform_settings s;

    v_fee := round(v_total * v_fee_pct / 100.0, 2);
    v_net := v_total - v_fee;

    select w.id into v_vendor_wallet_id
    from wallets w where w.user_id = new.provider_id limit 1;

    if v_vendor_wallet_id is null then
      insert into wallets (user_id, balance) values (new.provider_id, 0)
        returning id into v_vendor_wallet_id;
    end if;

    update wallets set balance = balance + v_net where id = v_vendor_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_vendor_wallet_id, 'fee_split', v_net, v_balance,
            jsonb_build_object('vendor_booking_id', new.id,
                                'gross', v_total,
                                'platform_fee', v_fee,
                                'platform_fee_percent', v_fee_pct),
            new.id);

  -- ---------- REFUND: -> cancelled ----------
  elsif new.status = 'cancelled' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'refund') then
      return new;
    end if;
    if not exists (select 1 from transactions t
                   where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new; -- nothing was held; nothing to refund
    end if;

    select w.id into v_learner_wallet_id
    from wallets w where w.user_id = new.learner_id limit 1;

    if v_learner_wallet_id is null then
      insert into wallets (user_id, balance) values (new.learner_id, 0)
        returning id into v_learner_wallet_id;
    end if;

    update wallets set balance = balance + v_total where id = v_learner_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_learner_wallet_id, 'refund', v_total, v_balance,
            jsonb_build_object('vendor_booking_id', new.id), new.id);
  end if;

  return new;
end $$;

drop trigger if exists vendor_booking_payment on public.vendor_bookings;
create trigger vendor_booking_payment
  after update on public.vendor_bookings
  for each row execute function public.handle_vendor_booking_payment();
