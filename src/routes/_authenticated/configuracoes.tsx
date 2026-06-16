import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Loja FDC" }] }),
  component: ConfiguracoesPage,
});

function GuardAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loadingAuth } = useStore();
  if (loadingAuth) return null;
  if (!isAdmin) return <div className="text-sm text-muted-foreground">Acesso restrito ao administrador.</div>;
  return <>{children}</>;
}

// CSV parser tolerante: separadores , ou ;
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  const pushCell = () => { cur.push(cell); cell = ""; };
  const pushRow = () => { rows.push(cur); cur = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === "," || c === ";") pushCell();
      else if (c === "\n") { pushCell(); pushRow(); }
      else if (c === "\r") { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length || cur.length) { pushCell(); pushRow(); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

async function fetchCSV(url: string): Promise<string> {
  let u = url.trim();
  if (u.includes("docs.google.com/spreadsheets") && !u.includes("output=csv")) {
    u = u.replace(/\/edit.*$/, "/export?format=csv");
  }
  const r = await fetch(u);
  if (!r.ok) throw new Error("Não consegui baixar o CSV.");
  return await r.text();
}

function ConfiguracoesPage() {
  return <ConfiguracoesInner />;
}

function ConfiguracoesInner() {
  const state = useStore() as any;
  const retiroAtual = state.retiroAtual || state.retiroSelecionado || state.retiroAtivo || state.retiro;
  const retiro_id = retiroAtual?.id;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [urlPessoas, setUrlPessoas] = useState("");
  const [urlProdutos, setUrlProdutos] = useState("");
  const [csvPessoas, setCsvPessoas] = useState("");
  const [csvProdutos, setCsvProdutos] = useState("");
  const [loading, setLoading] = useState(false);

  async function importarPessoasUrl() {
    if (!urlPessoas.trim()) return toast.error("Cole o link do CSV.");
    setLoading(true);
    try {
      const text = await fetchCSV(urlPessoas);
      await processarPessoas(text);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }

  async function importarProdutosUrl() {
    if (!urlProdutos.trim()) return toast.error("Cole o link do CSV.");
    setLoading(true);
    try {
      const text = await fetchCSV(urlProdutos);
      await processarProdutos(text);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }

  async function processarPessoas(text: string) {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado!");
    
    const objs = rowsToObjects(parseCSV(text));
    const rows = objs.map((o) => ({
      retiro_id: retiro_id,
      nome: o["nome"] ?? o["name"] ?? "",
      telefone: o["telefone"] ?? o["phone"] ?? "",
      setor: o["setor"] ?? o["sector"] ?? "",
    })).filter((r) => r.nome.trim() !== "");

    if (rows.length === 0) return toast.error("Nenhum dado válido encontrado.");

    setLoading(true);
    const { error } = await supabase.from("pessoas").insert(rows);
    if (error) {
      toast.error("Erro ao salvar no banco: " + error.message);
    } else {
      toast.success(`${rows.length} pessoas importadas para o banco!`);
      setCsvPessoas("");
    }
    setLoading(false);
  }

  async function processarProdutos(text: string) {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado!");

    const objs = rowsToObjects(parseCSV(text));
    const rows = objs.map((o) => {
      const valorStr = (o["valor"] ?? o["preço"] ?? o["preco"] ?? "0").replace(",", ".");
      return {
        retiro_id: retiro_id,
        nome: o["nome"] ?? o["name"] ?? o["item"] ?? "",
        valor: Number(valorStr) || 0,
        fornecedor: o["fornecedor"] ?? o["supplier"] ?? "—",
      };
    }).filter((r) => r.nome.trim() !== "");

    if (rows.length === 0) return toast.error("Nenhum dado válido encontrado.");

    setLoading(true);
    const { error } = await supabase.from("produtos").insert(rows);
    if (error) {
      toast.error("Erro ao salvar no banco: " + error.message);
    } else {
      toast.success(`${rows.length} produtos importados para o banco!`);
      setCsvProdutos("");
    }
    setLoading(false);
  }

  async function simularPessoas() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado!");
    setLoading(true);
    const rows = [
      { retiro_id, nome: "João Batista", telefone: "(11) 91111-2222", setor: "Campista" },
      { retiro_id, nome: "Marta Ribeiro", telefone: "(11) 93333-4444", setor: "Acolhida" },
      { retiro_id, nome: "Lucas Mendes", telefone: "(11) 95555-6666", setor: "Música" },
    ];
    const { error } = await supabase.from("pessoas").insert(rows);
    if (error) toast.error("Erro na simulação.");
    else toast.success(`3 pessoas (simulação) importadas para o banco!`);
    setLoading(false);
  }

  async function simularProdutos() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado!");
    setLoading(true);
    const rows = [
      { retiro_id, nome: "Café 200ml", valor: 4, fornecedor: "Loja FDC" },
      { retiro_id, nome: "Pão de Queijo", valor: 5, fornecedor: "Padaria São Bento" },
      { retiro_id, nome: "Imagem Nossa Sra.", valor: 35, fornecedor: "Artesanato Fé" },
    ];
    const { error } = await supabase.from("produtos").insert(rows);
    if (error) toast.error("Erro na simulação.");
    else toast.success(`3 produtos (simulação) importados para o banco!`);
    setLoading(false);
  }

  async function handleResetDB() {
    if (!retiro_id) return toast.error("Nenhum retiro selecionado.");
    setLoading(true);
    try {
      // Deleta na ordem correta para não quebrar vínculos (vendas/notas dependem do retiro e produtos/pessoas)
      await supabase.from("vendas").delete().eq("retiro_id", retiro_id);
      await supabase.from("notas_fornecedores").delete().eq("retiro_id", retiro_id);
      await supabase.from("produtos").delete().eq("retiro_id", retiro_id);
      await supabase.from("pessoas").delete().eq("retiro_id", retiro_id);
      
      toast.success("Todos os dados do retiro foram apagados do banco!");
      setConfirmOpen(false);
    } catch (error) {
      toast.error("Erro ao resetar os dados.");
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Ajustes & Importação"
        description={retiroAtual ? `Dados importados serão associados ao retiro: ${retiroAtual.nome}` : ""}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Importar Pessoas</h3>
              <p className="text-xs text-muted-foreground">Colunas: Nome, Telefone, Setor</p>
            </div>
          </div>
          <Label className="text-xs">Link CSV público do Google Sheets</Label>
          <div className="mt-1 flex gap-2">
            <Input value={urlPessoas} onChange={(e) => setUrlPessoas(e.target.value)} placeholder="https://docs.google.com/spreadsheets/…" />
            <Button onClick={importarPessoasUrl} disabled={loading}><Download className="mr-1 h-4 w-4" />Importar</Button>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Ou cole o CSV aqui</Label>
            <Textarea rows={4} value={csvPessoas} onChange={(e) => setCsvPessoas(e.target.value)} placeholder="nome,telefone,setor&#10;Ana,(11)…,Campista" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => processarPessoas(csvPessoas)} disabled={!csvPessoas.trim() || loading}>Processar CSV</Button>
              <Button variant="outline" onClick={simularPessoas} disabled={loading}>Simular 3 pessoas</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/30 text-accent-foreground">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Importar Produtos</h3>
              <p className="text-xs text-muted-foreground">Colunas: Nome, Valor, Fornecedor</p>
            </div>
          </div>
          <Label className="text-xs">Link CSV público do Google Sheets</Label>
          <div className="mt-1 flex gap-2">
            <Input value={urlProdutos} onChange={(e) => setUrlProdutos(e.target.value)} placeholder="https://docs.google.com/spreadsheets/…" />
            <Button onClick={importarProdutosUrl} disabled={loading}><Download className="mr-1 h-4 w-4" />Importar</Button>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Ou cole o CSV aqui</Label>
            <Textarea rows={4} value={csvProdutos} onChange={(e) => setCsvProdutos(e.target.value)} placeholder="nome,valor,fornecedor&#10;Água,3,Mercearia" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => processarProdutos(csvProdutos)} disabled={!csvProdutos.trim() || loading}>Processar CSV</Button>
              <Button variant="outline" onClick={simularProdutos} disabled={loading}>Simular 3 produtos</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2 border-destructive/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <h3 className="font-semibold">Resetar dados deste retiro</h3>
              <p className="text-sm text-muted-foreground">
                Apaga pessoas, produtos, vendas e notas <strong>{retiroAtual ? `do retiro "${retiroAtual.nome}"` : "do retiro atual"}</strong> do banco de dados. Os retiros e os acessos não são afetados.
              </p>
            </div>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!retiroAtual || loading}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Resetar BD
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja resetar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apaga <strong>pessoas, produtos, vendas e notas</strong>{retiroAtual ? ` do retiro "${retiroAtual.nome}"` : ""} de forma permanente no banco de dados e <strong>não pode ser desfeita</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleResetDB}
                  >
                    Sim, resetar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </div>
  );
}
