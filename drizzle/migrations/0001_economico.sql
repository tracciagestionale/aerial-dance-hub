alter table public.students add column exclude_from_split boolean not null default false;
alter table public.lesson_staff add column rate_applied numeric;

create or replace function public.rate_for(_teacher uuid, _date date) returns numeric
language sql stable security definer set search_path=public as $$
  select case when t.is_owner then 0 else (select r.hourly_rate from public.teacher_rates r
    where r.teacher_id=_teacher and r.valid_from<=_date and (r.valid_to is null or r.valid_to>=_date)
    order by r.valid_from desc limit 1) end
  from public.teachers t where t.id=_teacher $$;

create or replace function public.lesson_staff_rate() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  new.rate_applied := coalesce(public.rate_for(new.teacher_id, (select lesson_date from public.lessons where id=new.lesson_id)), 0);
  return new;
end $$;
create trigger lesson_staff_rate before insert or update of teacher_id, hours, lesson_id on public.lesson_staff
for each row execute function public.lesson_staff_rate();
update public.lesson_staff ls set rate_applied = coalesce(public.rate_for(ls.teacher_id, l.lesson_date),0) from public.lessons l where l.id=ls.lesson_id;

create table public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('base','gare')),
  amount numeric not null,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now()
);
create table public.student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  kind text not null check (kind in ('base','gare')),
  amount numeric not null,
  valid_from date not null,
  valid_to date,
  note text,
  created_at timestamptz not null default now()
);
create table public.fee_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  month date not null,
  kind text not null check (kind in ('base','gare')),
  amount numeric not null,
  note text,
  unique (student_id, month, kind)
);
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  month date not null,
  kind text not null check (kind in ('base','gare')),
  amount numeric not null,
  source text not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  unique (student_id, month, kind)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id),
  paid_on date not null default current_date,
  amount numeric not null check (amount > 0),
  method text not null default 'bonifico',
  received_by text not null default 'palestra' check (received_by in ('palestra','arianna','insegnante')),
  reference text,
  notes text,
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  amount numeric not null check (amount > 0)
);
create table public.teacher_payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  month date not null,
  amount numeric not null,
  paid_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create table public.gym_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_date date not null default current_date,
  amount numeric not null check (amount > 0),
  direction text not null default 'palestra_ad_arianna' check (direction in ('palestra_ad_arianna','arianna_a_palestra')),
  reference text,
  created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  amount numeric not null,
  description text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.fee_rules, public.student_fees, public.fee_overrides, public.charges, public.payments, public.payment_allocations, public.teacher_payouts, public.gym_transfers, public.expenses to authenticated;
grant all on public.fee_rules, public.student_fees, public.fee_overrides, public.charges, public.payments, public.payment_allocations, public.teacher_payouts, public.gym_transfers, public.expenses to service_role;

alter table public.fee_rules enable row level security;
alter table public.student_fees enable row level security;
alter table public.fee_overrides enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.teacher_payouts enable row level security;
alter table public.gym_transfers enable row level security;
alter table public.expenses enable row level security;

create policy "owner" on public.fee_rules for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.student_fees for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.fee_overrides for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.charges for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.payment_allocations for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.teacher_payouts for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.gym_transfers for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.expenses for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner" on public.payments for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "teacher read own" on public.payments for select to authenticated using (recorded_by = auth.uid());
create policy "teacher insert" on public.payments for insert to authenticated
  with check (recorded_by = auth.uid() and received_by = 'insegnante' and student_id is not null and public.can_access_student(student_id));

create or replace function public.allocate_payment(_payment uuid) returns void
language plpgsql security definer set search_path=public as $$
declare p record; c record; left_amt numeric; open_amt numeric; take numeric;
begin
  select * into p from public.payments where id=_payment;
  if p is null or p.student_id is null then return; end if;
  left_amt := p.amount - coalesce((select sum(amount) from public.payment_allocations where payment_id=_payment),0);
  for c in select ch.* from public.charges ch where ch.student_id=p.student_id order by ch.month, ch.kind loop
    exit when left_amt <= 0;
    open_amt := c.amount - coalesce((select sum(amount) from public.payment_allocations where charge_id=c.id),0);
    if open_amt > 0 then
      take := least(open_amt, left_amt);
      insert into public.payment_allocations(payment_id, charge_id, amount) values (_payment, c.id, take);
      left_amt := left_amt - take;
    end if;
  end loop;
end $$;

create or replace function public.payments_auto_allocate() returns trigger
language plpgsql security definer set search_path=public as $$
begin perform public.allocate_payment(new.id); return new; end $$;
create trigger payments_auto_allocate after insert on public.payments for each row execute function public.payments_auto_allocate();

create or replace function public.reallocate_student(_student uuid) returns void
language plpgsql security definer set search_path=public as $$
declare p record;
begin
  if not public.is_owner() then raise exception 'Solo la responsabile'; end if;
  delete from public.payment_allocations pa using public.payments py where pa.payment_id=py.id and py.student_id=_student;
  for p in select id from public.payments where student_id=_student order by paid_on, created_at loop
    perform public.allocate_payment(p.id);
  end loop;
end $$;

create or replace function public.fee_amount(_student uuid, _month date, _kind text, out amount numeric, out source text)
language plpgsql stable security definer set search_path=public as $$
begin
  select o.amount, 'modifica del mese' into amount, source from public.fee_overrides o where o.student_id=_student and o.month=_month and o.kind=_kind;
  if found then return; end if;
  select f.amount, 'quota individuale' into amount, source from public.student_fees f where f.student_id=_student and f.kind=_kind
    and f.valid_from<=_month and (f.valid_to is null or f.valid_to>=_month) order by f.valid_from desc limit 1;
  if found then return; end if;
  select r.amount, 'regola generale ' || to_char(r.valid_from,'DD/MM/YYYY') into amount, source from public.fee_rules r where r.kind=_kind
    and r.valid_from<=_month and (r.valid_to is null or r.valid_to>=_month) order by r.valid_from desc limit 1;
end $$;

create or replace function public.generate_charges(_month date) returns integer
language plpgsql security definer set search_path=public as $$
declare m date := date_trunc('month', _month)::date; m_end date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  s record; a numeric; src text; n integer := 0; c integer;
begin
  if not public.is_owner() then raise exception 'Solo la responsabile'; end if;
  for s in
    select st.id,
      bool_or(not co.is_competition) as ordinary,
      (st.competes or bool_or(co.is_competition)) as gare
    from public.students st
    join public.enrollments e on e.student_id=st.id
    join public.courses co on co.id=e.course_id
    where st.active and st.merged_into is null
      and e.start_date<=m_end and (e.end_date is null or e.end_date>=m)
    group by st.id, st.competes
  loop
    if s.ordinary then
      select f.amount, f.source into a, src from public.fee_amount(s.id, m, 'base') f;
      if a is not null and a > 0 then
        insert into public.charges(student_id, month, kind, amount, source, due_date) values (s.id, m, 'base', a, src, m + 9)
        on conflict do nothing; get diagnostics c = row_count; n := n + c;
      end if;
    end if;
    if s.gare then
      select f.amount, f.source into a, src from public.fee_amount(s.id, m, 'gare') f;
      if a is not null and a > 0 then
        insert into public.charges(student_id, month, kind, amount, source, due_date) values (s.id, m, 'gare', a, src, m + 9)
        on conflict do nothing; get diagnostics c = row_count; n := n + c;
      end if;
    end if;
  end loop;
  -- allocate unallocated payment remainders
  perform public.allocate_payment(p.id) from public.payments p;
  return n;
end $$;

grant execute on function public.generate_charges(date), public.reallocate_student(uuid) to authenticated;
revoke execute on function public.allocate_payment(uuid) from anon;