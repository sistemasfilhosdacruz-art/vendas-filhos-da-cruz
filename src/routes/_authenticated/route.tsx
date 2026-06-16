import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loadingAuth } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadingAuth && !user) navigate({ to: "/auth", replace: true });
  }, [user, loadingAuth, navigate]);

  if (loadingAuth) {
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!user) return null;
  return <Outlet />;
}
