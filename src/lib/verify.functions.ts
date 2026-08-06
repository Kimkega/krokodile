import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyCertificate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ code: z.string().trim().min(4).max(60) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Accept a full scanned URL (…/verify?code=KD-XXXX-XXXX) or a bare code.
    const raw = data.code.trim();
    const match = /code=([A-Za-z0-9-]+)/.exec(raw);
    const code = (match?.[1] ?? raw).trim().toUpperCase();

    const { data: cert } = await supabaseAdmin
      .from("certificates")
      .select("code, serial, product_name, issued_to, status, created_at, scans, order_code, buyer_name, paid_at")
      .eq("code", code)
      .maybeSingle();
    if (!cert) return { ok: false as const, message: "No certificate matches that code." };

    await supabaseAdmin
      .from("certificates")
      .update({ scans: (cert.scans ?? 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq("code", code);

    // Pull the live order so the buyer name and payment date are always accurate.
    let buyerName = cert.buyer_name ?? cert.issued_to ?? null;
    let paidAt = cert.paid_at as string | null;
    let orderCode = cert.order_code as string | null;
    if (orderCode) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("order_code, customer_name, payment_status, mpesa_receipt, created_at, updated_at")
        .eq("order_code", orderCode)
        .maybeSingle();
      if (order) {
        buyerName = buyerName ?? order.customer_name;
        if (!paidAt && order.payment_status === "paid") paidAt = order.updated_at ?? order.created_at;
        orderCode = order.order_code;
      }
    }

    return {
      ok: true as const,
      certificate: {
        code: cert.code,
        serial: cert.serial,
        productName: cert.product_name,
        issuedTo: cert.issued_to,
        buyerName,
        orderCode,
        paidAt,
        status: cert.status,
        issuedAt: cert.created_at,
        scans: (cert.scans ?? 0) + 1,
      },
    };
  });
