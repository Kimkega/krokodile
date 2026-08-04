# KROKO DILE — Luxury Bags Store

A gold-and-dark-brown luxury leather goods store for men and women, with guest checkout, M-Pesa STK Push payments, order tracking, WhatsApp follow-up, Kenya-wide shipping selection, courier assignment, and a full admin dashboard.

## Look and feel

- Palette: deep dark brown (#2A1A0F base), antique gold (#C9A227 / #E8C87A highlights), warm ivory surfaces.
- Typography: high-contrast serif display for headings (luxury editorial), clean sans for body.
- Crocodile-scale texture motifs as subtle section dividers and card overlays; the uploaded KD logo used as the brand mark and favicon.
- Layout: full-bleed hero, editorial zigzag collections, uniform product card grid, sticky floating cart button with item count.

## Shopper experience

1. **Home** — hero, featured collections (Men / Women / dynamic categories), new arrivals, brand story.
2. **Shop** — filter by category, price, material; product detail with image gallery, sizes/variants, add to cart.
3. **Floating cart** — always-visible gold cart bubble opening a slide-over drawer with quantity edit and subtotal.
4. **Checkout (guest, no account needed)** — name, email, phone, then a cascading Kenya address picker: County → Sub-county → Ward → Town. Delivery notes and courier preference.
5. **Payment** — M-Pesa Express (STK Push) to the phone entered. The page polls payment status until success/failure/timeout, showing a live status card.
6. **Receipt** — mobile-sized (narrow, thermal-receipt styled) digital receipt with order code, items, totals, M-Pesa reference, and shipping address. Downloadable/printable.
7. **WhatsApp follow-up** — a button on the receipt opens WhatsApp with a pre-filled message containing the order code and purchased items, generated from the order JSON.
8. **Tracking** — public page where a buyer enters the email + phone number used at payment to see order status timeline (Paid → Packed → Assigned to courier → In transit → Delivered) with courier name and tracking reference.

## Admin dashboard

Password-protected admin area (email/password login, admin role stored in a separate roles table).

- **Orders** — list, filter by status, view detail, update status, assign courier + tracking reference.
- **Products** — create/edit with easy image upload (drag-and-drop, multi-image, reorder, first image = cover) into cloud storage.
- **Categories** — Men and Women seeded; admin can add/rename/remove any additional category.
- **Couriers** — pre-seeded Kenyan list (G4S, Wells Fargo, Fargo Courier, Sendy, Pickup Mtaani, Speedaf, DHL Kenya, Posta Kenya/EMS, plus matatu SACCO parcel services such as Easy Coach, Modern Coast, Guardian Angel, Super Metro, 2NK, Kukena, Nairobi–Mombasa SGR courier etc.); admin can add more.
- **Shipping zones** — set delivery fees per county/region.
- **M-Pesa configuration** — form for Paybill/Till, Shortcode, Passkey, Consumer Key, Consumer Secret, environment (sandbox/production), callback URL display. Secrets stored server-side, write-only in UI (masked once saved).
- **Site settings** — upload medium-size site logo, set website name, tagline, contact phone/email, WhatsApp number, and social links (Instagram, Facebook, TikTok, X). These drive the header, footer, and receipt branding.

## Technical notes

- Lovable Cloud (Postgres + auth + storage + server functions) backs the app.
- Tables: `products`, `product_images`, `categories`, `orders`, `order_items`, `payments`, `couriers`, `shipping_zones`, `site_settings`, `mpesa_config`, `user_roles`. RLS on all: public read for catalog/settings; orders readable only via a server-side tracking lookup that requires matching email + phone; admin-only writes via a `has_role()` security-definer function.
- Kenya geography (47 counties, sub-counties, wards, towns) seeded as reference tables via migration and served to the cascading checkout selector.
- M-Pesa: server functions for OAuth token, STK Push initiation, and a public `/api/public/mpesa/callback` route (signature/whitelist-checked) that writes the payment result. Client polls a status server function every ~3s up to ~2 minutes with clear timeout handling.
- M-Pesa credentials stored encrypted server-side and never exposed to the browser.
- WhatsApp deep link built as `https://wa.me/<number>?text=<encoded order summary>` from the order record.
- Receipts rendered as a print-optimized narrow component (also usable as PDF via browser print).

## Build order

1. Design system + brand shell (header, footer, logo, floating cart).
2. Cloud backend, schema, RLS, Kenya geography + courier seeds.
3. Catalog: categories, products, product pages, cart.
4. Checkout + Kenya address picker + M-Pesa STK Push + status polling.
5. Receipt + WhatsApp follow-up.
6. Tracking page.
7. Admin: auth, orders/courier assignment, products + image upload, categories, couriers, shipping fees, M-Pesa config, site settings.
