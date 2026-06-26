import type { Citation, ExposureRecord } from "@/lib/types";

export function citationsResolve(citations: Citation[], records: ExposureRecord[]): boolean {
  const ids = new Set(records.map((r) => r.id));
  return citations.every((c) => c.kind !== "record" || ids.has(c.ref));
}

export function hasSupport(citations: Citation[]): boolean {
  return citations.length > 0;
}