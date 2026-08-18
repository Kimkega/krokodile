import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatKes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { toast } from "sonner";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  material: string | null;
  product_images?: { url: string; sort_order: number }[];
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const image = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;

  return (
    <article className="group relative">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative">
          <SmartImage path={image} alt={product.name} />
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
            <span className="absolute left-3 top-3 rounded-full bg-gold-gradient px-3 py-1 text-[9px] tracking-luxe text-accent-foreground">
              Offer
            </span>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-[9px] tracking-luxe text-muted-foreground">{product.material ?? "Leather"}</p>
          <h3 className="font-display text-xl leading-tight">{product.name}</h3>
          <p className="text-sm text-foreground/80">{formatKes(product.price)}</p>
        </div>
      </Link>
      <button
        onClick={() => {
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: Number(product.price),
            image,
          });
          toast.success(`${product.name} added to your selection`);
        }}
        aria-label={`Add ${product.name} to cart`}
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-gold transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        <Plus className="size-4" />
      </button>
    </article>
  );
}
