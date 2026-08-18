import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";

/**
 * Product photography arrives in every shape imaginable. Instead of cropping,
 * we letterbox the real image over a blurred copy of itself — nothing is cut
 * off, every tile stays the same size, and it scales with the viewport.
 */
export function SmartImage({
  path,
  alt,
  className,
  ratio = "aspect-4/5",
  eager = false,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  ratio?: string;
  eager?: boolean;
}) {
  const src = mediaUrl(path);
  if (!src) {
    return <div className={cn("croc-texture rounded-sm bg-cocoa-gradient", ratio, className)} />;
  }
  return (
    <div className={cn("relative overflow-hidden rounded-sm bg-secondary", ratio, className)}>
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-xl"
      />
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="relative size-full object-contain transition-transform duration-700 group-hover:scale-105"
      />
    </div>
  );
}
