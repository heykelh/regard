import type { AgentStateType, Intent, QueryPlan } from "../state";
import { counterpartyNames } from "@/lib/data/gold-server";
import { hasLlm, chat } from "../llm";

function parseAmount(q: string): number | undefined {
  const m = q.match(/(\d[\d\s.,]*)\s*(m(?:illions?)?|k)?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1].replace(/[\s.]/g, "").replace(",", "."));
  if (!isFinite(n)) return undefined;
  const unit = (m[2] || "").toLowerCase();
  if (unit.startsWith("m")) n *= 1e6;
  else if (unit === "k") n *= 1e3;
  return n;
}

function detectCounterparty(q: string): string | undefined {
  const nq = q.toLowerCase();
  return counterpartyNames().find((n) => nq.includes(n.toLowerCase()));
}

export async function planNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const q = state.question;
  const lower = q.toLowerCase();
  const counterparty = detectCounterparty(q);
  const amount = parseAmount(q);

  let intent: Intent = "unknown";
  if (/(fra[iî]ch|à jour|p[ée]rim|ancienn|date des donn)/.test(lower)) intent = "freshness";
  else if (counterparty && /(total|exposition|montant|combien|somme|concentration|limite|risque)/.test(lower))
    intent = "total_by_counterparty";
  else if (amount != null && /(plus de|sup[ée]rieur|au-dessus|>|exc[ée]d|d[ée]pass)/.test(lower))
    intent = "list_above_amount";
  else if (/(toutes|lister|liste|tout)/.test(lower)) intent = "list_all";
  else if (counterparty) intent = "total_by_counterparty";

  // Désambiguïsation LLM uniquement si le déterministe échoue
  if (intent === "unknown" && hasLlm()) {
    try {
      const out = await chat(
        "Classe la question dans EXACTEMENT une de ces catégories, un seul mot: total_by_counterparty, list_above_amount, list_all, freshness, unknown.",
        q
      );
      const guess = out.trim().toLowerCase() as Intent;
      if (["total_by_counterparty", "list_above_amount", "list_all", "freshness"].includes(guess))
        intent = guess;
    } catch { /* on reste sur unknown, géré en aval */ }
  }

  const plan: QueryPlan = { intent, counterparty, amount, raw: q };
  return { plan };
}