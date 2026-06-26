import type { AgentStateType } from "../state";
import { GOVERNANCE } from "../config";
import { dataIsFresh } from "@/lib/checks/freshness";
import { aboveConfidenceFloor } from "@/lib/checks/confidence";
import { hasSupport, citationsResolve } from "@/lib/checks/citations";
import { hasLlm, chat } from "../llm";

async function judgeGrounded(draft: string, context: string): Promise<boolean> {
  const out = await chat(
    "Tu es un vérificateur strict. On te donne une RÉPONSE et des DONNÉES SOURCES. " +
      "Réponds par OUI si chaque chiffre de la réponse est soutenu par les données, NON sinon. Un seul mot.",
    `RÉPONSE:\n${draft}\n\nDONNÉES SOURCES:\n${context}`
  );
  return /^\s*oui/i.test(out);
}

export async function verifyNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { records, citations, draft, retrievalScore, attempts, quality, context } = state;

  if (records.length === 0)
    return { verdict: "refuse", reason: "Aucune donnée ne correspond à la question." };
  if (!dataIsFresh(records))
    return { verdict: "refuse", reason: `Donnée trop ancienne (${quality?.freshnessDays} j > SLA ${GOVERNANCE.freshnessSlaDays} j).` };
  if (!aboveConfidenceFloor(retrievalScore))
    return { verdict: "refuse", reason: `Confiance de récupération insuffisante (${retrievalScore} < ${GOVERNANCE.confidenceFloor}).` };
  if (!hasSupport(citations) || !citationsResolve(citations, records))
    return { verdict: "refuse", reason: "Réponse non sourcée de façon fiable." };

  if (hasLlm() && draft && attempts < 1) {
    try {
      const grounded = await judgeGrounded(draft, context);
      if (!grounded)
        return { verdict: "retry", reason: "Brouillon non ancré dans les sources — nouvel essai.", attempts: attempts + 1 };
    } catch { /* juge indisponible → on s'appuie sur les contrôles déterministes */ }
  }

  return { verdict: "ok", reason: "Contrôles de gouvernance passés." };
}