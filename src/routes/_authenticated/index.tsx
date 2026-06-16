import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import logoAsset from "@/assets/logo-manancial.png.asset.json";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight, KeyRound, LogOut, Plus, Settings, Sparkles, Trash2, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createRetiro, deleteRetiro,
  listAppUsers, createAppUser, deleteAppUser, setUserPassword, setUserRetiros,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Loja FDC — Escolha o retiro" }] }),
  component: Home,
});

type AppUser = {
  id: string; username: string; full_name: string;
  roles: string[]; retiroIds: string[];
};

function Home() {
  const { retiros, retiroAtual, setRetiroAtual, isAdmin, profile, signOut, reloadRetiros } = useStore();
  const navigate = useNavigate();

  // dialog state
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [usersOpen, setUsersOpen] = useState(false);

  const createRetiroFn = useServerFn(createRetiro);
  const deleteRetiroFn = useServerFn(deleteRetiro);

  // (não limpamos retiroAtual aqui — isso causava o usuário ser "chutado" de volta
  // ao navegar para /painel, porque o AppLayout via retiroAtual=null.)

  function entrar(id: string) {
    setRetiroAtual(id);
    navigate({ to: "/painel" });
  }

  async function sair() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function criarRetiro() {
    const n = novoNome.trim();
    if (!n) return toast.error("Informe o nome.");
    try {
      await createRetiroFn({ data: { nome: n } });
      await reloadRetiros();
      setNovoOpen(false); setNovoNome("");
      toast.success("Retiro criado");
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  async function excluirRetiro(id: string, nome: string) {
    if (!window.confirm(`Excluir o retiro "${nome}"? Os acessos vinculados serão removidos.`)) return;
    try {
      await deleteRetiroFn({ data: { id } });
      await reloadRetiros();
      toast.success("Retiro removido");
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
        {/* topo: usuário */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Logado como <strong className="text-foreground">{profile?.full_name ?? profile?.username}</strong>{isAdmin && " (admin)"}</span>
          <button onClick={sair} className="inline-flex items-center gap-1 hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>

        <div className="text-center mt-4">
          <div className="relative mx-auto mb-5 grid h-32 w-32 place-items-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20 blur-2xl" />
            <img src={logoAsset.url} alt="Manancial" className="relative h-32 w-32 object-contain drop-shadow-[0_8px_24px_rgba(46,90,106,0.25)]" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Loja FDC</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Escolha o retiro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione em qual retiro você vai atender hoje.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {retiros.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {isAdmin ? "Nenhum retiro cadastrado. Crie o primeiro abaixo." : "Você ainda não tem acesso a nenhum retiro. Peça ao administrador."}
            </div>
          )}

          {retiros.map((r) => (
            <RetiroButton
              key={r.id}
              nome={r.nome}
              onClick={() => entrar(r.id)}
              onDelete={isAdmin ? () => excluirRetiro(r.id, r.nome) : undefined}
            />
          ))}

          {isAdmin && (
            <>
              <Button
                onClick={() => setNovoOpen(true)}
                variant="outline"
                className="h-14 w-full rounded-2xl border-dashed border-2 text-base font-semibold"
              >
                <Plus className="mr-2 h-5 w-5" /> Novo retiro
              </Button>

              <Button
                onClick={() => setUsersOpen(true)}
                variant="secondary"
                className="h-12 w-full rounded-2xl text-sm font-semibold"
              >
                <Users className="mr-2 h-4 w-4" /> Gerenciar usuários
              </Button>
            </>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground/80">
          "Aquele que beber da água que eu darei,<br />nunca mais terá sede." — Jo 4,14
        </p>
      </div>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo retiro</DialogTitle></DialogHeader>
          <Input
            autoFocus placeholder="Ex: Manancial 2026"
            value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarRetiro()}
            className="h-11"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button onClick={criarRetiro}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && <UsersDialog open={usersOpen} onClose={() => setUsersOpen(false)} />}
    </div>
  );
}

function RetiroButton({ nome, onClick, onDelete }: { nome: string; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-primary/50 hover:shadow-card active:scale-[0.99]"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Entrar no retiro</p>
          <p className="truncate text-lg font-bold">{nome}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </button>
      {onDelete && (
        <Button
          size="icon" variant="ghost"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-card border border-border opacity-0 group-hover:opacity-100"
          title="Excluir retiro"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function UsersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { retiros, user: me } = useStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const listFn = useServerFn(listAppUsers);
  const deleteFn = useServerFn(deleteAppUser);
  const setPwdFn = useServerFn(setUserPassword);
  const setRetirosFn = useServerFn(setUserRetiros);

  async function load() {
    setLoading(true);
    try { setUsers(await listFn() as AppUser[]); }
    catch (e: any) { toast.error(e.message ?? "Falha ao carregar"); }
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line

  async function toggleRetiro(u: AppUser, retiroId: string) {
    const has = u.retiroIds.includes(retiroId);
    const next = has ? u.retiroIds.filter((x) => x !== retiroId) : [...u.retiroIds, retiroId];
    try {
      await setRetirosFn({ data: { userId: u.id, retiroIds: next } });
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, retiroIds: next } : x)));
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  async function trocarSenha(u: AppUser) {
    const senha = window.prompt(`Nova senha para "${u.username}" (mín. 6):`);
    if (!senha) return;
    try { await setPwdFn({ data: { userId: u.id, password: senha } }); toast.success("Senha alterada"); }
    catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  async function excluir(u: AppUser) {
    if (!window.confirm(`Excluir o usuário "${u.username}"?`)) return;
    try {
      await deleteFn({ data: { userId: u.id } });
      setUsers((arr) => arr.filter((x) => x.id !== u.id));
      toast.success("Usuário excluído");
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usuários do app</DialogTitle>
            <DialogDescription>
              Crie acessos e vincule a um ou mais retiros. O administrador acessa todos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={() => setNewOpen(true)} size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
            </Button>
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => {
                const isAdminU = u.roles.includes("admin");
                const isMe = u.id === me?.id;
                return (
                  <Card key={u.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {u.full_name} <span className="text-muted-foreground text-xs font-normal">@{u.username}</span>
                          {isAdminU && <span className="ml-2 rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5">ADMIN</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => trocarSenha(u)} title="Trocar senha">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {!isMe && !isAdminU && (
                          <Button size="icon" variant="ghost" onClick={() => excluir(u)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!isAdminU && (
                      <div className="mt-2 border-t border-border pt-2">
                        <p className="text-xs text-muted-foreground mb-1">Acesso aos retiros:</p>
                        {retiros.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Crie um retiro primeiro.</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {retiros.map((r) => (
                              <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={u.retiroIds.includes(r.id)}
                                  onCheckedChange={() => toggleRetiro(u, r.id)}
                                />
                                {r.nome}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewUserDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => { setNewOpen(false); load(); }}
      />
    </>
  );
}

function NewUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { retiros } = useStore();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [retiroIds, setRetiroIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(createAppUser);

  useEffect(() => {
    if (open) { setUsername(""); setFullName(""); setPassword(""); setRetiroIds([]); }
  }, [open]);

  async function criar() {
    setBusy(true);
    try {
      await createFn({ data: { username, full_name: fullName, password, retiroIds } });
      toast.success("Usuário criado");
      onCreated();
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Silva" />
          </div>
          <div>
            <Label className="text-xs">Usuário (sem espaços)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="maria" />
          </div>
          <div>
            <Label className="text-xs">Senha inicial (mín. 6)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {retiros.length > 0 && (
            <div>
              <Label className="text-xs">Retiros com acesso</Label>
              <div className="mt-1 flex flex-wrap gap-3 rounded-md border border-input p-2">
                {retiros.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={retiroIds.includes(r.id)}
                      onCheckedChange={(c) =>
                        setRetiroIds((arr) => (c ? [...arr, r.id] : arr.filter((x) => x !== r.id)))
                      }
                    />
                    {r.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} disabled={busy}>{busy ? "Criando…" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// import settings icon avoids unused warning later? keep for tree-shaking calm
void Settings;
