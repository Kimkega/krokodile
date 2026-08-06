import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const smtpSchema = z.object({
  host: z.string().trim().max(200),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().max(200).optional().default(""),
  password: z.string().trim().max(300).optional().default(""),
  fromName: z.string().trim().max(120).optional().default(""),
  fromEmail: z.string().trim().max(200).optional().default(""),
  replyTo: z.string().trim().max(200).optional().default(""),
  enabled: z.boolean(),
});

async function assertAdmin(context: {
  supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const getEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: smtp } = await supabaseAdmin
      .from("smtp_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: templates } = await supabaseAdmin
      .from("email_templates")
      .select("key, label, subject, body, enabled")
      .order("label");
    return {
      smtp: smtp
        ? {
            host: smtp.host ?? "",
            port: smtp.port ?? 587,
            secure: smtp.secure,
            username: smtp.username ?? "",
            passwordSet: Boolean(smtp.password),
            fromName: smtp.from_name ?? "",
            fromEmail: smtp.from_email ?? "",
            replyTo: smtp.reply_to ?? "",
            enabled: smtp.enabled,
          }
        : null,
      templates: templates ?? [],
    };
  });

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => smtpSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("smtp_config")
      .select("id, password")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      host: data.host || null,
      port: data.port,
      secure: data.secure,
      username: data.username || null,
      password: data.password || existing?.password || null,
      from_name: data.fromName || null,
      from_email: data.fromEmail || data.username || null,
      reply_to: data.replyTo || null,
      enabled: data.enabled,
    };

    if (existing) {
      const { error } = await supabaseAdmin.from("smtp_config").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("smtp_config").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        key: z.string().trim().min(2).max(60),
        subject: z.string().trim().min(2).max(200),
        body: z.string().trim().min(2).max(6000),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("email_templates")
      .update({ subject: data.subject, body: data.body, enabled: data.enabled })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ to: z.string().trim().email().max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { loadSmtpConfig, sendSmtpMail } = await import("./smtp.server");
    const { emailHtml, publicBaseUrl } = await import("./notify.server");
    const cfg = await loadSmtpConfig();
    if (!cfg || !cfg.host) return { ok: false as const, message: "Save your SMTP host first." };
    try {
      const base = await publicBaseUrl();
      const text = "This is a test email from your store's SMTP settings.\nIf you can read this, mail delivery works.";
      await sendSmtpMail(cfg, {
        to: data.to,
        subject: "SMTP test — KROKO DILE",
        text,
        html: emailHtml("KROKO DILE", text, base),
      });
      return { ok: true as const, message: `Test email sent to ${data.to}` };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Send failed" };
    }
  });

/** Manually re-send a notification for an order (e.g. after fixing SMTP). */
export const resendOrderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderCode: z.string().trim().min(3).max(20), key: z.string().trim().min(2).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOrderEmail } = await import("./notify.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", data.orderCode.toUpperCase())
      .maybeSingle();
    if (!order) return { ok: false as const, message: "Order not found." };
    const res = await sendOrderEmail(data.key as never, order.id);
    return { ok: res.sent, message: res.sent ? "Email sent." : (res.reason ?? "Not sent") };
  });
