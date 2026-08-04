import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Mail, Phone } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function Footer() {
  const s = useSiteSettings();
  return (
    <footer className="mt-24 bg-cocoa-gradient text-sidebar-foreground">
      <div className="croc-texture">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="font-display text-3xl text-gold-gradient">{s?.site_name ?? "KROKO DILE"}</h3>
            <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">
              {s?.tagline ??
                "Hand-finished luxury bags for men and women. Crafted in Kenya, carried everywhere."}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-luxe text-sidebar-primary">Shop</p>
            <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/75">
              <li>
                <Link to="/shop">All bags</Link>
              </li>
              <li>
                <Link to="/track">Track an order</Link>
              </li>
              <li>
                <Link to="/auth">Admin login</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-luxe text-sidebar-primary">Reach us</p>
            <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/75">
              {s?.contact_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-3.5" /> {s.contact_phone}
                </li>
              )}
              {s?.contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-3.5" /> {s.contact_email}
                </li>
              )}
              <li className="flex gap-3 pt-2">
                {s?.instagram_url && (
                  <a href={s.instagram_url} aria-label="Instagram" target="_blank" rel="noreferrer">
                    <Instagram className="size-4" />
                  </a>
                )}
                {s?.facebook_url && (
                  <a href={s.facebook_url} aria-label="Facebook" target="_blank" rel="noreferrer">
                    <Facebook className="size-4" />
                  </a>
                )}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-sidebar-border px-6 py-5 text-center text-[10px] tracking-luxe text-sidebar-foreground/50">
          © {new Date().getFullYear()} {s?.site_name ?? "KROKO DILE"} · Nairobi, Kenya
        </div>
      </div>
    </footer>
  );
}
