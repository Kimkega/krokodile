import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { FloatingCartButton } from "@/components/cart/CartDrawer";
import { WhatsAppFab } from "@/components/WhatsAppFab";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingCartButton />
      <WhatsAppFab />
    </div>
  );
}
