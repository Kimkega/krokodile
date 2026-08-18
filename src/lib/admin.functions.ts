import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const statusSchema = z.object({
  orderCode: z.string().trim().min(3).max(20),
  status: z.enum(["pending", "paid", "packed", "assigned", "in_transit", "delivered", "cancelled"]),
  note: z.string().trim().max(300).optional().default(""),
  courierId: z.string().uuid().nullable().optional(),
  trackingRef: z.string().trim().max(80).optional().default(""),
  courierContact: z.string().trim().max(200).optional().default(""),
  notifyEmail: z.boolean().optional().default(true),
});

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const updateOrderProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      status: string;
      courier_id?: string | null;
      tracking_ref?: string;
      courier_contact?: string;
    } = { status: data.status };
    if (data.courierId !== undefined) patch.courier_id = data.courierId;
    if (data.trackingRef) patch.tracking_ref = data.trackingRef;
    if (data.courierContact) patch.courier_contact = data.courierContact;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("order_code", data.orderCode.toUpperCase())
      .select(
        "id, order_code, customer_name, phone, email, status, payment_status, mpesa_receipt, subtotal, shipping_fee, total, county, sub_county, ward, town, tracking_ref, courier_contact, couriers(name)",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return { ok: false as const, message: "Order not found." };

    await supabaseAdmin
      .from("order_events")
      .insert({ order_id: order.id, status: data.status, note: data.note || null });

    let emailed = false;
    if (data.notifyEmail) {
      const { sendOrderEmail, STATUS_EMAIL } = await import("./notify.server");
      const key = STATUS_EMAIL[data.status];
      if (key) emailed = (await sendOrderEmail(key, order.id)).sent;
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("name, unit_price, quantity")
      .eq("order_id", order.id);

    const { id: _id, ...safeOrder } = order;
    return {
      ok: true as const,
      emailed,
      order: safeOrder,
      items: (items ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
      })),
    };
  });

/** Saves the courier contact block that customers see when they track. */
export const saveCourierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderCode: z.string().trim().min(3).max(20),
        courierContact: z.string().trim().max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ courier_contact: data.courierContact })
      .eq("order_code", data.orderCode.toUpperCase());
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Full data needed to print a delivery note for one or many orders. */
export const getDeliveryNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderCodes: z.array(z.string().trim().min(3).max(20)).min(1).max(40) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codes = data.orderCodes.map((c) => c.toUpperCase());

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, delivery_note_no, customer_name, phone, email, county, sub_county, ward, town, address_notes, subtotal, shipping_fee, total, status, payment_status, mpesa_receipt, tracking_ref, courier_contact, created_at, couriers(name, phone)",
      )
      .in("order_code", codes);

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("site_name, contact_phone, contact_email, courier_contact_note")
      .limit(1)
      .maybeSingle();

    const rows = orders ?? [];
    // Assign a stable, human-readable delivery note number the first time one is printed.
    for (const o of rows) {
      if (!o.delivery_note_no) {
        const noteNo = `DN-${new Date().getFullYear()}-${o.order_code.replace(/^KD-/, "")}`;
        await supabaseAdmin.from("orders").update({ delivery_note_no: noteNo }).eq("id", o.id);
        o.delivery_note_no = noteNo;
      }
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("order_id, name, quantity, unit_price")
      .in(
        "order_id",
        rows.map((o) => o.id),
      );

    const { data: certificates } = await supabaseAdmin
      .from("certificates")
      .select("order_id, code, product_name")
      .in(
        "order_id",
        rows.map((o) => o.id),
      );

    return {
      ok: true as const,
      settings: settings ?? null,
      notes: rows.map(({ id, ...rest }) => ({
        ...rest,
        items: (items ?? [])
          .filter((i) => i.order_id === id)
          .map((i) => ({ name: i.name, quantity: i.quantity, unit_price: Number(i.unit_price) })),
        certificates: (certificates ?? [])
          .filter((c) => c.order_id === id)
          .map((c) => ({ code: c.code, product_name: c.product_name })),
      })),
    };
  });

/** All orders that are still moving — used for the active-orders board. */
export const listActiveOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("orders")
      .select(
        "order_code, customer_name, phone, total, status, payment_status, tracking_ref, courier_contact, county, sub_county, town, created_at, couriers(name, phone)",
      )
      .not("status", "in", "(delivered,cancelled)")
      .order("created_at", { ascending: false })
      .limit(200);
    return { ok: true as const, orders: data ?? [] };
  });
