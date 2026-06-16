CREATE TABLE IF NOT EXISTS public.pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id UUID NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  setor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pessoas TO authenticated;
GRANT ALL ON public.pessoas TO service_role;
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pessoas select authenticated" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas insert authenticated" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas update authenticated" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas delete authenticated" ON public.pessoas;
CREATE POLICY "pessoas select authenticated" ON public.pessoas FOR SELECT TO authenticated USING (true);
CREATE POLICY "pessoas insert authenticated" ON public.pessoas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pessoas update authenticated" ON public.pessoas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pessoas delete authenticated" ON public.pessoas FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id UUID NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  fornecedor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos select authenticated" ON public.produtos;
DROP POLICY IF EXISTS "produtos insert authenticated" ON public.produtos;
DROP POLICY IF EXISTS "produtos update authenticated" ON public.produtos;
DROP POLICY IF EXISTS "produtos delete authenticated" ON public.produtos;
CREATE POLICY "produtos select authenticated" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos insert authenticated" ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "produtos update authenticated" ON public.produtos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "produtos delete authenticated" ON public.produtos FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id UUID NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unit NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  produto_nome TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendas select authenticated" ON public.vendas;
DROP POLICY IF EXISTS "vendas insert authenticated" ON public.vendas;
DROP POLICY IF EXISTS "vendas update authenticated" ON public.vendas;
DROP POLICY IF EXISTS "vendas delete authenticated" ON public.vendas;
CREATE POLICY "vendas select authenticated" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendas insert authenticated" ON public.vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vendas update authenticated" ON public.vendas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vendas delete authenticated" ON public.vendas FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.notas_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id UUID NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fornecedores TO authenticated;
GRANT ALL ON public.notas_fornecedores TO service_role;
ALTER TABLE public.notas_fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_fornecedores select authenticated" ON public.notas_fornecedores;
DROP POLICY IF EXISTS "notas_fornecedores insert authenticated" ON public.notas_fornecedores;
DROP POLICY IF EXISTS "notas_fornecedores update authenticated" ON public.notas_fornecedores;
DROP POLICY IF EXISTS "notas_fornecedores delete authenticated" ON public.notas_fornecedores;
CREATE POLICY "notas_fornecedores select authenticated" ON public.notas_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "notas_fornecedores insert authenticated" ON public.notas_fornecedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notas_fornecedores update authenticated" ON public.notas_fornecedores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notas_fornecedores delete authenticated" ON public.notas_fornecedores FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS pessoas_retiro_id_idx ON public.pessoas(retiro_id);
CREATE INDEX IF NOT EXISTS produtos_retiro_id_idx ON public.produtos(retiro_id);
CREATE INDEX IF NOT EXISTS vendas_retiro_id_idx ON public.vendas(retiro_id);
CREATE INDEX IF NOT EXISTS vendas_pessoa_id_idx ON public.vendas(pessoa_id);
CREATE INDEX IF NOT EXISTS notas_fornecedores_retiro_id_idx ON public.notas_fornecedores(retiro_id);