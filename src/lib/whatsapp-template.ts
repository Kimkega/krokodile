import { formatKes, orderStatusLabel } from "@/lib/format";

export type OrderPayload = {
  site_name: string;
  order_code: string;
  customer_name: string;
  phone: string;
  email: string;
  items: { name: string; quantity: number; unit_price: number }[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  address: string;
  payment_status: string;
  mpesa_receipt: string;
  status: string;
  courier: string;
  tracking_ref: string;
};

export const DEFAULT_WHATSAPP_TEMPLATE = `Hello {{site_name}}!
Order: {{order_code}}
Name: {{customer_name}}
Items:
{{items}}
Total: {{total}}
Deliver to: {{address}}
Payment: {{payment_status}} {{mpesa_receipt}}
Status: {{status}}`;

export const TEMPLATE_TOKENS = [
  "site_name",
  "order_code",
  "customer_name",
  "phone",
  "email",
  "items",
  "subtotal",
  "shipping_fee",
  "total",
  "address",
  "payment_status",
  "mpesa_receipt",
  "status",
  "courier",
  "tracking_ref",
] as const;

export const SAMPLE_ORDER: OrderPayload = {
  site_name: "KROKO DILE",
  order_code: "KD-7QX4M2",
  customer_name: "Amina Wanjiru",
  phone: "254712345678",
  email: "amina@example.com",
  items: [
    { name: "Croc Weekender", quantity: 1, unit_price: 18500 },
    { name: "Gold Clasp Clutch", quantity: 2, unit_price: 7400 },
  ],
  subtotal: 33300,
  shipping_fee: 350,
  total: 33650,
  address: "Kilimani, Dagoretti North, Nairobi",
  payment_status: "paid",
  mpesa_receipt: "SLK4TR9QW1",
  status: "in_transit",
  courier: "G4S Courier",
  tracking_ref: "G4S-889321",
};

export function renderTemplate(template: string, order: OrderPayload): string {
  const values: Record<string, string> = {
    site_name: order.site_name,
    order_code: order.order_code,
    customer_name: order.customer_name,
    phone: order.phone,
    email: order.email,
    items: order.items
      .map((i) => `• ${i.name} x${i.quantity} — ${formatKes(i.unit_price * i.quantity)}`)
      .join("\n"),
    subtotal: formatKes(order.subtotal),
    shipping_fee: formatKes(order.shipping_fee),
    total: formatKes(order.total),
    address: order.address,
    payment_status: order.payment_status,
    mpesa_receipt: order.mpesa_receipt ? `(${order.mpesa_receipt})` : "",
    status: orderStatusLabel(order.status),
    courier: order.courier,
    tracking_ref: order.tracking_ref,
  };
  return (template || DEFAULT_WHATSAPP_TEMPLATE).replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_m, key: string) => values[key] ?? "",
  );
}
