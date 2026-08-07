import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import jsQR from "jsqr";
import { BadgeCheck, Camera, ShieldAlert, X } from "lucide-react";
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

  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const run = useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      setBusy(true);
      try {
        setResult(await verify({ data: { code: value } }));
      } finally {
        setBusy(false);
      }
    },
    [verify],
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = async () => {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("This browser cannot open the camera. Type the code instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
    } catch {
      setCamError("Camera permission was denied. Allow access, or type the code below.");
    }
  };

  // Attach the stream once the <video> is mounted, then poll frames for a QR.
  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    void video.play().catch(() => undefined);

    const tick = () => {
      const canvas = canvasRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
            if (found?.data) {
              stopCamera();
              setCode(found.data);
              void run(found.data);
              return;
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, run, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (initial) void run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const cert = result?.ok ? result.certificate : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-4xl">Verify authenticity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan the QR on your gold card, or type the code printed beneath it.
        </p>

        {scanning ? (
          <div className="relative mt-6 overflow-hidden rounded-sm border border-accent/50 bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-8 rounded-sm border-2 border-accent/80" />
            <canvas ref={canvasRef} className="hidden" />
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2"
              onClick={stopCamera}
              aria-label="Stop scanning"
            >
              <X className="size-4" />
            </Button>
            <p className="absolute bottom-2 left-0 right-0 text-[10px] tracking-luxe text-white/80">
              Hold the QR steady inside the frame
            </p>
          </div>
        ) : (
          <Button variant="outline" className="mt-6 w-full" onClick={() => void startCamera()}>
            <Camera className="mr-2 size-4" /> Scan QR with camera
          </Button>
        )}
        {camError && <p className="mt-2 text-xs text-destructive">{camError}</p>}

        <div className="mt-4 flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KD-XXXX-XXXX" />
          <Button className="bg-gold-gradient text-accent-foreground" disabled={busy} onClick={() => void run(code)}>
            Verify
          </Button>
        </div>

        {result && (
          <div className="mt-8 rounded-sm border border-border p-6 text-left">
            {cert ? (
              <>
                <p className="flex items-center gap-2 font-display text-2xl text-success">
                  <BadgeCheck className="size-6" /> Genuine KROKO DILE
                </p>
                <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <div>Code: {cert.code}</div>
                  {cert.serial && <div>Serial: {cert.serial}</div>}
                  {cert.productName && <div>Piece: {cert.productName}</div>}
                  {cert.buyerName && <div>Buyer: {cert.buyerName}</div>}
                  {cert.orderCode && <div>Order: {cert.orderCode}</div>}
                  {cert.paidAt && <div>Paid: {new Date(cert.paidAt).toLocaleDateString("en-KE")}</div>}
                  <div>Issued: {new Date(cert.issuedAt).toLocaleDateString("en-KE")}</div>
                  <div>Verified {cert.scans} time(s)</div>
                </dl>
              </>
            ) : (
              <p className="flex items-center gap-2 font-display text-2xl text-destructive">
                <ShieldAlert className="size-6" /> {!result.ok && result.message}
              </p>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
