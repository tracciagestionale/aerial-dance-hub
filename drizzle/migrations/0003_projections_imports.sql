ALTER TABLE public.payments ADD COLUMN import_key text;
CREATE UNIQUE INDEX payments_import_key_unique ON public.payments(import_key) WHERE import_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.project_finance(_month date) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE m date := date_trunc('month',_month)::date; last_day date := (m + interval '1 month - 1 day')::date; fees numeric:=0; excluded numeric:=0; pay numeric:=0; s record; k text; a numeric;
BEGIN
 IF NOT public.is_owner() THEN RAISE EXCEPTION 'Solo la responsabile'; END IF;
 FOR s IN SELECT st.id, st.exclude_from_split, bool_or(not c.is_competition) ordinary, (st.competes or bool_or(c.is_competition)) gare FROM students st JOIN enrollments e ON e.student_id=st.id JOIN courses c ON c.id=e.course_id WHERE st.active AND st.merged_into IS NULL AND e.start_date<=last_day AND (e.end_date IS NULL OR e.end_date>=m) GROUP BY st.id LOOP
  FOREACH k IN ARRAY ARRAY['base','gare'] LOOP
   IF (k='base' AND s.ordinary) OR (k='gare' AND s.gare) THEN
    SELECT amount INTO a FROM charges WHERE student_id=s.id AND month=m AND kind=k;
    IF NOT FOUND THEN SELECT f.amount INTO a FROM public.fee_amount(s.id,m,k) f; END IF;
    a:=greatest(coalesce(a,0),0); fees:=fees+a; IF s.exclude_from_split THEN excluded:=excluded+a; END IF;
   END IF;
  END LOOP;
 END LOOP;
 SELECT coalesce(sum(cs.duration_hours*coalesce(public.rate_for(cs.teacher_id,d.day::date),0)),0) INTO pay FROM course_schedules cs JOIN courses c ON c.id=cs.course_id CROSS JOIN generate_series(m::timestamp,last_day::timestamp,interval '1 day') d(day) WHERE cs.active AND c.active AND extract(isodow FROM d.day)=cs.weekday AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id=cs.course_id AND l.lesson_date=d.day::date AND l.start_time=cs.start_time);
 SELECT pay+coalesce(sum(ls.hours*coalesce(ls.rate_applied,0)),0) INTO pay FROM lesson_staff ls JOIN lessons l ON l.id=ls.lesson_id WHERE l.lesson_date BETWEEN m AND last_day AND l.status='svolta';
 RETURN jsonb_build_object('month',m,'fees',fees,'excluded',excluded,'teacherPay',pay);
END $$;
REVOKE ALL ON FUNCTION public.project_finance(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.project_finance(date) TO authenticated;
CREATE OR REPLACE FUNCTION public.import_data(_kind text,_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r jsonb; sid uuid; pid uuid; n integer:=0; skipped integer:=0; cid uuid; key text;
BEGIN
 IF NOT public.is_owner() THEN RAISE EXCEPTION 'Solo la responsabile'; END IF;
 IF _kind NOT IN ('students','payments') OR jsonb_typeof(_rows)<>'array' OR jsonb_array_length(_rows)>1000 THEN RAISE EXCEPTION 'Importazione non valida'; END IF;
 PERFORM pg_advisory_xact_lock(771230);
 FOR r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
  IF _kind='students' THEN
   IF length(trim(r->>'first_name')) NOT BETWEEN 1 AND 100 OR length(trim(r->>'last_name')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Nome o cognome non valido'; END IF;
   cid:=(r->>'course_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM courses WHERE id=cid AND active) THEN RAISE EXCEPTION 'Corso non valido'; END IF;
   sid:=NULL;
   IF nullif(r->>'student_id','') IS NOT NULL THEN
    SELECT id INTO sid FROM students WHERE id=(r->>'student_id')::uuid AND merged_into IS NULL;
    IF sid IS NULL THEN RAISE EXCEPTION 'Allieva non trovata'; END IF;
   ELSE
    SELECT id INTO sid FROM students WHERE merged_into IS NULL AND (code=nullif(r->>'code','') OR (lower(trim(first_name))=lower(trim(r->>'first_name')) AND lower(trim(last_name))=lower(trim(r->>'last_name')))) LIMIT 1;
    IF sid IS NOT NULL THEN skipped:=skipped+1; CONTINUE; END IF;
    INSERT INTO students(first_name,last_name,email,phone,birth_date,created_by) VALUES(trim(r->>'first_name'),trim(r->>'last_name'),nullif(r->>'email',''),nullif(r->>'phone',''),nullif(r->>'birth_date','')::date,auth.uid()) RETURNING id INTO sid;
   END IF;
   INSERT INTO enrollments(student_id,course_id,start_date) VALUES(sid,cid,(r->>'start_date')::date) ON CONFLICT (student_id,course_id) WHERE active DO NOTHING;
   n:=n+1;
  ELSE
   key:=r->>'import_key';
   IF key IS NULL OR length(key)<>64 OR (r->>'amount')::numeric<=0 OR length(coalesce(r->>'reference',''))>500 THEN RAISE EXCEPTION 'Pagamento non valido'; END IF;
   sid:=nullif(r->>'student_id','')::uuid;
   IF EXISTS(SELECT 1 FROM payments WHERE import_key=key OR (paid_on=(r->>'paid_on')::date AND amount=(r->>'amount')::numeric AND coalesce(reference,'')=coalesce(r->>'reference','') AND student_id IS NOT DISTINCT FROM sid)) THEN skipped:=skipped+1; CONTINUE; END IF;
   INSERT INTO payments(student_id,paid_on,amount,reference,method,received_by,recorded_by,import_key) VALUES(sid,(r->>'paid_on')::date,(r->>'amount')::numeric,r->>'reference','bonifico','palestra',auth.uid(),key) ON CONFLICT DO NOTHING RETURNING id INTO pid;
   IF pid IS NULL THEN skipped:=skipped+1; ELSE n:=n+1; END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',n,'skipped',skipped);
END $$;
REVOKE ALL ON FUNCTION public.import_data(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_data(text,jsonb) TO authenticated;