/**
 * Links we hand to customers (repay links, WhatsApp messages, QR codes) must
 * always point at the domain the shop is actually being served from — Lovable
 * preview, Vercel, or the store's own domain. Reading window.location keeps
 * that correct everywhere without any per-host configuration.
 */
export function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/+$/, "");
}

export function orderUrl(code: string): string {
  return `${siteOrigin()}/order/${code}`;
}

export function verifyUrl(code?: string): string {
  return `${siteOrigin()}/verify${code ? `?code=${encodeURIComponent(code)}` : ""}`;
}
