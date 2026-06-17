import type { Dumpster, DumpsterSize } from "@/lib/types";

export const defaultDumpsterSizes: DumpsterSize[] = ["14 yd", "16 yd", "20 yd"];
export const dumpsterTypes = ["Roll-off", "Concrete", "Yard Waste", "Garbage"] as const;

export function normalizeDumpsterSize(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return defaultDumpsterSizes[0];
  }
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed} yd` : trimmed;
}

export function getDumpsterSizeOptions(dumpsters: Pick<Dumpster, "size">[] = []) {
  return Array.from(new Set([...defaultDumpsterSizes, ...dumpsters.map((dumpster) => dumpster.size).filter(Boolean)])).sort((a, b) => {
    const aNumber = Number.parseFloat(a);
    const bNumber = Number.parseFloat(b);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }
    return a.localeCompare(b);
  });
}
