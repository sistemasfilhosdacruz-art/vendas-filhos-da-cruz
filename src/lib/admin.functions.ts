import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Apenas administradores podem executar esta ação.");
}

function emailFromUsername(u: string) {
  return `${u.trim().toLowerCase()}@cantinho.local`;
}

function validUsername(u: string) {
  return /^[a-z0-9_.-]{3,32}$/.test(u);
}

// ===== Usuários =====

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, created_at")
      .order("username");
    if (error) throw error;

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: membros } = await supabaseAdmin.from("retiro_membros").select("retiro_id, user_id");

    const roleByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      roleByUser.set(r.user_id, arr);
    });
    const retirosByUser = new Map<string, string[]>();
    (membros ?? []).forEach((m: any) => {
      const arr = retirosByUser.get(m.user_id) ?? [];
      arr.push(m.retiro_id);
      retirosByUser.set(m.user_id, arr);
    });

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: roleByUser.get(p.id) ?? ["user"],
      retiroIds: retirosByUser.get(p.id) ?? [],
    }));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { username: string; full_name: string; password: string; retiroIds?: string[] }) => {
    if (!validUsername(data.username)) throw new Error("Usuário inválido (3-32 letras minúsculas, números, _ . -).");
    if (!data.full_name?.trim()) throw new Error("Informe o nome.");
    if (!data.password || data.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = emailFromUsername(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username.trim().toLowerCase(), full_name: data.full_name.trim() },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");

    const userId = created.user.id;
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, username: data.username.trim().toLowerCase(), full_name: data.full_name.trim() });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(pErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "user" });

    if (data.retiroIds?.length) {
      await supabaseAdmin
        .from("retiro_membros")
        .insert(data.retiroIds.map((rid) => ({ retiro_id: rid, user_id: userId })));
    }
    return { id: userId };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => {
    if (!data.password || data.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRetiros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; retiroIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("retiro_membros").delete().eq("user_id", data.userId);
    if (data.retiroIds.length) {
      const { error } = await supabaseAdmin
        .from("retiro_membros")
        .insert(data.retiroIds.map((rid) => ({ retiro_id: rid, user_id: data.userId })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== Retiros =====

export const createRetiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { nome: string }) => {
    if (!data.nome?.trim()) throw new Error("Informe o nome do retiro.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin
      .from("retiros")
      .insert({ nome: data.nome.trim() })
      .select("id, nome")
      .single();
    if (error) throw new Error(error.message);
    return r;
  });

export const deleteRetiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("retiros").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Próprio usuário =====

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => {
    if (!data.password || data.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.auth.updateUser({ password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
