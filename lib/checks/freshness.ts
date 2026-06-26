import type { ExposureRecord } from "@/lib/types";
import { GOVERNANCE } from "@/lib/agent/config";

const DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY);
}

export function freshnessDays(
  records: ExposureRecord[],
  reference: string = GOVERNANCE.reportingDate
): number {
  if (records.length === 0) return Infinity;
  const newest = records.reduce((max, r) => (r.asOf > max ? r.asOf : max), records[0].asOf);
  return Math.max(0, daysBetween(newest, reference));
}

export function dataIsFresh(
  records: ExposureRecord[],
  slaDays: number = GOVERNANCE.freshnessSlaDays
): boolean {
  return freshnessDays(records) <= slaDays;
}