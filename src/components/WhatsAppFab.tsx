import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { normalizePhone } from "@/lib/format";

export function whatsappLink(number: string | null | undefined, message: string) {
  if (!number) return null;
  return `https://wa.me/${normalizePhone(number)}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppFab() {
  const s = useSiteSettings();
  const href = whatsappLink(
    s?.whatsapp_number,
    `Hello ${s?.site_name ?? "KROKO DILE"}, I would like to ask about your bags.`,
  );
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-success text-primary-foreground shadow-lux transition-transform hover:scale-110"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
