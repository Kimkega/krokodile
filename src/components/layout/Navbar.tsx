import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { mediaUrl } from "@/lib/media";
import logo from "@/assets/kroko-logo.png";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { count, setOpen } = useCart();
  const settings = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, slug")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const links = [
    { to: "/shop", label: "All bags", search: undefined },
    ...(categories ?? []).map((c) => ({ to: "/shop", label: c.name, search: { category: c.slug } })),
    { to: "/track", label: "Track order", search: undefined },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          className="lg:hidden text-foreground"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link to="/" className="flex items-center gap-3">
          <img
            src={settings?.logo_url ? mediaUrl(settings.logo_url) : logo}
            alt={`${settings?.site_name ?? "KROKO DILE"} logo`}
            className="h-11 w-11 rounded-full object-contain bg-cocoa-gradient p-1 shadow-gold"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-[0.22em] text-foreground">
              {settings?.site_name ?? "KROKO DILE"}
            </span>
            <span className="mt-1 text-[9px] tracking-luxe text-muted-foreground">
              {settings?.tagline ?? "Fine leather · Nairobi"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              search={l.search as never}
              className="text-[11px] tracking-luxe text-muted-foreground transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/shop"
            className="hidden size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-accent sm:flex"
            aria-label="Search the collection"
          >
            <Search className="size-4" />
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
            aria-label="Open cart"
          >
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold-gradient text-[10px] font-semibold text-accent-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/60 bg-background lg:hidden",
          mobileOpen ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-5 py-3">
          {links.map((l) => (
            <Link
              key={`m-${l.label}`}
              to={l.to}
              search={l.search as never}
              onClick={() => setMobileOpen(false)}
              className="py-2 text-xs tracking-luxe text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
