DO $$
DECLARE
  tbl record;
  pol record;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', tbl.tablename);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl.tablename);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl.tablename
        AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl.tablename);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl.tablename || ' select authenticated',
      tbl.tablename
    );
  END LOOP;
END $$;