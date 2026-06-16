
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['pessoas','produtos','vendas','notas_fornecedores','retiros','retiro_membros'];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop existing INSERT/UPDATE/DELETE/ALL policies to avoid conflicts
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (true)', t);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
