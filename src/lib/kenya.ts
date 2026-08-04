import raw from "@/data/kenya-locations.json";

export type SubCounty = { name: string; wards: string[] };
export type County = { name: string; subCounties: SubCounty[] };

export const counties = raw as County[];

export function subCountiesOf(county: string): SubCounty[] {
  return counties.find((c) => c.name === county)?.subCounties ?? [];
}

export function wardsOf(county: string, subCounty: string): string[] {
  return subCountiesOf(county).find((s) => s.name === subCounty)?.wards ?? [];
}
