
create type public.app_role as enum ('owner','teacher');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public
as $$ select public.has_role(auth.uid(),'owner') $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_owner());

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  user_id uuid unique,
  is_owner boolean not null default false,
  is_assistant boolean not null default false,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teachers to authenticated;
grant all on public.teachers to service_role;
alter table public.teachers enable row level security;

create or replace function public.my_teacher_id() returns uuid language sql stable security definer set search_path=public
as $$ select id from public.teachers where user_id = auth.uid() limit 1 $$;

create table public.teacher_rates (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  hourly_rate numeric(10,2) not null,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teacher_rates to authenticated;
grant all on public.teacher_rates to service_role;
alter table public.teacher_rates enable row level security;
create policy "owner rates" on public.teacher_rates for all to authenticated using (public.is_owner()) with check (public.is_owner());

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_competition boolean not null default false,
  assistant_teacher_id uuid references public.teachers(id),
  active boolean not null default true,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;

create table public.course_teachers (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  unique(course_id, teacher_id)
);
grant select, insert, update, delete on public.course_teachers to authenticated;
grant all on public.course_teachers to service_role;
alter table public.course_teachers enable row level security;

create table public.course_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_time time not null,
  duration_hours numeric(4,2) not null default 2,
  teacher_id uuid references public.teachers(id),
  active boolean not null default true
);
grant select, insert, update, delete on public.course_schedules to authenticated;
grant all on public.course_schedules to service_role;
alter table public.course_schedules enable row level security;

create or replace function public.can_access_course(_course_id uuid) returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_owner() or exists (
    select 1 from public.course_teachers ct join public.teachers t on t.id=ct.teacher_id
    where ct.course_id=_course_id and t.user_id=auth.uid() and t.active)
  or exists (
    select 1 from public.course_schedules cs join public.teachers t on t.id=cs.teacher_id
    where cs.course_id=_course_id and t.user_id=auth.uid() and t.active)
$$;

create policy "courses read" on public.courses for select to authenticated using (public.can_access_course(id));
create policy "courses owner write" on public.courses for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "ct read" on public.course_teachers for select to authenticated using (public.can_access_course(course_id));
create policy "ct owner" on public.course_teachers for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "cs read" on public.course_schedules for select to authenticated using (public.can_access_course(course_id));
create policy "cs owner" on public.course_schedules for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "teachers read" on public.teachers for select to authenticated using (public.is_owner() or public.my_teacher_id() is not null);
create policy "teachers owner" on public.teachers for all to authenticated using (public.is_owner()) with check (public.is_owner());

create sequence public.student_code_seq start 1;
create table public.students (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('ALL-' || lpad(nextval('public.student_code_seq')::text, 4, '0')),
  first_name text not null,
  last_name text not null,
  birth_date date,
  email text,
  phone text,
  parent1_phone text,
  parent2_phone text,
  active boolean not null default true,
  competes boolean not null default false,
  notes text,
  merged_into uuid references public.students(id),
  created_by uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant usage on sequence public.student_code_seq to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  course_id uuid not null references public.courses(id),
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index enrollments_active_uniq on public.enrollments(student_id, course_id) where active;
grant select, insert, update, delete on public.enrollments to authenticated;
grant all on public.enrollments to service_role;
alter table public.enrollments enable row level security;

create or replace function public.can_access_student(_student_id uuid) returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_owner()
   or exists (select 1 from public.enrollments e where e.student_id=_student_id and public.can_access_course(e.course_id))
   or exists (select 1 from public.students s where s.id=_student_id and s.created_by=auth.uid())
$$;

create policy "students read" on public.students for select to authenticated using (public.can_access_student(id));
create policy "students insert" on public.students for insert to authenticated with check (public.is_owner() or (public.my_teacher_id() is not null and created_by = auth.uid()));
create policy "students update" on public.students for update to authenticated using (public.can_access_student(id)) with check (public.can_access_student(id));
create policy "students delete" on public.students for delete to authenticated using (public.is_owner());

create policy "enr read" on public.enrollments for select to authenticated using (public.can_access_course(course_id));
create policy "enr insert" on public.enrollments for insert to authenticated with check (public.can_access_course(course_id));
create policy "enr update" on public.enrollments for update to authenticated using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));
create policy "enr delete" on public.enrollments for delete to authenticated using (public.is_owner());

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  schedule_id uuid references public.course_schedules(id),
  lesson_date date not null,
  start_time time not null,
  duration_hours numeric(4,2) not null default 2,
  status text not null default 'svolta' check (status in ('svolta','annullata')),
  planned_teacher_id uuid references public.teachers(id),
  notes text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(course_id, lesson_date, start_time)
);
grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;
alter table public.lessons enable row level security;
create policy "lessons read" on public.lessons for select to authenticated using (public.can_access_course(course_id));
create policy "lessons write" on public.lessons for all to authenticated using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));

create table public.lesson_staff (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  role text not null check (role in ('insegnante','sostituta','assistente')),
  hours numeric(4,2) not null,
  unique(lesson_id, teacher_id)
);
grant select, insert, update, delete on public.lesson_staff to authenticated;
grant all on public.lesson_staff to service_role;
alter table public.lesson_staff enable row level security;
create policy "ls access" on public.lesson_staff for all to authenticated
  using (exists (select 1 from public.lessons l where l.id=lesson_id and public.can_access_course(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id=lesson_id and public.can_access_course(l.course_id)));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id),
  status text not null check (status in ('presente','assente')),
  unique(lesson_id, student_id)
);
grant select, insert, update, delete on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "att access" on public.attendance for all to authenticated
  using (exists (select 1 from public.lessons l where l.id=lesson_id and public.can_access_course(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id=lesson_id and public.can_access_course(l.course_id)));

create or replace function public.save_lesson(payload jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  _lesson_id uuid;
  _course uuid := (payload->>'course_id')::uuid;
  s jsonb; a jsonb;
begin
  if not public.can_access_course(_course) then raise exception 'Non autorizzata per questo corso'; end if;
  insert into public.lessons(id, course_id, schedule_id, lesson_date, start_time, duration_hours, status, planned_teacher_id, notes, updated_by, updated_at)
  values (coalesce((payload->>'id')::uuid, gen_random_uuid()), _course, nullif(payload->>'schedule_id','')::uuid,
    (payload->>'lesson_date')::date, (payload->>'start_time')::time, coalesce((payload->>'duration_hours')::numeric,2),
    coalesce(payload->>'status','svolta'), nullif(payload->>'planned_teacher_id','')::uuid, payload->>'notes', auth.uid(), now())
  on conflict (course_id, lesson_date, start_time) do update set
    duration_hours=excluded.duration_hours, status=excluded.status, notes=excluded.notes,
    planned_teacher_id=coalesce(excluded.planned_teacher_id, lessons.planned_teacher_id),
    updated_by=auth.uid(), updated_at=now()
  returning id into _lesson_id;

  if payload ? 'staff' then
    delete from public.lesson_staff where lesson_id=_lesson_id;
    for s in select * from jsonb_array_elements(payload->'staff') loop
      insert into public.lesson_staff(lesson_id, teacher_id, role, hours)
      values (_lesson_id, (s->>'teacher_id')::uuid, s->>'role', (s->>'hours')::numeric)
      on conflict (lesson_id, teacher_id) do update set role=excluded.role, hours=excluded.hours;
    end loop;
  end if;

  if payload ? 'attendance' then
    for a in select * from jsonb_array_elements(payload->'attendance') loop
      if coalesce(a->>'status','') = '' then
        delete from public.attendance where lesson_id=_lesson_id and student_id=(a->>'student_id')::uuid;
      else
        insert into public.attendance(lesson_id, student_id, status) values (_lesson_id, (a->>'student_id')::uuid, a->>'status')
        on conflict (lesson_id, student_id) do update set status=excluded.status;
      end if;
    end loop;
  end if;
  return _lesson_id;
end $$;
grant execute on function public.save_lesson(jsonb) to authenticated;

create or replace function public.possible_duplicates(_first text, _last text, _birth date default null, _exclude uuid default null)
returns setof public.students language sql stable security invoker set search_path=public as $$
  select * from public.students
  where (id is distinct from _exclude) and merged_into is null
    and lower(trim(last_name)) = lower(trim(_last))
    and (lower(trim(first_name)) = lower(trim(_first)) or left(lower(first_name),3)=left(lower(_first),3) or (birth_date is not null and birth_date=_birth))
$$;
grant execute on function public.possible_duplicates(text,text,date,uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare t public.teachers;
begin
  select * into t from public.teachers where lower(email)=lower(new.email) and user_id is null limit 1;
  if found then
    update public.teachers set user_id=new.id where id=t.id;
    insert into public.user_roles(user_id, role) values (new.id, case when t.is_owner then 'owner'::app_role else 'teacher'::app_role end) on conflict do nothing;
  elsif not exists (select 1 from public.user_roles where role='owner') then
    insert into public.user_roles(user_id, role) values (new.id,'owner');
    update public.teachers set user_id=new.id where is_owner and user_id is null;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.teachers(id, full_name, email, is_owner, is_assistant, is_demo) values
 ('00000000-0000-0000-0000-000000000001','Arianna Dell''Orfano','arianna@materiali.demo',true,false,true),
 ('00000000-0000-0000-0000-000000000002','Ida Nasto','ida@materiali.demo',false,false,true),
 ('00000000-0000-0000-0000-000000000003','Francesca Longobardi','francesca@materiali.demo',false,false,true),
 ('00000000-0000-0000-0000-000000000004','Filena Gentile','filena@materiali.demo',false,false,true),
 ('00000000-0000-0000-0000-000000000005','Antonella Summa','antonella@materiali.demo',false,false,true),
 ('00000000-0000-0000-0000-000000000006','Irene Catuogno','irene@materiali.demo',false,false,true),
 ('00000000-0000-0000-0000-000000000007','Paola','paola@materiali.demo',false,true,true);

insert into public.teacher_rates(teacher_id, hourly_rate, valid_from) values
 ('00000000-0000-0000-0000-000000000003',15,'2026-09-01'),
 ('00000000-0000-0000-0000-000000000004',20,'2026-09-01'),
 ('00000000-0000-0000-0000-000000000002',15,'2026-09-01'),
 ('00000000-0000-0000-0000-000000000005',20,'2026-09-01'),
 ('00000000-0000-0000-0000-000000000006',25,'2026-09-01'),
 ('00000000-0000-0000-0000-000000000007',15,'2026-09-01');

insert into public.courses(id,name,is_competition,assistant_teacher_id,sort_order,is_demo) values
 ('10000000-0000-0000-0000-000000000001','Kids 1',false,null,1,true),
 ('10000000-0000-0000-0000-000000000002','Kids 2',false,null,2,true),
 ('10000000-0000-0000-0000-000000000003','Junior',false,null,3,true),
 ('10000000-0000-0000-0000-000000000004','Adulti',false,'00000000-0000-0000-0000-000000000007',4,true),
 ('10000000-0000-0000-0000-000000000005','Preparazione gare',true,null,5,true);

insert into public.course_schedules(course_id,weekday,start_time,duration_hours,teacher_id) values
 ('10000000-0000-0000-0000-000000000001',2,'17:00',2,'00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000001',4,'17:00',2,'00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000002',1,'16:00',2,'00000000-0000-0000-0000-000000000003'),
 ('10000000-0000-0000-0000-000000000002',3,'16:00',2,'00000000-0000-0000-0000-000000000004'),
 ('10000000-0000-0000-0000-000000000003',1,'18:00',2,'00000000-0000-0000-0000-000000000003'),
 ('10000000-0000-0000-0000-000000000003',3,'18:00',2,'00000000-0000-0000-0000-000000000004'),
 ('10000000-0000-0000-0000-000000000004',1,'20:00',2,'00000000-0000-0000-0000-000000000005'),
 ('10000000-0000-0000-0000-000000000004',3,'20:00',2,'00000000-0000-0000-0000-000000000005'),
 ('10000000-0000-0000-0000-000000000005',5,'17:30',2,'00000000-0000-0000-0000-000000000001');

insert into public.course_teachers(course_id,teacher_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007'),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006');

with names(fn, ln, bd, course, competes) as (values
 ('Sofia','Esposito','2018-03-12','1',false),('Giulia','Russo','2017-11-02','1',false),('Aurora','Romano','2018-06-21','1',false),
 ('Ginevra','Colombo','2017-09-30','1',false),('Alice','Ricci','2018-01-15','1',false),('Beatrice','Marino','2017-05-08','1',false),
 ('Emma','Greco','2018-08-19','1',false),('Vittoria','Bruno','2017-12-03','1',false),
 ('Martina','Gallo','2015-04-11','2',false),('Chiara','Conti','2014-10-27','2',true),('Anna','De Luca','2015-02-14','2',false),
 ('Greta','Mancini','2014-07-05','2',false),('Matilde','Costa','2015-09-22','2',true),('Ludovica','Giordano','2014-12-01','2',false),
 ('Camilla','Rizzo','2015-06-17','2',false),('Nicole','Lombardi','2014-03-29','2',false),
 ('Rebecca','Moretti','2011-05-03','3',true),('Elena','Barbieri','2010-08-14','3',false),('Noemi','Fontana','2011-01-25','3',true),
 ('Arianna','Santoro','2010-11-09','3',false),('Gaia','Mariani','2011-07-18','3',false),('Asia','Rinaldi','2010-04-06','3',true),
 ('Viola','Caruso','2011-10-30','3',false),('Sara','Ferrara','2010-02-20','3',false),
 ('Francesca','Galli','1992-06-14','4',false),('Valentina','Martini','1988-09-03','4',false),('Federica','Leone','1995-12-22','4',false),
 ('Roberta','Longo','1985-03-17','4',false),('Simona','Gentile','1990-07-29','4',false),('Ilaria','Martinelli','1997-01-08','4',true),
 ('Laura','Vitale','1983-11-11','4',false),('Serena','Lombardo','1993-05-26','4',false),('Michela','Serra','1989-08-02','4',false),
 ('Claudia','Coppola','1996-10-15','4',false),('Paola','De Santis','1987-04-19','4',false),('Daniela','D''Angelo','1991-02-28','4',false),
 ('Marta','Marchetti','2000-09-09','4',false),('Silvia','Parisi','1994-06-06','4',false)
), ins as (
  insert into public.students(first_name,last_name,birth_date,competes,is_demo,parent1_phone,notes)
  select fn, ln, bd::date, competes, true, case when course in ('1','2','3') then '+39 333 '||lpad((abs(hashtext(fn||ln))%10000000)::text,7,'0') end, 'DEMO'
  from names order by ln, fn
  returning id, first_name, last_name, competes
)
insert into public.enrollments(student_id, course_id, start_date)
select ins.id, ('10000000-0000-0000-0000-00000000000'||n.course)::uuid, date '2026-09-15' from ins join names n on n.fn=ins.first_name and n.ln=ins.last_name
union all
select ins.id, '10000000-0000-0000-0000-000000000005'::uuid, date '2026-09-15' from ins where ins.competes;
