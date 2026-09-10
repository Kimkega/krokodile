import { useFaqs } from "@/hooks/useSeo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Customer questions — also emitted as FAQPage structured data for rich results. */
export function FaqSection() {
  const faqs = useFaqs();
  if (faqs.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
      <p className="text-[10px] tracking-luxe text-muted-foreground">Good to know</p>
      <h2 className="mt-2 font-display text-3xl sm:text-4xl">Questions we hear most</h2>

      <Accordion type="single" collapsible className="mt-8">
        {faqs.map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
