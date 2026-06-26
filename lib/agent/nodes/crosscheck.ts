import type { AgentStateType } from "../state";
import type { Citation } from "@/lib/types";
import { GOVERNANCE } from "../config";
import { exceedsConcentrationLimit } from "@/lib/checks/thresholds";
import { hasLlm, chat } from "../llm";

const eur = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export async function crosscheckNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { plan, records } = state;
  if (!plan || records.length === 0) return { citations: [], draft: "" };

  const citations: Citation[] = records.slice(0, 12).map((r) => ({
    kind: "record",
    ref: r.id,
    excerpt: `${r.counterparty} ${eur.format(r.amount)} ${r.currency} (${r.asOf})`,
  }));

  let facts = "";
  let template = "";

  if (plan.intent === "total_by_counterparty" && plan.counterparty) {
    const total = records.reduce((s, r) => s + r.amount, 0);
    const exceeds = exceedsConcentrationLimit(total);
    facts =
      `Contrepartie: ${plan.counterparty}. Expositions: ${records.length}. ` +
      `Total nominal (devises mélangées, hors conversion FX): ${total}. ` +
      `Limite de concentration: ${GOVERNANCE.concentrationLimitEur}. Dépassement: ${exceeds ? "OUI" : "non"}.`;
    template =
      `L'exposition totale sur ${plan.counterparty} est de ${eur.format(total)} (nominal, devises mélangées, ` +
      `hors conversion FX), répartie sur ${records.length} exposition(s). ` +
      (exceeds
        ? `Ce montant dépasse la limite de concentration de ${eur.format(GOVERNANCE.concentrationLimitEur)} € — à signaler.`
        : `Ce montant reste sous la limite de concentration de ${eur.format(GOVERNANCE.concentrationLimitEur)} €.`);
  } else if (plan.intent === "list_above_amount" && plan.amount != null) {
    facts = `Seuil: ${plan.amount}. Expositions au-dessus: ${records.length}.`;
    template =
      `${records.length} exposition(s) dépassent ${eur.format(plan.amount)} : ` +
      records.slice(0, 8).map((r) => `${r.counterparty} (${eur.format(r.amount)} ${r.currency})`).join(", ") +
      (records.length > 8 ? "…" : ".");
  } else if (plan.intent === "list_all") {
    const total = records.reduce((s, r) => s + r.amount, 0);
    facts = `Total expositions: ${records.length}. Somme nominale: ${total}.`;
    template = `Le portefeuille compte ${records.length} expositions, pour une somme nominale de ${eur.format(total)} (devises mélangées).`;
  } else if (plan.intent === "freshness") {
    const newest = records.reduce((m, r) => (r.asOf > m ? r.asOf : m), records[0].asOf);
    facts = `Donnée la plus récente: ${newest}. Date de reporting: ${GOVERNANCE.reportingDate}. SLA: ${GOVERNANCE.freshnessSlaDays} j.`;
    template = `La donnée la plus récente date du ${newest}, pour une date de reporting au ${GOVERNANCE.reportingDate} (SLA de fraîcheur : ${GOVERNANCE.freshnessSlaDays} jours).`;
  }

  let draft = template;
  if (hasLlm() && facts) {
    try {
      draft = await chat(
        "Tu es un copilote de conformité. Réponds en français, concis et factuel. " +
          "Utilise UNIQUEMENT les faits vérifiés fournis. N'invente aucun chiffre. " +
          "Mentionne les identifiants d'exposition (EXP-…) entre parenthèses quand tu cites un montant individuel. " +
          "Si les faits ne suffisent pas, dis-le clairement.",
        `Question: ${plan.raw}\n\nFAITS VÉRIFIÉS:\n${facts}\n\nDONNÉES (échantillon):\n${state.context}`
      );
    } catch {
      draft = template; // repli déterministe si l'appel échoue
    }
  }

  return { citations, draft, context: `${state.context}\n\nFAITS:\n${facts}` };
}