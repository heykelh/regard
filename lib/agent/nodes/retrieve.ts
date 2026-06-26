import type { AgentStateType } from "../state";
import type { ExposureRecord, QualityBadge } from "@/lib/types";
import { loadGold, byCounterparty, aboveAmount } from "@/lib/data/gold-server";
import { retrievalConfidence } from "@/lib/checks/confidence";
import { dataIsFresh, freshnessDays } from "@/lib/checks/freshness";

export async function retrieveNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const plan = state.plan!;
  let records: ExposureRecord[] = [];

  if (plan.intent === "total_by_counterparty" && plan.counterparty) records = byCounterparty(plan.counterparty);
  else if (plan.intent === "list_above_amount" && plan.amount != null) records = aboveAmount(plan.amount);
  else if (plan.intent === "list_all") records = loadGold();
  else if (plan.intent === "freshness") records = loadGold();

  const retrievalScore = retrievalConfidence(records);
  const fdays = freshnessDays(records);
  const avgQ = records.length ? records.reduce((s, r) => s + r.qualityScore, 0) / records.length : 0;
  const quality: QualityBadge = {
    freshnessDays: isFinite(fdays) ? fdays : -1,
    withinSla: dataIsFresh(records),
    qualityScore: Math.round(avgQ * 100) / 100,
  };
  const context = records
    .slice(0, 50)
    .map((r) => `${r.id} | ${r.counterparty} | ${r.amount} ${r.currency} | ${r.asOf} | q=${r.qualityScore}`)
    .join("\n");

  return { records, retrievalScore, quality, context };
}