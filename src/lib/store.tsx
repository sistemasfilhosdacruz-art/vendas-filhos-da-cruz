import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveEmailFromUsername } from "./auth.functions";
import type { NotaFornecedor, Pessoa, Produto, Retiro, Venda, VendaStatus } from "./types";

const RETIRO_KEY = "cantinho-retiro-atual";
const DATA_KEY = (retiroId: string) => `cantinho-data-v2:${retiroId}`;
const MIGRATED_KEY = (retiroId: string) => `cantinho-data-db-migrated:${retiroId}`;

interface RetiroData {
  pessoas: Pessoa[];
  produtos: Produto[];
  vendas: Venda[];
  notas: NotaFornecedor[];
}

function emptyData(): RetiroData {
  return { pessoas: [], produtos: [], vendas: [], notas: [] };
}


function loadLegacyData(retiroId: string): RetiroData {
  if (typeof window === "undefined" || !retiroId) return emptyData();
  try {
    const raw = localStorage.getItem(DATA_KEY(retiroId));
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<RetiroData>;
    return {
      pessoas: parsed.pessoas ?? [],
      produtos: parsed.produtos ?? [],
      vendas: parsed.vendas ?? [],
      notas: parsed.notas ?? [],
    };
  } catch { return emptyData(); }
}

function hasData(d: RetiroData) {
  return d.pessoas.length > 0 || d.produtos.length > 0 || d.vendas.length > 0 || d.notas.length > 0;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
      );

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const db = supabase as any;

function mapPessoa(r: any): Pessoa {
  return { id: r.id, retiroId: r.retiro_id, nome: r.nome, telefone: r.telefone ?? undefined, setor: r.setor ?? undefined };
}

function mapProduto(r: any): Produto {
  return { id: r.id, retiroId: r.retiro_id, nome: r.nome, valor: Number(r.valor) || 0, fornecedor: r.fornecedor };
}

function mapVenda(r: any): Venda {
  return {
    id: r.id,
    retiroId: r.retiro_id,
    pessoaId: r.pessoa_id,
    produtoId: r.produto_id,
    quantidade: Number(r.quantidade) || 1,
    valorUnit: Number(r.valor_unit) || 0,
    valorTotal: Number(r.valor_total) || 0,
    status: r.status as VendaStatus,
    criadoEm: r.criado_em,
    produtoNome: r.produto_nome,
    fornecedor: r.fornecedor,
  };
}

function mapNota(r: any): NotaFornecedor {
  return {
    id: r.id,
    retiroId: r.retiro_id,
    fornecedor: r.fornecedor,
    descricao: r.descricao ?? undefined,
    valor: Number(r.valor) || 0,
    status: r.status,
    criadoEm: r.criado_em,
  };
}

interface Profile { id: string; username: string; full_name: string }

interface StoreContextValue {
  // auth
  loadingAuth: boolean;
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  // retiros (db)
  retiros: Retiro[];
  loadingRetiros: boolean;
  reloadRetiros: () => Promise<void>;
  retiroAtual: Retiro | null;
  setRetiroAtual: (id: string | null) => void;

  // per-retiro data (db)
  pessoasDoRetiro: Pessoa[];
  produtosDoRetiro: Produto[];
  vendasDoRetiro: Venda[];
  notasDoRetiro: NotaFornecedor[];

  addPessoa: (p: Omit<Pessoa, "id" | "retiroId">) => void;
  updatePessoa: (id: string, p: Partial<Pessoa>) => void;
  removePessoa: (id: string) => void;
  importPessoas: (rows: Array<{ nome: string; telefone?: string; setor?: string }>) => number;

  addProduto: (p: Omit<Produto, "id" | "retiroId">) => void;
  updateProduto: (id: string, p: Partial<Produto>) => void;
  removeProduto: (id: string) => void;
  importProdutos: (rows: Array<{ nome: string; valor: number | string; fornecedor: string }>) => number;

  addVenda: (pessoaId: string, produtoId: string, quantidade: number) => void;
  removeVenda: (id: string) => void;
  marcarPessoaPaga: (pessoaId: string) => void;

  clearPessoas: () => void;
  clearProdutos: () => void;
  clearVendas: () => void;

  addNota: (n: Omit<NotaFornecedor, "id" | "retiroId" | "criadoEm" | "status"> & { status?: "pendente" | "pago" }) => void;
  updateNota: (id: string, n: Partial<NotaFornecedor>) => void;
  removeNota: (id: string) => void;
  marcarNotaPaga: (id: string) => void;
  marcarNotaPendente: (id: string) => void;

  resetRetiroData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loadingRetiros, setLoadingRetiros] = useState(false);
  const [retiroAtualId, setRetiroAtualIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(RETIRO_KEY);
  });

  const [data, setData] = useState<RetiroData>(() => emptyData());

  const clearAuthenticatedState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setRetiros([]);
    setLoadingRetiros(false);
    setRetiroAtualIdState(null);
    setData(emptyData());
    if (typeof window !== "undefined") localStorage.removeItem(RETIRO_KEY);
  }, []);

  // Persist retiroAtualId
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (retiroAtualId) localStorage.setItem(RETIRO_KEY, retiroAtualId);
    else localStorage.removeItem(RETIRO_KEY);
  }, [retiroAtualId]);

  const loadProfileAndRole = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof ?? null);
    setIsAdmin((roles ?? []).some((r: any) => r.role === "admin"));
  }, []);

  const reloadRetiros = useCallback(async () => {
    setLoadingRetiros(true);
    const { data, error } = await supabase.from("retiros").select("id, nome").order("nome");
    if (!error && data) setRetiros(data as Retiro[]);
    setLoadingRetiros(false);
  }, []);

  const migrateLegacyData = useCallback(async (retiroId: string, legacy: RetiroData) => {
    const pessoaIds = new Map<string, string>();
    const produtoIds = new Map<string, string>();

    const pessoas = legacy.pessoas.map((p) => {
      const id = isUuid(p.id) ? p.id : uid();
      pessoaIds.set(p.id, id);
      return { id, retiro_id: retiroId, nome: p.nome, telefone: p.telefone ?? null, setor: p.setor ?? null };
    });
    const produtos = legacy.produtos.map((p) => {
      const id = isUuid(p.id) ? p.id : uid();
      produtoIds.set(p.id, id);
      return { id, retiro_id: retiroId, nome: p.nome, valor: Number(p.valor) || 0, fornecedor: p.fornecedor };
    });

    if (pessoas.length) await db.from("pessoas").insert(pessoas);
    if (produtos.length) await db.from("produtos").insert(produtos);

    const vendas = legacy.vendas.flatMap((v) => {
      const pessoaId = pessoaIds.get(v.pessoaId) ?? (isUuid(v.pessoaId) ? v.pessoaId : null);
      const produtoId = produtoIds.get(v.produtoId) ?? (isUuid(v.produtoId) ? v.produtoId : null);
      if (!pessoaId || !produtoId) return [];
      return [{
        id: isUuid(v.id) ? v.id : uid(),
        retiro_id: retiroId,
        pessoa_id: pessoaId,
        produto_id: produtoId,
        quantidade: v.quantidade,
        valor_unit: v.valorUnit,
        valor_total: v.valorTotal,
        status: v.status,
        produto_nome: v.produtoNome,
        fornecedor: v.fornecedor,
        criado_em: v.criadoEm,
      }];
    });
    if (vendas.length) await db.from("vendas").insert(vendas);

    const notas = legacy.notas.map((n) => ({
      id: isUuid(n.id) ? n.id : uid(),
      retiro_id: retiroId,
      fornecedor: n.fornecedor,
      descricao: n.descricao ?? null,
      valor: n.valor,
      status: n.status,
      criado_em: n.criadoEm,
    }));
    if (notas.length) await db.from("notas_fornecedores").insert(notas);

    if (typeof window !== "undefined") localStorage.setItem(MIGRATED_KEY(retiroId), "1");
  }, []);

  const loadRetiroData = useCallback(async (retiroId: string | null) => {
    if (!retiroId) {
      setData(emptyData());
      return;
    }

    const fetchData = async () => {
      const [pessoasRes, produtosRes, vendasRes, notasRes] = await Promise.all([
        db.from("pessoas").select("id, retiro_id, nome, telefone, setor").eq("retiro_id", retiroId).order("nome"),
        db.from("produtos").select("id, retiro_id, nome, valor, fornecedor").eq("retiro_id", retiroId).order("nome"),
        db.from("vendas").select("id, retiro_id, pessoa_id, produto_id, quantidade, valor_unit, valor_total, status, produto_nome, fornecedor, criado_em").eq("retiro_id", retiroId).order("criado_em", { ascending: false }),
        db.from("notas_fornecedores").select("id, retiro_id, fornecedor, descricao, valor, status, criado_em").eq("retiro_id", retiroId).order("criado_em", { ascending: false }),
      ]);

      return {
        pessoas: (pessoasRes.data ?? []).map(mapPessoa),
        produtos: (produtosRes.data ?? []).map(mapProduto),
        vendas: (vendasRes.data ?? []).map(mapVenda),
        notas: (notasRes.data ?? []).map(mapNota),
      };
    };

    let next = await fetchData();
    const legacy = loadLegacyData(retiroId);
    const alreadyMigrated = typeof window !== "undefined" && localStorage.getItem(MIGRATED_KEY(retiroId)) === "1";
    if (!hasData(next) && hasData(legacy) && !alreadyMigrated) {
      await migrateLegacyData(retiroId, legacy);
      next = await fetchData();
    }
    setData(next);
  }, [migrateLegacyData]);

  useEffect(() => {
    if (!user) return;
    loadRetiroData(retiroAtualId);
  }, [loadRetiroData, retiroAtualId, user]);

  // Auth bootstrap
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? "" });
        await loadProfileAndRole(session.user.id);
        await reloadRetiros();
      } else {
        clearAuthenticatedState();
      }
      setLoadingAuth(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? "" });
        setTimeout(() => {
          loadProfileAndRole(session.user.id);
          reloadRetiros();
        }, 0);
      } else {
        clearAuthenticatedState();
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [clearAuthenticatedState, loadProfileAndRole, reloadRetiros]);

  const value = useMemo<StoreContextValue>(() => {
    const retiroAtual = retiros.find((r) => r.id === retiroAtualId) ?? null;
    const rid = retiroAtual?.id ?? "";

    return {
      loadingAuth,
      user,
      profile,
      isAdmin,
      signIn: async (username, password) => {
        try {
          let email: string;
          try {
            const res = await resolveEmailFromUsername({ data: { username } });
            email = res.email;
          } catch {
            // fallback legacy
            email = `${username.trim().toLowerCase()}@cantinho.local`;
          }
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: "Usuário ou senha inválidos." };
          return {};
        } catch (e: any) {
          return { error: e?.message ?? "Falha ao entrar." };
        }
      },
      signOut: async () => {
        await queryClient?.cancelQueries();
        queryClient?.clear();
        clearAuthenticatedState();
        await supabase.auth.signOut();
      },

      retiros,
      loadingRetiros,
      reloadRetiros,
      retiroAtual,
      setRetiroAtual: (id) => setRetiroAtualIdState(id),

      pessoasDoRetiro: data.pessoas,
      produtosDoRetiro: data.produtos,
      vendasDoRetiro: data.vendas,
      notasDoRetiro: data.notas,

      addPessoa: (p) => {
        if (!rid) return;
        const pessoa = { id: uid(), retiroId: rid, ...p };
        setData((s) => ({ ...s, pessoas: [...s.pessoas, pessoa].sort((a, b) => a.nome.localeCompare(b.nome)) }));
        db.from("pessoas").insert({ id: pessoa.id, retiro_id: rid, nome: pessoa.nome, telefone: pessoa.telefone ?? null, setor: pessoa.setor ?? null });
      },
      updatePessoa: (id, p) => {
        setData((s) => ({ ...s, pessoas: s.pessoas.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
        db.from("pessoas").update({ nome: p.nome, telefone: p.telefone ?? null, setor: p.setor ?? null }).eq("id", id).eq("retiro_id", rid);
      },
      removePessoa: (id) => {
        setData((s) => ({ ...s, pessoas: s.pessoas.filter((x) => x.id !== id), vendas: s.vendas.filter((v) => v.pessoaId !== id) }));
        db.from("pessoas").delete().eq("id", id).eq("retiro_id", rid);
      },
      importPessoas: (rows) => {
        if (!rid) return 0;
        const novos = rows.flatMap((r) => r.nome?.trim() ? [{ id: uid(), nome: r.nome.trim(), telefone: r.telefone?.trim(), setor: r.setor?.trim(), retiroId: rid }] : []);
        if (novos.length) db.from("pessoas").insert(novos.map((p) => ({ id: p.id, retiro_id: rid, nome: p.nome, telefone: p.telefone ?? null, setor: p.setor ?? null })));
        setData((s) => ({ ...s, pessoas: [...s.pessoas, ...novos] }));
        return novos.length;
      },

      addProduto: (p) => {
        if (!rid) return;
        const produto = { id: uid(), retiroId: rid, nome: p.nome, valor: Number(p.valor) || 0, fornecedor: p.fornecedor };
        setData((s) => ({ ...s, produtos: [...s.produtos, produto].sort((a, b) => a.nome.localeCompare(b.nome)) }));
        db.from("produtos").insert({ id: produto.id, retiro_id: rid, nome: produto.nome, valor: produto.valor, fornecedor: produto.fornecedor });
      },
      updateProduto: (id, p) => {
        setData((s) => ({ ...s, produtos: s.produtos.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
        db.from("produtos").update({ nome: p.nome, valor: p.valor, fornecedor: p.fornecedor }).eq("id", id).eq("retiro_id", rid);
      },
      removeProduto: (id) => {
        setData((s) => ({ ...s, produtos: s.produtos.filter((x) => x.id !== id), vendas: s.vendas.filter((v) => v.produtoId !== id) }));
        db.from("produtos").delete().eq("id", id).eq("retiro_id", rid);
      },
      importProdutos: (rows) => {
        if (!rid) return 0;
        const novos = rows.flatMap((r) => r.nome?.trim() ? [{ id: uid(), nome: r.nome.trim(), valor: Number(r.valor) || 0, fornecedor: (r.fornecedor || "—").trim(), retiroId: rid }] : []);
        if (novos.length) db.from("produtos").insert(novos.map((p) => ({ id: p.id, retiro_id: rid, nome: p.nome, valor: p.valor, fornecedor: p.fornecedor })));
        setData((s) => ({ ...s, produtos: [...s.produtos, ...novos] }));
        return novos.length;
      },

      addVenda: (pessoaId, produtoId, quantidade) => {
        const prod = data.produtos.find((p) => p.id === produtoId);
        const pes = data.pessoas.find((p) => p.id === pessoaId);
        if (!prod || !pes || !rid) return;
        const venda: Venda = { id: uid(), pessoaId, produtoId, quantidade, valorUnit: prod.valor, valorTotal: prod.valor * quantidade, status: "pendente" as VendaStatus, retiroId: rid, criadoEm: new Date().toISOString(), produtoNome: prod.nome, fornecedor: prod.fornecedor };
        db.from("vendas").insert({ id: venda.id, retiro_id: rid, pessoa_id: pessoaId, produto_id: produtoId, quantidade, valor_unit: venda.valorUnit, valor_total: venda.valorTotal, status: venda.status, produto_nome: venda.produtoNome, fornecedor: venda.fornecedor, criado_em: venda.criadoEm });
        setData((s) => ({ ...s, vendas: [venda, ...s.vendas] }));
      },
      removeVenda: (id) => {
        setData((s) => ({ ...s, vendas: s.vendas.filter((v) => v.id !== id) }));
        db.from("vendas").delete().eq("id", id).eq("retiro_id", rid);
      },
      clearPessoas: () => {
        setData((s) => ({ ...s, pessoas: [], vendas: [] }));
        db.from("pessoas").delete().eq("retiro_id", rid);
      },
      clearProdutos: () => {
        setData((s) => ({ ...s, produtos: [], vendas: [] }));
        db.from("produtos").delete().eq("retiro_id", rid);
      },
      clearVendas: () => {
        setData((s) => ({ ...s, vendas: [] }));
        db.from("vendas").delete().eq("retiro_id", rid);
      },
      marcarPessoaPaga: (pessoaId) => {
        setData((s) => ({
          ...s,
          vendas: s.vendas.map((v) =>
            v.pessoaId === pessoaId && v.status === "pendente" ? { ...v, status: "pago" } : v,
          ),
        }));
        db.from("vendas").update({ status: "pago" }).eq("retiro_id", rid).eq("pessoa_id", pessoaId).eq("status", "pendente");
      },

      addNota: (n) => {
        if (!rid) return;
        const nota = { id: uid(), retiroId: rid, fornecedor: n.fornecedor, descricao: n.descricao, valor: Number(n.valor) || 0, status: n.status ?? "pendente", criadoEm: new Date().toISOString() } as NotaFornecedor;
        setData((s) => ({ ...s, notas: [nota, ...s.notas] }));
        db.from("notas_fornecedores").insert({ id: nota.id, retiro_id: rid, fornecedor: nota.fornecedor, descricao: nota.descricao ?? null, valor: nota.valor, status: nota.status, criado_em: nota.criadoEm });
      },
      updateNota: (id, n) => {
        setData((s) => ({ ...s, notas: s.notas.map((x) => (x.id === id ? { ...x, ...n } : x)) }));
        db.from("notas_fornecedores").update({ fornecedor: n.fornecedor, descricao: n.descricao ?? null, valor: n.valor, status: n.status }).eq("id", id).eq("retiro_id", rid);
      },
      removeNota: (id) => {
        setData((s) => ({ ...s, notas: s.notas.filter((x) => x.id !== id) }));
        db.from("notas_fornecedores").delete().eq("id", id).eq("retiro_id", rid);
      },
      marcarNotaPaga: (id) => {
        setData((s) => ({ ...s, notas: s.notas.map((x) => (x.id === id ? { ...x, status: "pago" } : x)) }));
        db.from("notas_fornecedores").update({ status: "pago" }).eq("id", id).eq("retiro_id", rid);
      },
      marcarNotaPendente: (id) => {
        setData((s) => ({ ...s, notas: s.notas.map((x) => (x.id === id ? { ...x, status: "pendente" } : x)) }));
        db.from("notas_fornecedores").update({ status: "pendente" }).eq("id", id).eq("retiro_id", rid);
      },

      resetRetiroData: () => {
        if (typeof window !== "undefined" && retiroAtualId) localStorage.removeItem(DATA_KEY(retiroAtualId));
        setData(emptyData());
        db.from("vendas").delete().eq("retiro_id", rid);
        db.from("notas_fornecedores").delete().eq("retiro_id", rid);
        db.from("pessoas").delete().eq("retiro_id", rid);
        db.from("produtos").delete().eq("retiro_id", rid);
      },
    };
  }, [loadingAuth, user, profile, isAdmin, retiros, loadingRetiros, reloadRetiros, retiroAtualId, data, clearAuthenticatedState, queryClient]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
