import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adSchema = z.object({
  advertiserName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(20),
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().max(200).optional().default(""),
  imageUrl: z.string().trim().max(500).optional().default(""),
  targetUrl: z.string().trim().max(500).optional().default(""),
  placement: z.enum(["home_banner", "shop_strip", "receipt_footer"]),
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

export const createAdPurchase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMpesaConfig, stkPush } = await import("./mpesa.server");
    const { adPrice } = await import("./ads");
    const { normalizeMsisdn, randomCode } = await import("./codes.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const phone = normalizeMsisdn(data.phone);
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return { ok: false as const, message: "Enter a valid Kenyan phone number." };
    }

    const amount = adPrice(data.placement, data.days);
    const adCode = `AD-${randomCode(6)}`;

    const { data: ad, error } = await supabaseAdmin
      .from("ads")
      .insert({
        ad_code: adCode,
        advertiser_name: data.advertiserName,
        email: data.email.toLowerCase(),
        phone,
        title: data.title,
        body: data.body || null,
        image_url: data.imageUrl || null,
        target_url: data.targetUrl || null,
        placement: data.placement,
        days: data.days,
        amount,
      })
      .select("id, ad_code")
      .single();
    if (error) throw new Error(error.message);

    const cfg = await loadMpesaConfig();
    if (!cfg || !cfg.enabled || !cfg.consumer_key || !cfg.consumer_secret || !cfg.passkey) {
      await supabaseAdmin
        .from("ads")
        .update({ payment_message: "M-Pesa is not configured yet. The store will contact you." })
        .eq("id", ad.id);
      return {
        ok: true as const,
        adCode,
        amount,
        paymentStarted: false,
        message: "Ad booked. M-Pesa is not configured yet — the store will contact you.",
      };
    }

    const origin = (() => {
      try {
        return new URL(getRequest().url).origin;
      } catch {
        return "";
      }
    })();
    const callbackUrl = cfg.callback_url?.trim() || `${origin}/api/public/mpesa/callback`;

    try {
      const push = await stkPush({
        cfg,
        phone,
        amount,
        reference: adCode,
        description: `KROKO DILE advert ${adCode}`,
        callbackUrl,
      });
      await supabaseAdmin
        .from("ads")
        .update({
          checkout_request_id: push.checkoutRequestId ?? null,
          merchant_request_id: push.merchantRequestId ?? null,
          payment_message: push.message,
          payment_status: push.ok ? "processing" : "failed",
        })
        .eq("id", ad.id);
      return { ok: true as const, adCode, amount, paymentStarted: push.ok, message: push.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be started";
      await supabaseAdmin
        .from("ads")
        .update({ payment_status: "failed", payment_message: message })
        .eq("id", ad.id);
      return { ok: true as const, adCode, amount, paymentStarted: false, message };
    }
  });

export const getAdStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ adCode: z.string().trim().min(4).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMpesaConfig, stkQuery } = await import("./mpesa.server");

    const { data: ad } = await supabaseAdmin
      .from("ads")
      .select(
        "id, ad_code, title, placement, days, amount, status, payment_status, payment_message, mpesa_receipt, checkout_request_id",
      )
      .eq("ad_code", data.adCode.toUpperCase())
      .maybeSingle();
    if (!ad) return { ok: false as const, message: "Advert not found." };

    if (ad.payment_status === "processing" && ad.checkout_request_id) {
      const cfg = await loadMpesaConfig();
      if (cfg?.enabled) {
        try {
          const q = await stkQuery(cfg, ad.checkout_request_id);
          if (q.resultCode === "0") {
            await supabaseAdmin
              .from("ads")
              .update({ payment_status: "paid", payment_message: q.description })
              .eq("id", ad.id);
            ad.payment_status = "paid";
            ad.payment_message = q.description;
          } else if (q.resultCode && q.resultCode !== "0") {
            await supabaseAdmin
              .from("ads")
              .update({ payment_status: "failed", payment_message: q.description || "Payment cancelled." })
              .eq("id", ad.id);
            ad.payment_status = "failed";
            ad.payment_message = q.description || "Payment cancelled.";
          }
        } catch (err) {
          console.error("[ads] stk query error", err);
        }
      }
    }

    const { id: _id, checkout_request_id: _c, ...safe } = ad;
    return { ok: true as const, ad: safe };
  });
