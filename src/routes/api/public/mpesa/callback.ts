import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });
        }

        const body = payload["Body"] as Record<string, unknown> | undefined;
        const stk = body?.["stkCallback"] as Record<string, unknown> | undefined;
        if (!stk) return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });

        const checkoutRequestId = String(stk["CheckoutRequestID"] ?? "");
        const resultCode = String(stk["ResultCode"] ?? "");
        const resultDesc = String(stk["ResultDesc"] ?? "");
        if (!checkoutRequestId) return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });

        const metadata = (stk["CallbackMetadata"] as { Item?: Array<{ Name: string; Value: unknown }> })?.Item ?? [];
        const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("checkout_request_id", checkoutRequestId)
          .maybeSingle();
        if (!order) return Response.json({ ResultCode: 0, ResultDesc: "Unknown order" });

        const paid = resultCode === "0";
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: paid ? "paid" : "failed",
            status: paid ? "paid" : order.status,
            payment_message: resultDesc,
            mpesa_receipt: receipt ? String(receipt) : null,
          })
          .eq("id", order.id);

        await supabaseAdmin.from("order_events").insert({
          order_id: order.id,
          status: paid ? "paid" : "failed",
          note: resultDesc,
        });

        return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      },
    },
  },
});
