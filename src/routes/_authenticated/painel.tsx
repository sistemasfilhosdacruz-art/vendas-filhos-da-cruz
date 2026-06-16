import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore, formatBRL } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeDollarSign, CircleDollarSign, FileText, PackageSearch, Scale, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — Loja FDC" }] }),
  component: Dashboard,
});

function Dashboard() {
  const state = useStore() as any;
  const retiroAtual = state.retiroAtual || state.retiroSelecionado || state.retiroAtivo || state.retiro;
  const retiro_id = retiroAtual?.id;

  const [vendas, setVendas] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);

  // Busca todos os dados reais do Supabase para montar o Painel
  const fetchData = async () => {
    if (!retiro_id) return;
    
    const [resVendas, resPessoas, resProdutos, resNotas] = await Promise.all([
      supabase.from("vendas").select("*").eq("retiro_id", retiro_id),
      supabase.from("pessoas").select("*").eq("retiro_id", retiro_id),
      supabase.from("produtos").select("*").eq("retiro_id", retiro_id),
      supabase.from("notas_fornecedores").select("*").eq("retiro_id", retiro_id)
    ]);

    if (resVendas.data) setVendas(resVendas.data);
    if (resPessoas.data) setPessoas(resPessoas.data);
    if (resProdutos.data) setProdutos(resProdutos.data);
    if (resNotas.data) setNotas(resNotas.data);
  };

  useEffect(() => {
    fetchData();
  }, [retiro_id]);

  const stats = useMemo(() => {
    const totalBruto = vendas.reduce((s, v) => s + (Number(v.valor_total || v.valorTotal) || 0), 0);
    const totalPago = vendas.filter((v) => v.status === "pago").reduce((s, v) => s + (Number(v.valor_total || v.valorTotal) || 0), 0);
    const totalPendente = totalBruto - totalPago;
    const devedores = new Set(vendas.filter((v) => v.status === "pendente").map((v) => v.pessoa_id || v.pessoaId)).size;
    
    const totalNotas = notas.reduce((s, n) => s + (Number(n.valor) || 0), 0);
    const notasPendentes = notas.filter((n) => n.status === "pendente").reduce((s, n) => s + (Number(n.valor) || 0), 0);
    
    const saldo = totalBruto - totalNotas;
    
    return { totalBruto, totalPago, totalPendente, devedores, totalNotas, notasPendentes, saldo };
  }, [vendas, notas]);

  const porFornecedor = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number }>();
    
    for (const v of vendas) {
      // Pega a ID do produto que foi vendido
      const produtoId = v.produto_id || v.produtoId;
      // Procura esse produto na nossa lista de produtos do banco
      const produtoNoBanco = produtos.find((p) => p.id === produtoId);
      // Pega o nome do fornecedor dele (ou avisa se foi deletado)
      const nomeFornecedor = produtoNoBanco?.fornecedor || "Desconhecido";

      const cur = map.get(nomeFornecedor) ?? { qtd: 0, total: 0 };
      cur.qtd += Number(v.quantidade) || 0;
      cur.total += Number(v.valor_total || v.valorTotal) || 0;
      map.set(nomeFornecedor, cur);
    }
    
    return Array.from(map.entries())
      .map(([fornecedor, v]) => ({ fornecedor, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [vendas, produtos]);

  return (
    <div>
      <PageHeader
        title="Painel"
        description={retiroAtual ? `Visão geral do retiro ${retiroAtual.nome}.` : "Cadastre um retiro para começar."}
        action={
          <Button asChild variant="default" className="hidden sm:inline-flex">
            <Link to="/lancar">
              Nova venda <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total vendido" value={formatBRL(stats.totalBruto)} icon={BadgeDollarSign} tone="primary" />
        <StatCard label="Já recebido" value={formatBRL(stats.totalPago)} icon={CircleDollarSign} tone="success" />
        <StatCard label="Em aberto" value={formatBRL(stats.totalPendente)} icon={CircleDollarSign} tone="accent" />
        <StatCard label="Notas a pagar" value={formatBRL(stats.notasPendentes)} icon={FileText} tone="accent" />
        <StatCard label="Devedores" value={String(stats.devedores)} icon={Users} tone="secondary" />
        <StatCard label="Saldo do retiro" value={formatBRL(stats.saldo)} icon={Scale} tone={stats.saldo >= 0 ? "success" : "danger"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Relatório por fornecedor</h3>
            <span className="text-xs text-muted-foreground">{porFornecedor.length} fornecedores</span>
          </div>
          {porFornecedor.length === 0 ? (
            <EmptyMini icon={PackageSearch} text="Nenhuma venda registrada ainda." />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Fornecedor</th>
                    <th className="px-2 py-2 font-medium text-right">Itens</th>
                    <th className="px-2 py-2 font-medium text-right">Total bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {porFornecedor.map((f) => (
                    <tr key={f.fornecedor}>
                      <td className="px-2 py-3 font-medium">{f.fornecedor}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{f.qtd}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatBRL(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-lg font-semibold">Resumo</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Pessoas cadastradas</span>
              <span className="font-semibold tabular-nums">{pessoas.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Produtos cadastrados</span>
              <span className="font-semibold tabular-nums">{produtos.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Transações</span>
              <span className="font-semibold tabular-nums">{vendas.length}</span>
            </li>
          </ul>
          <div className="mt-5 grid gap-2">
            <Button asChild variant="secondary">
              <Link to="/contas">Ver contas em aberto</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cadastros">Gerenciar cadastros</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "secondary" | "accent" | "success" | "danger";
}) {
  const toneCls = {
    primary: "from-primary/15 to-primary/5 text-primary",
    secondary: "from-secondary/20 to-secondary/5 text-secondary",
    accent: "from-accent/25 to-accent/5 text-accent-foreground",
    success: "from-success/20 to-success/5 text-success",
    danger: "from-destructive/20 to-destructive/5 text-destructive",
  }[tone];
  return (
    <Card className="p-4 shadow-soft">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${toneCls}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function EmptyMini({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
