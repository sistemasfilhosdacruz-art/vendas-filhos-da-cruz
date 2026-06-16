import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore, formatBRL } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Minus, Plus, ShoppingCart, Trash2, User2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lancar")({
  head: () => ({ meta: [{ title: "Lançar venda — Cantinho Mariano" }] }),
  component: LancarPage,
});

function LancarPage() {
  const state = useStore() as any;
  const retiro_id = state.retiroAtual?.id || state.retiroSelecionado?.id || state.retiroAtivo?.id || state.retiro?.id;

  const [pessoas, setPessoas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);
  const [buscaP, setBuscaP] = useState("");
  const [buscaProd, setBuscaProd] = useState("");

  const fetchData = async () => {
    if (!retiro_id) return;
    
    const { data: pData } = await supabase.from("pessoas").select("*").eq("retiro_id", retiro_id).order("nome");
    if (pData) setPessoas(pData);

    const { data: prData } = await supabase.from("produtos").select("*").eq("retiro_id", retiro_id).order("nome");
    if (prData) setProdutos(prData);

    const { data: vData } = await supabase.from("vendas").select("*").eq("retiro_id", retiro_id);
    if (vData) {
      const ordenadas = [...vData].sort((a, b) => {
        const dateA = new Date(a.criado_em || a.created_at || 0).getTime();
        const dateB = new Date(b.criado_em || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setVendas(ordenadas);
    }
  };

  useEffect(() => {
    fetchData();
  }, [retiro_id]);

  const pessoaSel = pessoas.find((p) => p.id === pessoaId) ?? null;
  const produtoSel = produtos.find((p) => p.id === produtoId) ?? null;
  const total = (produtoSel?.valor ?? 0) * qtd;

  const pessoasFiltradas = useMemo(() => {
    const q = buscaP.trim().toLowerCase();
    const list = q ? pessoas.filter((p) => p.nome.toLowerCase().includes(q) || p.setor?.toLowerCase().includes(q)) : pessoas;
    return list.slice(0, 4);
  }, [buscaP, pessoas]);

  const produtosFiltrados = useMemo(() => {
    const q = buscaProd.trim().toLowerCase();
    const list = q ? produtos.filter((p) => p.nome.toLowerCase().includes(q) || p.fornecedor?.toLowerCase().includes(q)) : produtos;
    return list.slice(0, 6);
  }, [buscaProd, produtos]);

  const ultimas = vendas.slice(0, 6);
  
  const nomePessoa = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? "—";
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? "—";
  const fornecedorProduto = (id: string) => produtos.find((p) => p.id === id)?.fornecedor ?? "—";

  async function handleAdicionar() {
    if (!retiro_id) return toast.error("Nenhum retiro seleccionado!");
    if (!pessoaSel || !produtoSel || qtd < 1) {
      toast.error("Seleccione pessoa, produto e quantidade.");
      return;
    }

    setLoading(true);

    const novaVenda = {
      retiro_id: retiro_id,
      pessoa_id: pessoaSel.id,
      produto_id: produtoSel.id,
      quantidade: qtd,
      valor_unit: produtoSel.valor,
      valor_total: total,
      status: "pendente"
    };

    const { error } = await supabase.from("vendas").insert([novaVenda]);

    if (error) {
      console.error(error);
      toast.error("Erro ao guardar a venda no banco de dados.");
    } else {
      toast.success(`Adicionado à conta de ${pessoaSel.nome}`, {
        description: `${qtd}× ${produtoSel.nome} — ${formatBRL(total)}`,
      });
      setProdutoId(null);
      setBuscaProd("");
      setQtd(1);
      fetchData();
    }
    
    setLoading(false);
  }

  async function removerVenda(id: string) {
    if (!confirm("Tem a certeza que deseja excluir este lançamento?")) return;
    const { error } = await supabase.from("vendas").delete().eq("id", id);
    if (error) toast.error("Erro ao remover venda.");
    else {
      toast.success("Lançamento removido!");
      fetchData();
    }
  }

  async function limparTodas() {
    if (!retiro_id) return;
    if (confirm(`Remover todas as ${vendas.length} vendas deste retiro? Isso não pode ser desfeito!`)) {
      const { error } = await supabase.from("vendas").delete().eq("retiro_id", retiro_id);
      if (error) toast.error("Erro ao limpar as vendas.");
      else {
        toast.success("Todas as vendas foram removidas");
        fetchData();
      }
    }
  }

  return (
    <div>
      <PageHeader title="Lançar venda" description="Adicione um produto à conta de uma pessoa." />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">1. Pessoa</Label>
            <Input
              className="mt-2 h-11"
              placeholder="Buscar por nome ou sector…"
              value={buscaP}
              onChange={(e) => setBuscaP(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {pessoasFiltradas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pessoa encontrada.</p>
              )}
              {pessoasFiltradas.map((p) => {
                const active = p.id === pessoaId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPessoaId(p.id)}
                    className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <User2 className="h-3.5 w-3.5 opacity-70" />
                    <span className="font-medium">{p.nome}</span>
                    {p.setor && (
                      <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        · {p.setor}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">2. Produto</Label>
            <Input
              className="mt-2 h-11"
              placeholder="Buscar produto ou fornecedor…"
              value={buscaProd}
              onChange={(e) => setBuscaProd(e.target.value)}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {produtosFiltrados.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              )}
              {produtosFiltrados.map((p) => {
                const active = p.id === produtoId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProdutoId(p.id)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className="line-clamp-2 text-sm font-semibold">{p.nome}</span>
                    <span className="text-[11px] text-muted-foreground">{p.fornecedor}</span>
                    <span className="mt-2 text-base font-bold text-primary tabular-nums">{formatBRL(p.valor)}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="p-4 lg:sticky lg:top-28 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resumo</h3>
          <div className="mt-3 space-y-3 text-sm">
            <Row label="Pessoa" value={pessoaSel?.nome ?? "—"} />
            <Row label="Produto" value={produtoSel?.nome ?? "—"} />
            <Row label="Valor unit." value={produtoSel ? formatBRL(produtoSel.valor) : "—"} />
          </div>

          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantidade</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
                className="h-11 text-center text-lg font-bold"
              />
              <Button size="icon" variant="outline" onClick={() => setQtd((q) => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-gradient-to-br from-primary to-secondary p-4 text-primary-foreground">
            <p className="text-xs uppercase tracking-wider opacity-80">Total</p>
            <p className="text-3xl font-bold tabular-nums">{formatBRL(total)}</p>
          </div>

          <Button onClick={handleAdicionar} disabled={!pessoaSel || !produtoSel || loading} className="mt-4 h-12 w-full text-base font-semibold">
            <ShoppingCart className="mr-2 h-5 w-5" />
            {loading ? "A guardar..." : "Adicionar à conta"}
          </Button>
        </Card>
      </div>

      <Card className="mt-6 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimos lançamentos</h3>
          <Button
            variant="outline"
            size="sm"
            disabled={vendas.length === 0}
            onClick={limparTodas}
          >
            <Trash2 className="mr-1 h-4 w-4" />Limpar todas
          </Button>
        </div>
        {ultimas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada lançado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ultimas.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {v.quantidade}× {nomeProduto(v.produto_id || v.produtoId)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{nomePessoa(v.pessoa_id || v.pessoaId)} · {fornecedorProduto(v.produto_id || v.produtoId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{formatBRL(v.valor_total || v.valorTotal)}</p>
                  <p className={`text-[11px] font-medium ${v.status === "pago" ? "text-success" : "text-accent-foreground"}`}>
                    {v.status === "pago" ? (
                      <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Pago</span>
                    ) : (
                      "Pendente"
                    )}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removerVenda(v.id)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}
