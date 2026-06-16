import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStore, formatBRL } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Trash2, Users, Package } from "lucide-react";
import { toast } from "sonner";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Loja FDC" }] }),
  component: CadastrosPage,
});

function CadastrosPage() {
  return (
    <div>
      <PageHeader title="Cadastros" description="Gerencie pessoas e produtos do retiro selecionado." />
      <Tabs defaultValue="pessoas">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="pessoas"><Users className="mr-2 h-4 w-4" />Pessoas</TabsTrigger>
          <TabsTrigger value="produtos"><Package className="mr-2 h-4 w-4" />Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="pessoas" className="mt-4"><PessoasPanel /></TabsContent>
        <TabsContent value="produtos" className="mt-4"><ProdutosPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function PessoasPanel() {
  // Puxamos o estado global apenas para descobrir qual é o Retiro selecionado.
  const state = useStore() as any;
  // Identifica automaticamente a variável do seu retiro ativo
  const retiro_id = state.retiroAtual?.id || state.retiroSelecionado?.id || state.retiroAtivo?.id || state.retiro?.id;

  const [pessoas, setPessoas] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", setor: "" });
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);

  // Função para buscar dados reais do banco de dados
  const fetchPessoas = async () => {
    if (!retiro_id) return;
    const { data, error } = await supabase
      .from("pessoas")
      .select("*")
      .eq("retiro_id", retiro_id)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar pessoas:", error);
      toast.error("Erro ao carregar a lista de pessoas.");
    } else {
      setPessoas(data || []);
    }
  };

  // Recarrega a lista sempre que a tela abrir ou o retiro selecionado mudar
  useEffect(() => {
    fetchPessoas();
  }, [retiro_id]);

  const filtradas = pessoas.filter((p) =>
    !busca.trim() ? true : p.nome.toLowerCase().includes(busca.toLowerCase()) || p.setor?.toLowerCase().includes(busca.toLowerCase()),
  );

  async function salvar() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado no painel!");
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    if (form.telefone && !isValidPhoneBR(form.telefone)) return toast.error("Telefone inválido. Use (xx) xxxxx-xxxx.");

    setLoading(true);

    if (editId) {
      // Atualiza a pessoa existente no Supabase
      const { error } = await supabase
        .from("pessoas")
        .update({ nome: form.nome, telefone: form.telefone, setor: form.setor })
        .eq("id", editId);

      if (error) toast.error("Erro ao atualizar pessoa.");
      else toast.success("Pessoa atualizada!");
    } else {
      // Cria uma NOVA pessoa enviando o retiro_id obrigatoriamente (Corrige o erro de não salvar)
      const { error } = await supabase
        .from("pessoas")
        .insert([{
          retiro_id: retiro_id,
          nome: form.nome,
          telefone: form.telefone,
          setor: form.setor
        }]);

      if (error) toast.error("Erro ao cadastrar pessoa.");
      else toast.success("Pessoa cadastrada!");
    }

    setForm({ nome: "", telefone: "", setor: "" });
    setEditId(null);
    setLoading(false);
    fetchPessoas(); // Recarrega a lista após salvar
  }

  async function remover(id: string) {
    if (!confirm("Tem certeza que deseja remover esta pessoa?")) return;
    const { error } = await supabase.from("pessoas").delete().eq("id", id);
    if (error) toast.error("Erro ao remover pessoa.");
    else {
      toast.success("Pessoa removida!");
      fetchPessoas();
    }
  }

  async function limparTodas() {
    if (!retiro_id) return;
    if (confirm(`Remover todas as ${pessoas.length} pessoas deste retiro?`)) {
      const { error } = await supabase.from("pessoas").delete().eq("retiro_id", retiro_id);
      if (error) toast.error("Erro ao limpar pessoas.");
      else {
        toast.success("Todas as pessoas foram removidas");
        fetchPessoas();
      }
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <div className="mb-3 flex gap-2">
          <Input className="h-11 flex-1" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Button
            variant="outline"
            className="h-11"
            disabled={pessoas.length === 0}
            onClick={limparTodas}
          >
            <Trash2 className="mr-1 h-4 w-4" />Limpar todas
          </Button>
        </div>
        {pessoas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada neste retiro.</p>
        ) : filtradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada na busca.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtradas.map((p) => (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.setor ?? "—"}{p.telefone ? ` · ${p.telefone}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setForm({ nome: p.nome, telefone: p.telefone ?? "", setor: p.setor ?? "" }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remover(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 h-fit lg:sticky lg:top-28">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {editId ? "Editar pessoa" : "Nova pessoa"}
        </h3>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input className="mt-1 h-11" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} disabled={loading} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input className="mt-1 h-11" inputMode="tel" placeholder="(11) 91234-5678" maxLength={15} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhoneBR(e.target.value) })} disabled={loading} />
          </div>
          <div>
            <Label>Setor</Label>
            <Input className="mt-1 h-11" placeholder="Campista, Cozinha, Intercessão…" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} disabled={loading} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={salvar} className="flex-1 h-11" disabled={loading}>
              <Plus className="mr-1 h-4 w-4" />{editId ? "Salvar" : "Adicionar"}
            </Button>
            {editId && (
              <Button variant="outline" className="h-11" onClick={() => { setEditId(null); setForm({ nome: "", telefone: "", setor: "" }); }} disabled={loading}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProdutosPanel() {
  const state = useStore() as any;
  const retiro_id = state.retiroAtual?.id || state.retiroSelecionado?.id || state.retiroAtivo?.id || state.retiro?.id;

  const [produtos, setProdutos] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", valor: "", fornecedor: "" });
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProdutos = async () => {
    if (!retiro_id) return;
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("retiro_id", retiro_id)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar a lista de produtos.");
    } else {
      setProdutos(data || []);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [retiro_id]);

  const filtrados = produtos.filter((p) =>
    !busca.trim() ? true : p.nome.toLowerCase().includes(busca.toLowerCase()) || p.fornecedor.toLowerCase().includes(busca.toLowerCase()),
  );

  async function salvar() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado no painel!");
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    const valorNumerico = Number(form.valor.replace(",", "."));
    if (!Number.isFinite(valorNumerico) || valorNumerico < 0) return toast.error("Valor inválido.");
    if (!form.fornecedor.trim()) return toast.error("Informe o fornecedor.");

    setLoading(true);

    if (editId) {
      const { error } = await supabase
        .from("produtos")
        .update({ nome: form.nome, valor: valorNumerico, fornecedor: form.fornecedor })
        .eq("id", editId);

      if (error) toast.error("Erro ao atualizar produto.");
      else toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase
        .from("produtos")
        .insert([{
          retiro_id: retiro_id,
          nome: form.nome,
          valor: valorNumerico,
          fornecedor: form.fornecedor
        }]);

      if (error) toast.error("Erro ao cadastrar produto.");
      else toast.success("Produto cadastrado!");
    }

    setForm({ nome: "", valor: "", fornecedor: "" });
    setEditId(null);
    setLoading(false);
    fetchProdutos();
  }

  async function remover(id: string) {
    if (!confirm("Tem certeza que deseja remover este produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) toast.error("Erro ao remover produto.");
    else {
      toast.success("Produto removido!");
      fetchProdutos();
    }
  }

  async function limparTodos() {
    if (!retiro_id) return;
    if (confirm(`Remover todos os ${produtos.length} produtos deste retiro?`)) {
      const { error } = await supabase.from("produtos").delete().eq("retiro_id", retiro_id);
      if (error) toast.error("Erro ao limpar produtos.");
      else {
        toast.success("Todos os produtos foram removidos");
        fetchProdutos();
      }
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <div className="mb-3 flex gap-2">
          <Input className="h-11 flex-1" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Button
            variant="outline"
            className="h-11"
            disabled={produtos.length === 0}
            onClick={limparTodos}
          >
            <Trash2 className="mr-1 h-4 w-4" />Limpar todos
          </Button>
        </div>
        {produtos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado neste retiro.</p>
        ) : filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado na busca.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtrados.map((p) => (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.fornecedor}</p>
                </div>
                <p className="font-bold tabular-nums text-primary">{formatBRL(p.valor)}</p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setForm({ nome: p.nome, valor: String(p.valor), fornecedor: p.fornecedor }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remover(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 h-fit lg:sticky lg:top-28">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {editId ? "Editar produto" : "Novo produto"}
        </h3>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input className="mt-1 h-11" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} disabled={loading} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input className="mt-1 h-11" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} disabled={loading} />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input className="mt-1 h-11" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} disabled={loading} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={salvar} className="flex-1 h-11" disabled={loading}>
              <Plus className="mr-1 h-4 w-4" />{editId ? "Salvar" : "Adicionar"}
            </Button>
            {editId && (
              <Button variant="outline" className="h-11" onClick={() => { setEditId(null); setForm({ nome: "", valor: "", fornecedor: "" }); }} disabled={loading}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
