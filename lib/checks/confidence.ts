import type { ExposureRecord } from "@/lib/types";
import { GOVERNANCE } from "@/lib/agent/config";

export function retrievalConfidence(records: ExposureRecord[]): number {
  if (records.length === 0) return 0;
  const avgQuality = records.reduce((s, r) => s + r.qualityScore, 0) / records.length;
  const coverage = Math.min(1, records.length / 3);
  return Math.round(avgQuality * (0.7 + 0.3 * coverage) * 100) / 100;
}

export function aboveConfidenceFloor(
  score: number,
  floor: number = GOVERNANCE.confidenceFloor
): boolean {
  return score >= floor;
}