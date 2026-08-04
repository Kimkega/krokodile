export function formatKes(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export function isValidKenyanPhone(input: string): boolean {
  const p = normalizePhone(input);
  return /^254(7|1)\d{8}$/.test(p);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Awaiting payment",
    paid: "Payment received",
    packed: "Packed",
    assigned: "Assigned to courier",
    in_transit: "In transit",
    delivered: "Delivered",
    cancelled: "Cancelled",
    failed: "Payment failed",
  };
  return map[status] ?? status;
}

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "packed",
  "assigned",
  "in_transit",
  "delivered",
  "cancelled",
] as const;
