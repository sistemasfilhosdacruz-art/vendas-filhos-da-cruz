import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, Receipt, Users, Settings, LogOut, KeyRound, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { changeMyPassword } from "@/lib/admin.functions";
import { toast } from "sonner";

export function AppLayout({ children }: { children: ReactNode }) {
  const { retiroAtual } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = pathname === "/auth";
  const isHome = pathname === "/";

  const nav = [
    { to: "/painel", label: "Painel", icon: LayoutDashboard },
    { to: "/lancar", label: "Lançar", icon: PlusCircle },
    { to: "/contas", label: "Contas", icon: Receipt },
    { to: "/notas", label: "Notas", icon: FileText },
    { to: "/cadastros", label: "Cadastros", icon: Users },
    { to: "/configuracoes" as const, label: "Ajustes", icon: Settings },
  ];

  // Home (logged) or auth page: render bare
  if (isPublic || isHome) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        {children}
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto max-w-5xl px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/logo-fdc.png" alt="Loja FDC" className="h-10 w-10 shrink-0 rounded-full object-contain ring-1 ring-border bg-white" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-none">Loja FDC</p>
              <h1 className="truncate text-base font-bold sm:text-lg" suppressHydrationWarning>{retiroAtual?.nome ?? "—"}</h1>
            </div>
          </Link>
          <UserMenu />
        </div>

        <nav className="hidden md:block border-t border-border bg-card">
          <div className="mx-auto max-w-5xl px-4 flex gap-1">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" />{n.label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-5 pb-28 md:pb-10">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom">
        <div className={`mx-auto max-w-5xl grid ${nav.length === 6 ? "grid-cols-6" : nav.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${active ? "bg-primary/10" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster richColors position="top-center" />
    </div>
  );
}

function UserMenu() {
  const { profile, signOut } = useStore();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const changeFn = useServerFn(changeMyPassword);

  async function trocar() {
    if (pw.length < 6) return toast.error("Mínimo 6 caracteres.");
    try { await changeFn({ data: { password: pw } }); toast.success("Senha alterada"); setPwOpen(false); setPw(""); }
    catch (e: any) { toast.error(e.message ?? "Falha"); }
  }

  return (
    <div className="flex items-center gap-2">
      <Link to="/" className="hidden sm:inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground" title="Trocar retiro">
        <LogOut className="h-4 w-4 rotate-180" /> Trocar retiro
      </Link>
      <Button size="sm" variant="ghost" onClick={() => setPwOpen(true)} title="Trocar minha senha">
        <KeyRound className="h-4 w-4" />
        <span className="hidden md:inline ml-1 text-xs">{profile?.username}</span>
      </Button>
      <Button size="sm" variant="outline" onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }} title="Sair">
        <LogOut className="h-4 w-4" />
      </Button>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trocar minha senha</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs">Nova senha (mín. 6)</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancelar</Button>
            <Button onClick={trocar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
