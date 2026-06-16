import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Loja FDC" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, user, loadingAuth } = useStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loadingAuth && user) navigate({ to: "/" });
  }, [user, loadingAuth, navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return toast.error("Informe usuário e senha.");
    setBusy(true);
    const { error } = await signIn(username, password);
    setBusy(false);
    if (error) return toast.error(error);
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 bg-gradient-to-b from-background to-primary/5">
      <Card className="w-full max-w-sm p-6 shadow-soft">
        <div className="text-center">
          <div className="relative mx-auto mb-6 flex w-full items-center justify-center px-2">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 blur-2xl opacity-50" />
            <img src="/logo-fdc.png" alt="Loja FDC" className="relative w-full h-auto object-contain drop-shadow-md" />
          </div>
          <h1 className="mt-2 mb-4 text-2xl font-bold">Entrar na Loja FDC</h1>
        </div>

        <form onSubmit={entrar} className="mt-5 space-y-3">
          <div>
            <Label className="text-xs">Usuário</Label>
            <Input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: admin"
              className="h-11"
            />
          </div>
          <div>
            <Label className="text-xs">Senha</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 text-base font-semibold">
            <LogIn className="mr-2 h-4 w-4" />
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Acesso restrito. Solicite suas credenciais ao administrador.
        </p>
      </Card>
    </div>
  );
}
