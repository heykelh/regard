import { Annotation } from "@langchain/langgraph";
import type {
  AnswerCard, Citation, ExposureRecord, QualityBadge, Verdict,
} from "@/lib/types";

export type Intent =
  | "total_by_counterparty"
  | "list_above_amount"
  | "list_all"
  | "freshness"
  | "unknown";

export interface QueryPlan {
  intent: Intent;
  counterparty?: string;
  amount?: number;
  raw: string;
}

const last = <T,>(def: () => T) => ({ reducer: (_: T, b: T) => b, default: def });

export const AgentState = Annotation.Root({
  question: Annotation<string>,
  plan: Annotation<QueryPlan | null>(last(() => null)),
  records: Annotation<ExposureRecord[]>(last(() => [])),
  context: Annotation<string>(last(() => "")),
  draft: Annotation<string>(last(() => "")),
  citations: Annotation<Citation[]>(last(() => [])),
  quality: Annotation<QualityBadge | null>(last(() => null)),
  retrievalScore: Annotation<number>(last(() => 0)),
  verdict: Annotation<Verdict>(last(() => "ok")),
  reason: Annotation<string>(last(() => "")),
  attempts: Annotation<number>(last(() => 0)),
  answer: Annotation<AnswerCard | null>(last(() => null)),
});

export type AgentStateType = typeof AgentState.State;