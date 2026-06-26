import type { AgentStateType } from "../state";
import type { AnswerCard, QualityBadge } from "@/lib/types";

const EMPTY_QUALITY: QualityBadge = { freshnessDays: -1, withinSla: false, qualityScore: 0 };

export async function finalizeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { verdict, reason, draft, citations, quality, plan } = state;

  if (verdict === "refuse") {
    const answer: AnswerCard = {
      answer:
        `Je ne peux pas répondre de façon fiable à cette question. Motif : ${reason} ` +
        `Conformément à la logique de gouvernance, je préfère escalader plutôt que produire un chiffre non vérifiable.`,
      citations: [],
      quality: quality ?? EMPTY_QUALITY,
      refused: true,
      reason,
    };
    return { answer };
  }

  const answer: AnswerCard = {
    answer: draft || "Réponse indisponible.",
    citations,
    quality: quality ?? EMPTY_QUALITY,
    refused: false,
  };
  return { answer };
}