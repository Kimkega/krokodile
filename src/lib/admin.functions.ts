import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const statusSchema = z.object({
  orderCode: z.string().trim().min(3).max(20),
  status: z.enum(["pending", "paid", "packed", "assigned", "in_transit", "delivered", "cancelled"]),
  note: z.string().trim().max(300).optional().default(""),
  courierId: z.string().uuid().nullable().optional(),
  trackingRef: z.string().trim().max(80).optional().default(""),
});

export const updateOrderProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.courierId !== undefined) patch["courier_id"] = data.courierId;
    if (data.trackingRef) patch["tracking_ref"] = data.trackingRef;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("order_code", data.orderCode.toUpperCase())
      .select(
        "id, order_code, customer_name, phone, email, status, payment_status, mpesa_receipt, subtotal, shipping_fee, total, county, sub_county, ward, town, tracking_ref, couriers(name)",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return { ok: false as const, message: "Order not found." };

    await supabaseAdmin
      .from("order_events")
      .insert({ order_id: order.id, status: data.status, note: data.note || null });

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("name, unit_price, quantity")
      .eq("order_id", order.id);

    const { id: _id, ...safeOrder } = order;
    return {
      ok: true as const,
      order: safeOrder,
      items: (items ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
      })),
    };
  });
