import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyCertificate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ code: z.string().trim().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: cert } = await supabaseAdmin
      .from("certificates")
      .select("code, serial, product_name, issued_to, status, created_at, scans")
      .eq("code", code)
      .maybeSingle();
    if (!cert) return { ok: false as const, message: "No certificate matches that code." };

    await supabaseAdmin
      .from("certificates")
      .update({ scans: (cert.scans ?? 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq("code", code);

    return {
      ok: true as const,
      certificate: {
        code: cert.code,
        serial: cert.serial,
        productName: cert.product_name,
        issuedTo: cert.issued_to,
        status: cert.status,
        issuedAt: cert.created_at,
        scans: (cert.scans ?? 0) + 1,
      },
    };
  });
