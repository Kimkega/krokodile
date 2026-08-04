import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatKes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export function CartDrawer() {
  const { items, open, setOpen, setQuantity, remove, subtotal, count } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your selection ({count})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {items.length === 0 && (
            <p className="pt-10 text-center text-sm text-muted-foreground">
              Your cart is empty. The collection awaits.
            </p>
          )}
          {items.map((item) => (
            <div key={item.productId} className="flex gap-3 border-b border-border pb-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                {item.image && (
                  <img src={mediaUrl(item.image)} alt={item.name} className="size-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-display text-lg leading-tight">{item.name}</p>
                <p className="text-sm text-muted-foreground">{formatKes(item.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    aria-label="Decrease quantity"
                    className="flex size-7 items-center justify-center rounded border border-border"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    className="flex size-7 items-center justify-center rounded border border-border"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    aria-label="Remove item"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.productId)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex justify-between text-sm">
            <span className="tracking-luxe text-muted-foreground">Subtotal</span>
            <span className="font-display text-xl">{formatKes(subtotal)}</span>
          </div>
          <Button
            className="w-full bg-gold-gradient text-accent-foreground shadow-gold hover:opacity-90"
            disabled={items.length === 0}
            onClick={() => {
              setOpen(false);
              navigate({ to: "/checkout" });
            }}
          >
            <ShoppingBag className="mr-2 size-4" /> Checkout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FloatingCartButton() {
  const { count, setOpen, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-full bg-cocoa-gradient px-5 py-3 text-sidebar-foreground shadow-lux transition-transform hover:scale-105"
    >
      <span className="relative">
        <ShoppingBag className="size-5 text-accent" />
        <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-gold-gradient text-[9px] font-bold text-accent-foreground">
          {count}
        </span>
      </span>
      <span className="text-xs tracking-luxe">{formatKes(subtotal)}</span>
    </button>
  );
}
