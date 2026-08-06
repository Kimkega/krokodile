import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatKes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export type ShowcaseItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
};

/**
 * Interactive 3D carousel of featured pieces. Drag (or swipe) to spin, it
 * auto-rotates when idle. Sizing is fully responsive and it never overflows
 * its section.
 */
export function Hero3DCarousel({ items }: { items: ShowcaseItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [radius, setRadius] = useState(280);
  const [tileW, setTileW] = useState(180);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const velocity = useRef(0.12);

  const count = Math.max(items.length, 1);
  const step = 360 / count;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const tile = Math.max(120, Math.min(220, w * 0.42));
      setTileW(tile);
      // Keep every tile inside the stage regardless of how many pieces there are.
      setRadius(Math.max(tile * 0.9, tile / (2 * Math.tan(Math.PI / Math.max(count, 3)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  useEffect(() => {
    if (dragging || items.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setAngle((a) => a + velocity.current * (dt / 16));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging, items.length]);

  if (items.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-lg touch-pan-y select-none"
      style={{ perspective: "1100px" }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: angle };
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setAngle(drag.current.start + (e.clientX - drag.current.x) * 0.35);
      }}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
    >
      <div
        className="relative mx-auto"
        style={{
          height: tileW * 1.5,
          transformStyle: "preserve-3d",
          transform: `rotateX(-8deg) rotateY(${angle}deg)`,
          transition: dragging ? "none" : "transform 60ms linear",
        }}
      >
        {items.map((item, i) => {
          const itemAngle = i * step;
          return (
            <Link
              key={item.id}
              to="/product/$slug"
              params={{ slug: item.slug }}
              draggable={false}
              onClick={(e) => {
                if (dragging) e.preventDefault();
              }}
              className="absolute left-1/2 top-1/2 block"
              style={{
                width: tileW,
                marginLeft: -tileW / 2,
                marginTop: (-tileW * 1.25) / 2,
                transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                transformStyle: "preserve-3d",
              }}
            >
              <div className="group relative overflow-hidden rounded-lg border border-sidebar-primary/30 bg-cocoa-gradient shadow-[0_28px_60px_-18px_rgba(0,0,0,0.8)]">
                <div className="relative" style={{ height: tileW * 1.25 }}>
                  {item.image ? (
                    <img
                      src={mediaUrl(item.image)}
                      alt={item.name}
                      draggable={false}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="croc-texture size-full bg-cocoa-gradient" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-white/10" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                    <p className="truncate font-display text-base text-sidebar-foreground">{item.name}</p>
                    <p className="text-[10px] tracking-luxe text-sidebar-primary">{formatKes(item.price)}</p>
                  </div>
                </div>
              </div>
              {/* glass floor reflection */}
              <div
                className="pointer-events-none mt-1 overflow-hidden rounded-lg opacity-25"
                style={{ height: tileW * 0.35, transform: "scaleY(-1)", maskImage: "linear-gradient(to top, transparent, black)" }}
              >
                {item.image && (
                  <img src={mediaUrl(item.image)} alt="" draggable={false} className="size-full object-cover" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[9px] tracking-luxe text-sidebar-foreground/50">
        Drag to spin · tap a piece to open
      </p>
    </div>
  );
}
