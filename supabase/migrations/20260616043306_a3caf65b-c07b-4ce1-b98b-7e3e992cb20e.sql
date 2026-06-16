DROP POLICY IF EXISTS "pessoas insert authenticated" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas update authenticated" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas delete authenticated" ON public.pessoas;
CREATE POLICY "pessoas insert authenticated" ON public.pessoas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pessoas update authenticated" ON public.pessoas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pessoas delete authenticated" ON public.pessoas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "produtos insert authenticated" ON public.produtos;
DROP POLICY IF EXISTS "produtos update authenticated" ON public.produtos;
DROP POLICY IF EXISTS "produtos delete authenticated" ON public.produtos;
CREATE POLICY "produtos insert authenticated" ON public.produtos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "produtos update authenticated" ON public.produtos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "produtos delete authenticated" ON public.produtos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "vendas insert authenticated" ON public.vendas;
DROP POLICY IF EXISTS "vendas update authenticated" ON public.vendas;
DROP POLICY IF EXISTS "vendas delete authenticated" ON public.vendas;
CREATE POLICY "vendas insert authenticated" ON public.vendas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "vendas update authenticated" ON public.vendas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "vendas delete authenticated" ON public.vendas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notas_fornecedores insert authenticated" ON public.notas_fornecedores;
DROP POLICY IF EXISTS "notas_fornecedores update authenticated" ON public.notas_fornecedores;
DROP POLICY IF EXISTS "notas_fornecedores delete authenticated" ON public.notas_fornecedores;
CREATE POLICY "notas_fornecedores insert authenticated" ON public.notas_fornecedores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notas_fornecedores update authenticated" ON public.notas_fornecedores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notas_fornecedores delete authenticated" ON public.notas_fornecedores FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);