import { GOVERNANCE } from "@/lib/agent/config";

export type Comparator = "lt" | "lte" | "gt" | "gte" | "eq";

export function compare(value: number, op: Comparator, threshold: number): boolean {
  switch (op) {
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "eq": return value === threshold;
  }
}

export function exceedsConcentrationLimit(
  totalAmount: number,
  limit: number = GOVERNANCE.concentrationLimitEur
): boolean {
  return totalAmount > limit;
}