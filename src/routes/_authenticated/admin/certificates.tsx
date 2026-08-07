import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCertificatePdf } from "@/lib/pdf-cards";
import { siteOrigin, verifyUrl } from "@/lib/site-url";

export const Route = createFileRoute("/_authenticated/admin/certificates")({
  component: AdminCertificates,
});

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const rand = (n: number) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

function AdminCertificates() {
  const qc = useQueryClient();
  const [productName, setProductName] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [qty, setQty] = useState("1");
  const [qrs, setQrs] = useState<{ code: string; dataUrl: string; productName: string | null }[]>([]);

  const { data: certs } = useQuery({
    queryKey: ["admin", "certificates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("code, serial, product_name, issued_to, status, scans, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const origin = siteOrigin();

  const downloadQrPng = async (code: string) => {
    const dataUrl = await QRCode.toDataURL(verifyUrl(code), { margin: 1, width: 1024 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${code}-qr.png`;
    a.click();
  };

  const downloadPdf = async (rows: { code: string; serial?: string | null; product_name?: string | null; issued_to?: string | null }[]) => {
    if (!rows.length) return;
    await downloadCertificatePdf(
      rows.map((r) => ({
        code: r.code,
        serial: r.serial ?? null,
        productName: r.product_name ?? null,
        issuedTo: r.issued_to ?? null,
      })),
      { brand: "KROKO DILE", origin },
    );
    toast.success(rows.length === 1 ? "Card PDF downloaded" : `${rows.length} cards downloaded`);
  };


  const generate = async () => {
    const count = Math.min(50, Math.max(1, Number(qty) || 1));
    const rows = Array.from({ length: count }, (_, i) => ({
      code: `KD-${rand(4)}-${rand(4)}`,
      serial: `${new Date().getFullYear()}-${String(Date.now()).slice(-5)}-${i + 1}`,
      product_name: productName || null,
      issued_to: issuedTo || null,
    }));
    const { error } = await supabase.from("certificates").insert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    const made = await Promise.all(
      rows.map(async (r) => ({
        code: r.code,
        productName: r.product_name,
        dataUrl: await QRCode.toDataURL(`${origin}/verify?code=${r.code}`, { margin: 1, width: 320 }),
      })),
    );
    setQrs(made);
    toast.success(`${count} certificate${count === 1 ? "" : "s"} generated`);
    void qc.invalidateQueries({ queryKey: ["admin", "certificates"] });
  };

  useEffect(() => {
    if (qrs.length) window.scrollTo({ top: 400, behavior: "smooth" });
  }, [qrs.length]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Authenticity certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a unique code + QR per bag. Print the card, tuck it in the dust bag — customers scan it at
          /verify to confirm the piece is a genuine KROKO DILE.
        </p>
      </div>

      <div className="grid gap-3 rounded-sm border border-border p-4 md:grid-cols-4">
        <Input placeholder="Product name" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <Input placeholder="Issued to (optional)" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} />
        <Input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button className="bg-gold-gradient text-accent-foreground" onClick={() => void generate()}>
          Generate
        </Button>
      </div>

      {qrs.length > 0 && (
        <div className="space-y-3 print:space-y-0">
          <div className="flex flex-wrap gap-3 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print cards
            </Button>
            <Button
              className="bg-gold-gradient text-accent-foreground"
              onClick={() =>
                void downloadPdf(qrs.map((q) => ({ code: q.code, product_name: q.productName })))
              }
            >
              <FileDown className="mr-2 size-4" /> Download {qrs.length} card PDF
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qrs.map((q) => (
              <div key={q.code} className="rounded-sm border border-border bg-card p-5 text-center">
                <p className="font-display text-xl text-gold-gradient">KROKO DILE</p>
                <p className="text-[9px] tracking-luxe text-muted-foreground">Certificate of authenticity</p>
                <img src={q.dataUrl} alt={`QR for ${q.code}`} className="mx-auto my-3 size-32" />
                <p className="font-mono text-sm">{q.code}</p>
                {q.productName && <p className="text-xs text-muted-foreground">{q.productName}</p>}
                <p className="mt-2 text-[9px] text-muted-foreground">Verify at {origin}/verify</p>
                <div className="mt-3 flex justify-center gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={() => void downloadQrPng(q.code)}>
                    <Download className="mr-1.5 size-3" /> QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void downloadPdf([{ code: q.code, product_name: q.productName }])}
                  >
                    <FileDown className="mr-1.5 size-3" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display text-2xl">Issued certificates</h2>
        <Button variant="outline" size="sm" disabled={!certs?.length} onClick={() => void downloadPdf(certs ?? [])}>
          <FileDown className="mr-2 size-4" /> Download all as PDF
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border print:hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[10px] tracking-luxe text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Issued to</th>
              <th className="px-4 py-3">Scans</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            {certs?.map((c) => (
              <tr key={c.code} className="border-t border-border">
                <td className="px-4 py-3 font-mono">{c.code}</td>
                <td className="px-4 py-3">{c.serial}</td>
                <td className="px-4 py-3">{c.product_name}</td>
                <td className="px-4 py-3">{c.issued_to}</td>
                <td className="px-4 py-3">{c.scans}</td>
                <td className="px-4 py-3">{c.status}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => void downloadQrPng(c.code)}>
                      <Download className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void downloadPdf([c])}>
                      <FileDown className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
