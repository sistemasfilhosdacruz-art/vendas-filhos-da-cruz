import { createServerFn } from "@tanstack/react-start";

export const resolveEmailFromUsername = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => {
    if (!data?.username?.trim()) throw new Error("Informe o usuário.");
    return { username: data.username.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const tag = "[resolveEmailFromUsername]";
    console.log(`${tag} step=start username="${data.username}"`);
    console.log(
      `${tag} env SUPABASE_URL=${process.env.SUPABASE_URL ? "SET" : "MISSING"} SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING"}`,
    );

    let supabaseAdmin;
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
      console.log(`${tag} step=admin-client-loaded`);
    } catch (e: any) {
      console.error(`${tag} step=admin-client-failed error="${e?.message ?? e}"`);
      throw e;
    }

    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();

    if (error) {
      console.error(`${tag} step=profile-query-error message="${error.message}"`);
      throw new Error(error.message);
    }
    if (!prof) {
      console.warn(`${tag} step=profile-not-found username="${data.username}"`);
      throw new Error("Usuário não encontrado.");
    }
    console.log(`${tag} step=profile-found id=${prof.id}`);

    const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    if (uErr || !userRes?.user?.email) {
      console.error(
        `${tag} step=auth-user-error message="${uErr?.message ?? "no email"}" hasUser=${!!userRes?.user}`,
      );
      throw new Error("E-mail do usuário não encontrado.");
    }
    console.log(`${tag} step=email-resolved emailMask="${userRes.user.email.replace(/(.).+(@.+)/, "$1***$2")}"`);
    return { email: userRes.user.email };
  });
