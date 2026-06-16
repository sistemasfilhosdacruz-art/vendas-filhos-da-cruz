import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore, formatBRL } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ChevronRight, Receipt, Search, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({ meta: [{ title: "Contas — Cantinho Mariano" }] }),
  component: ContasPage,
});

function ContasPage() {
  const state = useStore() as any;
  const retiroAtual = state.retiroAtual || state.retiroSelecionado || state.retiroAtivo || state.retiro;
  const retiro_id = retiroAtual?.id;

  const [pessoas, setPessoas] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [itemParaDeletar, setItemParaDeletar] = useState<string | null>(null);

  const fetchData = async () => {
    if (!retiro_id) return;
    const [resPessoas, resVendas, resProdutos] = await Promise.all([
      supabase.from("pessoas").select("*").eq("retiro_id", retiro_id),
      supabase.from("vendas").select("*").eq("retiro_id", retiro_id),
      supabase.from("produtos").select("*").eq("retiro_id", retiro_id)
    ]);
    
    if (resPessoas.data) setPessoas(resPessoas.data);
    if (resVendas.data) setVendas(resVendas.data);
    if (resProdutos.data) setProdutos(resProdutos.data);
  };

  useEffect(() => {
    fetchData();
  }, [retiro_id]);

  const resumo = useMemo(() => {
    const map = new Map<string, { pendente: number; pago: number; itens: number }>();
    for (const v of vendas) {
      const pId = v.pessoa_id || v.pessoaId;
      const cur = map.get(pId) ?? { pendente: 0, pago: 0, itens: 0 };
      const valor = Number(v.valor_total || v.valorTotal) || 0;
      
      if (v.status === "pendente") cur.pendente += valor;
      else cur.pago += valor;
      
      cur.itens += Number(v.quantidade) || 0;
      map.set(pId, cur);
    }
    return pessoas
      .map((p) => ({ pessoa: p, ...(map.get(p.id) ?? { pendente: 0, pago: 0, itens: 0 }) }))
      .filter((r) => r.pendente > 0 || r.pago > 0)
      .sort((a, b) => b.pendente - a.pendente);
  }, [pessoas, vendas]);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return resumo;
    return resumo.filter((r) => r.pessoa.nome.toLowerCase().includes(q) || r.pessoa.setor?.toLowerCase().includes(q));
  }, [busca, resumo]);

  const pessoaAberta = pessoas.find((p) => p.id === aberto) ?? null;
  
  const extrato = useMemo(() => {
    return vendas
      .filter((v) => (v.pessoa_id || v.pessoaId) === aberto)
      .sort((a, b) => {
        const dateA = new Date(a.criado_em || a.created_at || 0).getTime();
        const dateB = new Date(b.criado_em || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .map(v => {
        const prod = produtos.find(p => p.id === (v.produto_id || v.produtoId));
        return {
          ...v,
          produtoNome: prod?.nome || "Produto removido",
          fornecedorNome: prod?.fornecedor || "—"
        };
      });
  }, [aberto, vendas, produtos]);

  const totalDevido = extrato.filter((v) => v.status === "pendente").reduce((s, v) => s + (Number(v.valor_total || v.valorTotal) || 0), 0);

  async function handlePagar() {
    if (!pessoaAberta) return;
    setLoading(true);
    
    const { error } = await supabase
      .from("vendas")
      .update({ status: "pago" })
      .eq("pessoa_id", pessoaAberta.id)
      .eq("status", "pendente");

    if (error) {
      toast.error("Erro ao registrar o pagamento.");
    } else {
      toast.success(`Conta de ${pessoaAberta.nome} quitada!`);
      fetchData(); 
      setConfirma(false);
      setAberto(null);
    }
    setLoading(false);
  }

  async function confirmarDelecao() {
    if (!itemParaDeletar) return;
    setLoading(true);
    
    const { error } = await supabase.from("vendas").delete().eq("id", itemParaDeletar);
    
    if (error) toast.error("Erro ao excluir o item.");
    else { toast.success("Item cancelado com sucesso!"); fetchData(); }
    
    setLoading(false);
    setItemParaDeletar(null);
  }

  return (
    <div>
      {/* MÁGICA DA IMPRESSÃO CORRIGIDA */}
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: white !important; 
          }
          
          /* Esconde todo o aplicativo */
          body * { visibility: hidden !important; }
          
          /* Esconde os popups pretos do sistema para não borrar a impressão */
          div[data-radix-portal] { display: none !important; }
          
          /* Mostra apenas a div do recibo (O segredo do block !important resolve o branco) */
          #recibo-impresso { 
            display: block !important; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white;
          }
          #recibo-impresso, #recibo-impresso * { 
            visibility: visible !important; 
          }
        }
      `}</style>

      {/* LAYOUT DO RECIBO: Idêntico à janela de extrato! */}
      <div id="recibo-impresso" className="hidden">
        <div className="bg-[#2E5A6A] p-8 text-white w-full">
          <h1 className="text-3xl font-bold">{pessoaAberta?.nome}</h1>
          <p className="text-sm opacity-90 mt-1">{pessoaAberta?.setor ?? "—"} · Extrato do {retiroAtual?.nome}</p>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Valor devido</p>
              <p className="text-4xl font-bold tabular-nums">{formatBRL(totalDevido)}</p>
            </div>
            {totalDevido === 0 && (
              <Badge className="bg-white/20 text-white border-0">Quitado</Badge>
            )}
          </div>
        </div>

        <div className="p-8 w-full max-w-3xl mx-auto">
          <ul className="divide-y divide-gray-200">
            {extrato.map((v) => (
              <li key={v.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-base font-medium text-black">{v.quantidade}× {v.produtoNome}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(v.criado_em || v.created_at || new Date()).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {" · "} {v.fornecedorNome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold tabular-nums text-black">{formatBRL(v.valor_total || v.valorTotal)}</p>
                  <p className={`text-xs font-medium mt-0.5 ${v.status === "pago" ? "text-green-600" : "text-amber-600"}`}>
                    {v.status === "pago" ? "Pago" : "Pendente"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* TELA NORMAL DO SISTEMA */}
      <PageHeader title="Contas" description="Pessoas com lançamentos no retiro." />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="h-11 pl-9" placeholder="Buscar pessoa…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {filtrado.length === 0 ? (
        <Card className="p-10 text-center">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhuma conta lançada ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtrado.map((r) => (
            <button
              key={r.pessoa.id}
              onClick={() => setAberto(r.pessoa.id)}
              className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-primary/40 hover:shadow-card"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{r.pessoa.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{r.pessoa.setor ?? "—"} · {r.itens} itens</p>
              </div>
              <div className="text-right">
                {r.pendente > 0 ? (
                  <>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Em aberto</p>
                    <p className="text-lg font-bold tabular-nums text-accent-foreground">{formatBRL(r.pendente)}</p>
                  </>
                ) : (
                  <Badge className="bg-success text-success-foreground hover:bg-success">Quitado</Badge>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
        </div>
      )}

      {/* Janela de Extrato no App */}
      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-primary to-secondary p-5 text-primary-foreground">
            <DialogTitle className="text-xl">{pessoaAberta?.nome}</DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              {pessoaAberta?.setor ?? "—"} · Extrato do retiro atual
            </DialogDescription>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80">Valor devido</p>
                <p className="text-3xl font-bold tabular-nums">{formatBRL(totalDevido)}</p>
              </div>
              {totalDevido === 0 && (
                <Badge className="bg-white/20 hover:bg-white/20 text-primary-foreground border-0">Quitado</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[45vh] overflow-y-auto p-5">
            {extrato.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem lançamentos.</p>
            ) : (
              <ul className="divide-y divide-border">
                {extrato.map((v) => (
                  <li key={v.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.quantidade}× {v.produtoNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.criado_em || v.created_at || new Date()).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {v.fornecedorNome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatBRL(v.valor_total || v.valorTotal)}</p>
                      <p className={`text-[11px] font-medium ${v.status === "pago" ? "text-success" : "text-accent-foreground"}`}>
                        {v.status === "pago" ? "Pago" : "Pendente"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setItemParaDeletar(v.id)} disabled={loading} title="Cancelar este item">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/40 p-4 flex flex-row gap-2 sm:gap-2">
            <Button variant="outline" className="h-11 w-11 shrink-0 p-0" onClick={() => window.print()} title="Gerar PDF do Extrato" disabled={loading}>
              <Printer className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="outline" onClick={() => setAberto(null)} className="flex-1 h-11" disabled={loading}>
              Fechar
            </Button>
            <Button className="flex-1 h-11 bg-success text-success-foreground hover:bg-success/90" disabled={totalDevido === 0 || loading} onClick={() => setConfirma(true)}>
              <Check className="mr-2 h-4 w-4" />
              Pagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemParaDeletar} onOpenChange={(o) => !o && setItemParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar item?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar este item? Ele será apagado do sistema e o extrato será atualizado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarDelecao} disabled={loading}>
              {loading ? "Cancelando..." : "Sim, cancelar item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={confirma} onOpenChange={setConfirma}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              Marcar todas as pendências de <strong>{pessoaAberta?.nome}</strong> como pagas? Total: <strong>{formatBRL(totalDevido)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirma(false)} disabled={loading}>Cancelar</Button>
            <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={handlePagar} disabled={loading}>
              {loading ? "Processando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
