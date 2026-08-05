import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { verifyCertificate } from "@/lib/verify.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/verify")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify Your KROKO DILE Bag — Authenticity Check" },
      {
        name: "description",
        content: "Scan or type the certificate code on your KROKO DILE card to confirm your bag is genuine.",
      },
      { property: "og:title", content: "Verify Your KROKO DILE Bag" },
      { property: "og:description", content: "Confirm authenticity with your certificate code or QR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verify,
});

type Result = Awaited<ReturnType<typeof verifyCertificate>>;

function Verify() {
  const { code: initial } = Route.useSearch();
  const verify = useServerFn(verifyCertificate);
  const [code, setCode] = useState(initial ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      setResult(await verify({ data: { code: value } }));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initial) void run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-4xl">Verify authenticity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the code on the gold card that came with your bag, or scan its QR.
        </p>

        <div className="mt-6 flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KD-XXXX-XXXX" />
          <Button className="bg-gold-gradient text-accent-foreground" disabled={busy} onClick={() => void run(code)}>
            Verify
          </Button>
        </div>

        {result && (
          <div className="mt-8 rounded-sm border border-border p-6 text-left">
            {result.ok ? (
              <>
                <p className="flex items-center gap-2 font-display text-2xl text-success">
                  <BadgeCheck className="size-6" /> Genuine KROKO DILE
                </p>
                <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <div>Code: {result.certificate.code}</div>
                  {result.certificate.serial && <div>Serial: {result.certificate.serial}</div>}
                  {result.certificate.productName && <div>Piece: {result.certificate.productName}</div>}
                  <div>Issued: {new Date(result.certificate.issuedAt).toLocaleDateString()}</div>
                  <div>Verified {result.certificate.scans} time(s)</div>
                </dl>
              </>
            ) : (
              <p className="flex items-center gap-2 font-display text-2xl text-destructive">
                <ShieldAlert className="size-6" /> {result.message}
              </p>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
