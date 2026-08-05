export const AD_PLACEMENTS = [
  { id: "home_banner", label: "Home banner", perDay: 1500, note: "Wide banner under the hero" },
  { id: "shop_strip", label: "Shop strip", perDay: 900, note: "Inline card in the shop grid" },
  { id: "receipt_footer", label: "Receipt footer", perDay: 600, note: "On every digital receipt" },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];

export const AD_DURATIONS = [7, 14, 30] as const;

export function adPrice(placement: string, days: number): number {
  const p = AD_PLACEMENTS.find((x) => x.id === placement) ?? AD_PLACEMENTS[0];
  return p.perDay * days;
}
