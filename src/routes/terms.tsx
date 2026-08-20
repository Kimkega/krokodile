import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/SiteShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms, Privacy & Delivery Policy — KROKO DILE" },
      {
        name: "description",
        content:
          "KROKO DILE terms of sale, M-Pesa payment terms, delivery and returns policy, authenticity guarantee and privacy policy for customers in Kenya.",
      },
      { property: "og:title", content: "Terms & Policies — KROKO DILE" },
      {
        property: "og:description",
        content: "Read our terms of sale, payment, delivery, returns, authenticity and privacy policies.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

const SECTIONS = [
  {
    id: "terms",
    title: "1. Terms of sale",
    body: [
      "By placing an order on this website you agree to these terms. Prices are shown in Kenya Shillings (KES) and include VAT where applicable. Shipping is charged separately and shown before you pay.",
      "An order is only confirmed once payment is received and a receipt with an order code is generated. We may cancel and refund an order if an item is out of stock, mispriced, or if we cannot verify the payment.",
      "Product photographs are taken in natural light. Because every bag is hand-finished from natural leather, small variations in grain, tone and stitching are normal and are not defects.",
    ],
  },
  {
    id: "payment",
    title: "2. Payment (M-Pesa Express)",
    body: [
      "Payments are collected through M-Pesa Express (STK push). When you check out, a prompt is sent to the phone number you provide; approve it with your M-Pesa PIN to complete payment.",
      "If the prompt is cancelled, times out, or fails for insufficient balance, your order is kept as unpaid. You can complete it later from your receipt page or the Track page using the retry payment button — the payment link always points back to this same website.",
      "We never ask for your M-Pesa PIN by phone, SMS or WhatsApp. Any such request is fraudulent.",
    ],
  },
  {
    id: "delivery",
    title: "3. Delivery & shipping",
    body: [
      "We deliver to every county, sub-county and ward in Kenya through our courier and matatu SACCO partners. The shipping fee is calculated from the county you select at checkout.",
      "Nairobi deliveries typically arrive within 24-48 hours. Upcountry deliveries typically take 2-4 working days. Delays caused by courier operations, weather or incorrect address details are outside our control.",
      "Every dispatched order has a printed delivery note signed by our in-house team, the courier and the recipient. Courier contact details are shown on your tracking page once your order is assigned.",
    ],
  },
  {
    id: "returns",
    title: "4. Returns & exchanges",
    body: [
      "Unused items in their original packaging, with the authenticity card intact, may be exchanged within 7 days of delivery. Contact us with your order code to arrange it.",
      "Items damaged by use, water, heat or third-party repair are not eligible. Custom or personalised pieces are final sale.",
      "Where a refund is approved, it is returned to the M-Pesa number that made the payment within 7 working days.",
    ],
  },
  {
    id: "authenticity",
    title: "5. Authenticity guarantee",
    body: [
      "Every bag ships with a unique authenticity certificate (a KD- code and QR card) bound to your order, name and payment date. Scan the QR or enter the code on our Verify page to confirm it.",
      "Certificate codes are single-issue. If a code shows as already assigned to a different buyer, or shows as void, the item did not come from us — contact us immediately.",
    ],
  },
  {
    id: "ads",
    title: "6. Advertising placements",
    body: [
      "Adverts purchased on this website are subject to approval. We may reject or remove any advert that is unlawful, misleading, or inconsistent with the brand, and will refund the unused portion of the placement.",
      "Advertiser contact details are never displayed publicly; only the approved advert artwork and text appear on the site.",
    ],
  },
  {
    id: "privacy",
    title: "7. Privacy policy",
    body: [
      "We collect only what is needed to fulfil your order: name, email, phone number and delivery address. Payment is processed by Safaricom M-Pesa; we store only the receipt reference, never your PIN or full M-Pesa profile.",
      "Your details are shared with the assigned courier for delivery, and with our email provider for order notifications. We do not sell or rent personal data to anyone.",
      "Order data is retained for accounting and warranty purposes. You may request correction or deletion of your personal data by contacting us with your order code; we will act within 30 days as provided by the Data Protection Act, 2019 (Kenya).",
    ],
  },
  {
    id: "cookies",
    title: "8. Cookies & local storage",
    body: [
      "We use local storage to remember your cart between visits and, for staff, to keep an admin session signed in. We do not use third-party advertising trackers.",
    ],
  },
  {
    id: "liability",
    title: "9. Liability & governing law",
    body: [
      "Our liability for any order is limited to the amount you paid for that order. Nothing in these terms limits rights you have under Kenyan consumer law.",
      "These terms are governed by the laws of Kenya and disputes are subject to the courts of Kenya.",
    ],
  },
];

function Terms() {
  const s = useSiteSettings();
  const updated = "20 August 2026";

  return (
    <SiteShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Terms & Policies",
          description: "Terms of sale, payment, delivery, returns, authenticity and privacy policy.",
          dateModified: "2026-08-20",
          publisher: { "@type": "Organization", name: s?.site_name ?? "KROKO DILE" },
        }}
      />

      <section className="bg-cocoa-gradient">
        <div className="croc-texture-soft">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <p className="text-[10px] tracking-luxe text-sidebar-primary">Legal</p>
            <h1 className="mt-3 font-display text-4xl text-sidebar-foreground sm:text-5xl">
              Terms &amp; <span className="text-gold-gradient">Policies</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-sidebar-foreground/75">
              Everything that governs buying, paying, receiving and verifying a {s?.site_name ?? "KROKO DILE"}{" "}
              piece. Last updated {updated}.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[220px_1fr]">
        <nav className="h-max lg:sticky lg:top-24">
          <p className="text-[10px] tracking-luxe text-muted-foreground">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="text-muted-foreground transition-colors hover:text-accent">
                  {sec.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 space-y-10">
          {SECTIONS.map((sec) => (
            <section key={sec.id} id={sec.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl">{sec.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {sec.body.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-sm border border-border p-5">
            <h2 className="font-display text-2xl">10. Contact</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {s?.contact_email && <li>Email: {s.contact_email}</li>}
              {s?.contact_phone && <li>Phone: {s.contact_phone}</li>}
              {s?.whatsapp_number && <li>WhatsApp: +{s.whatsapp_number}</li>}
              <li>Nairobi, Kenya</li>
            </ul>
          </section>
        </article>
      </div>
    </SiteShell>
  );
}
