import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore, formatBRL } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Check, FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notas")({
  head: () => ({ meta: [{ title: "Notas de Fornecedores — Loja FDC" }] }),
  component: NotasPage,
});

function NotasPage() {
  const state = useStore() as any;
  const retiro_id = state.retiroAtual?.id || state.retiroSelecionado?.id || state.retiroAtivo?.id || state.retiro?.id;

  const [notas, setNotas] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const fetchData = async () => {
    if (!retiro_id) return;
    
    const { data: nData } = await supabase.from("notas_fornecedores").select("*").eq("retiro_id", retiro_id);
    if (nData) setNotas(nData);

    const { data: vData } = await supabase.from("vendas").select("*").eq("retiro_id", retiro_id);
    if (vData) setVendas(vData);
  };

  useEffect(() => {
    fetchData();
  }, [retiro_id]);

  const totais = useMemo(() => {
    const totalVendas = vendas.reduce((s, v) => s + (Number(v.valor_total || v.valorTotal) || 0), 0);
    const totalNotas = notas.reduce((s, n) => s + (Number(n.valor) || 0), 0);
    const notasPagas = notas.filter((n) => n.status === "pago").reduce((s, n) => s + (Number(n.valor) || 0), 0);
    const notasPendentes = totalNotas - notasPagas;
    const saldo = totalVendas - totalNotas;
    return { totalVendas, totalNotas, notasPagas, notasPendentes, saldo };
  }, [vendas, notas]);

  const ordenadas = useMemo(
    () => [...notas].sort((a, b) => {
      if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
      const dateA = new Date(a.criado_em || a.created_at || 0).getTime();
      const dateB = new Date(b.criado_em || b.created_at || 0).getTime();
      return dateB - dateA;
    }),
    [notas],
  );

  function abrirNovo() {
    setEditId(null);
    setFornecedor("");
    setDescricao("");
    setValor("");
    setOpen(true);
  }

  function abrirEditar(id: string) {
    const n = notas.find((x) => x.id === id);
    if (!n) return;
    setEditId(id);
    setFornecedor(n.fornecedor);
    setDescricao(n.descricao ?? "");
    setValor(String(n.valor));
    setOpen(true);
  }

  async function salvar() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado!");
    const v = Number(String(valor).replace(",", "."));
    if (!fornecedor.trim()) return toast.error("Informe o fornecedor.");
    if (!Number.isFinite(v) || v <= 0) return toast.error("Valor inválido.");
    
    if (editId) {
      const { error } = await supabase.from("notas_fornecedores").update({ 
        fornecedor: fornecedor.trim(), 
        descricao: descricao.trim() || null, 
        valor: v 
      }).eq("id", editId);
      
      if (error) toast.error("Erro ao atualizar nota");
      else toast.success("Nota atualizada");
    } else {
      const { error } = await supabase.from("notas_fornecedores").insert([{
        retiro_id: retiro_id,
        fornecedor: fornecedor.trim(),
        descricao: descricao.trim() || null,
        valor: v,
        status: "pendente"
      }]);

      if (error) toast.error("Erro ao lançar nota");
      else toast.success("Nota lançada");
    }
    setOpen(false);
    fetchData();
  }

  async function alterarStatus(id: string, novoStatus: "pago" | "pendente") {
    const { error } = await supabase.from("notas_fornecedores").update({ status: novoStatus }).eq("id", id);
    if (error) toast.error("Erro ao alterar o status.");
    else {
      toast.success(novoStatus === "pago" ? "Nota marcada como paga" : "Nota reaberta");
      fetchData();
    }
  }

  async function removerNota() {
    if (!confirmDel) return;
    const { error } = await supabase.from("notas_fornecedores").delete().eq("id", confirmDel);
    if (error) toast.error("Erro ao excluir nota.");
    else {
      toast.success("Nota excluída");
      fetchData();
    }
    setConfirmDel(null);
  }

  return (
    <div>
      <PageHeader
        title="Notas de Fornecedores"
        description="Lance aqui as notas a pagar aos fornecedores do retiro."
        action={
          <Button onClick={abrirNovo} className="hidden sm:inline-flex">
            <Plus className="mr-1 h-4 w-4" /> Nova nota
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <MiniStat label="Total vendido" value={formatBRL(totais.totalVendas)} tone="primary" />
        <MiniStat label="Notas a pagar" value={formatBRL(totais.notasPendentes)} tone="accent" />
        <MiniStat label="Notas pagas" value={formatBRL(totais.notasPagas)} tone="success" />
        <MiniStat
          label="Saldo do retiro"
          value={formatBRL(totais.saldo)}
          tone={totais.saldo >= 0 ? "success" : "danger"}
        />
      </div>

      <Button onClick={abrirNovo} className="sm:hidden w-full mb-4 h-11">
        <Plus className="mr-1 h-4 w-4" /> Nova nota
      </Button>

      {ordenadas.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhuma nota lançada ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {ordenadas.map((n) => (
            <Card key={n.id} className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold">{n.fornecedor}</p>
                  {n.status === "pago" ? (
                    <Badge className="bg-success text-success-foreground hover:bg-success">Pago</Badge>
                  ) : (
                    <Badge variant="outline" className="text-accent-foreground">Pendente</Badge>
                  )}
                </div>
                {n.descricao && <p className="truncate text-xs text-muted-foreground mt-0.5">{n.descricao}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(n.criado_em || n.created_at || new Date()).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums">{formatBRL(n.valor)}</p>
                <div className="mt-2 flex justify-end gap-1">
                  {n.status === "pendente" ? (
                    <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" onClick={() => alterarStatus(n.id, "pago")}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Pagar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => alterarStatus(n.id, "pendente")}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => abrirEditar(n.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmDel(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar nota" : "Nova nota"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Padaria São José" />
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Pães e bolos do café" />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={removerNota}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "success" | "danger" }) {
  const cls = {
    primary: "text-primary",
    accent: "text-accent-foreground",
    success: "text-success",
    danger: "text-destructive",
  }[tone];
  return (
    <Card className="p-4 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</p>
    </Card>
  );
}
