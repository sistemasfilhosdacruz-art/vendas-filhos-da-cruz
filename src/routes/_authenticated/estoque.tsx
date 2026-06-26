import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, Package, Download, ShoppingBag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Loja FDC" }] }),
  component: EstoquePage,
});

type Produto = { id: string; nome: string; fornecedor: string; valor: number };

function EstoquePage() {
  const state = useStore() as any;
  const retiro_id: string | undefined =
    state.retiroAtual?.id || state.retiroSelecionado?.id || state.retiroAtivo?.id || state.retiro?.id;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estoque, setEstoque] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");

  // Modal compra
  const [openCompra, setOpenCompra] = useState(false);
  const [compraProdId, setCompraProdId] = useState<string>("");
  const [compraQtd, setCompraQtd] = useState<string>("1");

  // Modal importar
  const [openImport, setOpenImport] = useState(false);
  const [retiros, setRetiros] = useState<{ id: string; nome: string }[]>([]);
  const [retiroOrigem, setRetiroOrigem] = useState<string>("");
  const [importLista, setImportLista] = useState<
    { produto_id: string; nome: string; saldoAnterior: number; qtdRecebida: number }[]
  >([]);
  const [carregandoImport, setCarregandoImport] = useState(false);

  const fetchData = async () => {
    if (!retiro_id) return;
    const { data: prData } = await supabase
      .from("produtos")
      .select("id, nome, fornecedor, valor")
      .eq("retiro_id", retiro_id)
      .order("nome");
    if (prData) setProdutos(prData as Produto[]);

    const { data: eData } = await supabase
      .from("estoque_retiros")
      .select("produto_id, quantidade")
      .eq("retiro_id", retiro_id);
    const map: Record<string, number> = {};
    (eData ?? []).forEach((e: any) => (map[e.produto_id] = e.quantidade));
    setEstoque(map);
  };

  const fetchRetiros = async () => {
    const { data } = await supabase.from("retiros").select("id, nome").order("created_at");
    if (data) setRetiros(data.filter((r) => r.id !== retiro_id));
  };

  useEffect(() => {
    fetchData();
    fetchRetiros();
  }, [retiro_id]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.fornecedor?.toLowerCase().includes(q),
    );
  }, [busca, produtos]);

  async function salvarQtd(produto_id: string, nova: number) {
    if (!retiro_id) return;
    setEstoque((prev) => ({ ...prev, [produto_id]: nova }));
    const { error } = await supabase
      .from("estoque_retiros")
      .upsert(
        { retiro_id, produto_id, quantidade: nova },
        { onConflict: "retiro_id,produto_id" },
      );
    if (error) {
      toast.error("Erro ao salvar estoque");
      console.error(error);
    }
  }

  async function registrarCompra() {
    const qtdNum = Number(compraQtd);
    if (!retiro_id || !compraProdId || !Number.isFinite(qtdNum) || qtdNum < 1) {
      toast.error("Selecione produto e quantidade.");
      return;
    }
    const atual = estoque[compraProdId] ?? 0;
    await salvarQtd(compraProdId, atual + qtdNum);
    toast.success("Entrada registrada!");
    setOpenCompra(false);
    setCompraProdId("");
    setCompraQtd("1");
  }

  async function prepararImportacao(origemId: string) {
    setRetiroOrigem(origemId);
    setCarregandoImport(true);
    setImportLista([]);
    try {
      const { data: estoqueOrigem } = await supabase
        .from("estoque_retiros")
        .select("produto_id, quantidade")
        .eq("retiro_id", origemId)
        .gt("quantidade", 0);

      const ids = (estoqueOrigem ?? []).map((e) => e.produto_id);
      if (ids.length === 0) {
        setImportLista([]);
        return;
      }
      const { data: prods } = await supabase
        .from("produtos")
        .select("id, nome")
        .in("id", ids);

      const mapNome: Record<string, string> = {};
      (prods ?? []).forEach((p: any) => (mapNome[p.id] = p.nome));

      setImportLista(
        (estoqueOrigem ?? []).map((e) => ({
          produto_id: e.produto_id,
          nome: mapNome[e.produto_id] ?? "(produto removido)",
          saldoAnterior: e.quantidade,
          qtdRecebida: e.quantidade,
        })),
      );
    } finally {
      setCarregandoImport(false);
    }
  }

  async function confirmarImportacao() {
    if (!retiro_id) return;
    const itens = importLista.filter((i) => i.qtdRecebida > 0);
    if (itens.length === 0) {
      toast.error("Nada para importar.");
      return;
    }
    // Soma à quantidade atual
    for (const i of itens) {
      const atual = estoque[i.produto_id] ?? 0;
      await supabase
        .from("estoque_retiros")
        .upsert(
          { retiro_id, produto_id: i.produto_id, quantidade: atual + i.qtdRecebida },
          { onConflict: "retiro_id,produto_id" },
        );
    }
    toast.success(`Importação concluída (${itens.length} produto(s)).`);
    setOpenImport(false);
    setRetiroOrigem("");
    setImportLista([]);
    fetchData();
  }

  if (!retiro_id) {
    return (
      <div className="p-4">
        <PageHeader title="Estoque" description="Nenhum retiro selecionado." />
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Estoque" description="Controle por retiro" />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => setOpenCompra(true)} className="flex-1">
          <ShoppingBag className="mr-2 h-4 w-4" /> Registrar Compra/Entrada
        </Button>
        <Button variant="outline" onClick={() => setOpenImport(true)} className="flex-1">
          <Download className="mr-2 h-4 w-4" /> Importar Saldo Anterior
        </Button>
      </div>

      <Input
        placeholder="Buscar produto…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mt-4"
      />

      <Card className="mt-4 divide-y divide-border">
        {produtosFiltrados.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado neste retiro.
          </p>
        )}
        {produtosFiltrados.map((p) => {
          const qtd = estoque[p.id] ?? 0;
          const neg = qtd < 0;
          return (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nome}</p>
                <p className="truncate text-[11px] text-muted-foreground">{p.fornecedor}</p>
                <p
                  className={`text-xs font-semibold ${
                    neg ? "text-destructive" : qtd === 0 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                >
                  Estoque: {qtd}
                  {neg && " (negativo!)"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => salvarQtd(p.id, qtd - 1)}
                  aria-label="Diminuir"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={qtd}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) salvarQtd(p.id, v);
                  }}
                  className={`h-9 w-16 text-center tabular-nums ${neg ? "text-destructive" : ""}`}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => salvarQtd(p.id, qtd + 1)}
                  aria-label="Aumentar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Modal: Registrar Compra */}
      <Dialog open={openCompra} onOpenChange={setOpenCompra}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra/Entrada</DialogTitle>
            <DialogDescription>
              A quantidade informada será somada ao estoque atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto</Label>
              <Select value={compraProdId} onValueChange={setCompraProdId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} (atual: {estoque[p.id] ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade comprada</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setCompraQtd((q) => String(Math.max(1, (Number(q) || 0) - 1)))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={compraQtd}
                  onChange={(e) => setCompraQtd(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="text-center"
                />
                <Button size="icon" variant="outline" onClick={() => setCompraQtd((q) => String((Number(q) || 0) + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCompra(false)}>Cancelar</Button>
            <Button onClick={registrarCompra}>Confirmar entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Importar saldo anterior */}
      <Dialog open={openImport} onOpenChange={(o) => { setOpenImport(o); if (!o) { setRetiroOrigem(""); setImportLista([]); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Saldo Anterior</DialogTitle>
            <DialogDescription>
              Etapa 1 — escolha o retiro de origem. Etapa 2 — confira fisicamente as quantidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Retiro de origem</Label>
              <Select value={retiroOrigem} onValueChange={prepararImportacao}>
                <SelectTrigger><SelectValue placeholder="Selecione um retiro passado" /></SelectTrigger>
                <SelectContent>
                  {retiros.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {retiroOrigem && (
              <>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Confira os itens físicos e ajuste as quantidades que realmente darão entrada
                    neste retiro (zere produtos estragados, doados ou não aplicáveis).
                  </span>
                </div>

                {carregandoImport ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>
                ) : importLista.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Não há produtos com saldo positivo no retiro selecionado.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-md border">
                    {importLista.map((i, idx) => (
                      <div key={i.produto_id} className="flex items-center gap-2 p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{i.nome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Saldo anterior: {i.saldoAnterior}
                          </p>
                        </div>
                        <div className="w-24">
                          <Label className="text-[10px] text-muted-foreground">Qtd Recebida</Label>
                          <Input
                            type="number"
                            value={i.qtdRecebida}
                            onChange={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0);
                              setImportLista((prev) =>
                                prev.map((it, j) => (j === idx ? { ...it, qtdRecebida: v } : it)),
                              );
                            }}
                            className="h-9 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenImport(false)}>Cancelar</Button>
            <Button
              onClick={confirmarImportacao}
              disabled={!retiroOrigem || importLista.length === 0}
            >
              Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
