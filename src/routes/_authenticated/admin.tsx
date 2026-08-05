import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  LayoutDashboard,
  Layers,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  Receipt,
  Smartphone,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/kroko-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — KROKO DILE" },
      { name: "description", content: "Manage KROKO DILE orders, products, couriers and M-Pesa settings." },
      { property: "og:title", content: "Admin Dashboard — KROKO DILE" },
      { property: "og:description", content: "Internal dashboard for the KROKO DILE store." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: Receipt },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Layers },
  { to: "/admin/couriers", label: "Couriers", icon: Truck },
  { to: "/admin/ads", label: "Adverts", icon: Megaphone },
  { to: "/admin/certificates", label: "Authenticity", icon: BadgeCheck },
  { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/admin/branding", label: "Branding", icon: Palette },
  { to: "/admin/mpesa", label: "M-Pesa", icon: Smartphone },
] as const;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-cocoa-gradient transition-[width] duration-300 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <img src={logoAsset.url} alt="KROKO DILE" className="size-8 shrink-0" />
          {!collapsed && (
            <span className="font-display text-lg leading-none text-gold-gradient">KROKO DILE</span>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2 text-xs tracking-luxe transition-colors",
                  active
                    ? "bg-gold-gradient text-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
                title={item.label}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="m-3 flex items-center justify-center gap-2 rounded-sm border border-sidebar-border py-2 text-[10px] tracking-luxe text-sidebar-foreground/70"
        >
          <ChevronLeft className={cn("size-3 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <p className="font-display text-xl">Admin</p>
          <Link to="/" className="text-[10px] tracking-luxe text-accent">
            View storefront
          </Link>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] tracking-luxe",
                  active ? "border-accent bg-gold-gradient text-accent-foreground" : "border-border",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
