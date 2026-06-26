import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, Plus, Minus, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Sistema" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const state = useStore() as any;
  const retiroAtual = state.retiroAtual || state.retiroSelecionado || state.retiroAtivo || state.retiro;
  const retiro_id = retiroAtual?.id;

  const [produtos, setProdutos] = useState<any[]>([]);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal Entrada
  const [modalEntrada, setModalEntrada] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [qtdEntrada, setQtdEntrada] = useState("");

  const fetchData = async () => {
    if (!retiro_id) return;
    const [resProdutos, resEstoque] = await Promise.all([
      supabase.from("produtos").select("*").eq("retiro_id", retiro_id),
      supabase.from("estoque_retiros").select("*").eq("retiro_id", retiro_id),
    ]);
    
    if (resProdutos.data) setProdutos(resProdutos.data);
    if (resEstoque.data) setEstoque(resEstoque.data);
  };

  useEffect(() => {
    fetchData();
  }, [retiro_id]);

  const listaEstoque = useMemo(() => {
    return produtos.map(p => {
      const est = estoque.find(e => e.produto_id === p.id);
      return {
        ...p,
        quantidade: est?.quantidade || 0,
        estoque_id: est?.id || null
      };
    }).filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [produtos, estoque, busca]);

  async function atualizarQuantidade(produto_id: string, novaQuantidade: number) {
    if (novaQuantidade < 0) novaQuantidade = 0;
    
    // Atualização otimista na tela
    setEstoque(prev => {
      const existe = prev.find(e => e.produto_id === produto_id);
      if (existe) return prev.map(e => e.produto_id === produto_id ? { ...e, quantidade: novaQuantidade } : e);
      return [...prev, { produto_id, retiro_id, quantidade: novaQuantidade }];
    });

    const { error } = await supabase
      .from("estoque_retiros")
      .upsert({ 
        retiro_id, 
        produto_id, 
        quantidade: novaQuantidade 
      }, { onConflict: 'retiro_id,produto_id' });

    if (error) {
      toast.error("Erro ao salvar estoque.");
      fetchData(); // reverte em caso de erro
    }
  }

  async function registrarEntrada() {
    if (!produtoSelecionado || !qtdEntrada) return;
    setLoading(true);
    
    const qtdAdd = parseInt(qtdEntrada);
    const atual = estoque.find(e => e.produto_id === produtoSelecionado)?.quantidade || 0;
    const novaQuantidade = atual + qtdAdd;

    const { error } = await supabase
      .from("estoque_retiros")
      .upsert({ 
        retiro_id, 
        produto_id: produtoSelecionado, 
        quantidade: novaQuantidade 
      }, { onConflict: 'retiro_id,produto_id' });

    if (error) {
      toast.error("Erro ao registrar entrada.");
    } else {
      toast.success("Entrada registrada com sucesso!");
      fetchData();
      setModalEntrada(false);
      setProdutoSelecionado("");
      setQtdEntrada("");
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Estoque" description="Controle de quantidades por retiro." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button className="h-11" onClick={() => setModalEntrada(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Registrar Compra
        </Button>
      </div>

      <div className="grid gap-2">
        {listaEstoque.length === 0 ? (
          <Card className="p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          </Card>
        ) : (
          listaEstoque.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div>
                <p className="text-base font-semibold">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.fornecedor || "Sem fornecedor"}</p>
                <p className={`text-sm font-medium mt-1 ${p.quantidade === 0 ? 'text-destructive' : 'text-primary'}`}>
                  Estoque: {p.quantidade}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => atualizarQuantidade(p.id, p.quantidade - 1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold">{p.quantidade}</span>
                <Button variant="outline" size="icon" onClick={() => atualizarQuantidade(p.id, p.quantidade + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={modalEntrada} onOpenChange={setModalEntrada}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra / Entrada</DialogTitle>
            <DialogDescription>Adicione novas mercadorias ao estoque atual.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
              >
                <option value="">Selecione um produto...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Quantidade Comprada</Label>
              <Input 
                type="number" 
                min="1" 
                value={qtdEntrada} 
                onChange={(e) => setQtdEntrada(e.target.value)} 
                placeholder="Ex: 50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEntrada(false)}>Cancelar</Button>
            <Button onClick={registrarEntrada} disabled={loading || !produtoSelecionado || !qtdEntrada}>
              {loading ? "Salvando..." : "Confirmar Entrada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
