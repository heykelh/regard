export type Verdict = "ok" | "retry" | "refuse";

export interface ExposureRecord {
  id: string;
  counterparty: string;
  amount: number;
  currency: string;
  asOf: string;          // ISO date — sert au contrôle de fraîcheur
  qualityScore: number;  // 0..1, attribué par le pipeline
  sourceFile: string;
}

export interface RuleClause {
  id: string;
  reference: string;     // ex. "DORA Art. 11", "BCBS239 §3"
  text: string;
  threshold?: number;    // seuil chiffré si la règle en porte un
}

export interface Citation {
  kind: "record" | "clause";
  ref: string;           // ExposureRecord.id ou RuleClause.reference
  excerpt: string;
}

export interface QualityBadge {
  freshnessDays: number;
  withinSla: boolean;
  qualityScore: number;
}

export interface AnswerCard {
  answer: string;
  citations: Citation[];
  quality: QualityBadge;
  refused: boolean;
  reason?: string;       // motif si refus / escalade
}

export interface AuditEntry {
  id: string;
  question: string;
  verdict: Verdict;
  reason?: string;
  citations: Citation[];
  retrievalScore: number;
  latencyMs: number;
  createdAt: string;
}