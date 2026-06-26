import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agent/graph";
import { hasLlm } from "@/lib/agent/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { question?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "question requise" }, { status: 400 });

  const t0 = Date.now();
  try {
    const final = await agentGraph.invoke({ question });
    return NextResponse.json({
      answer: final.answer,
      verdict: final.verdict,
      reason: final.reason,
      plan: final.plan,
      retrievalScore: final.retrievalScore,
      latencyMs: Date.now() - t0,
      llm: hasLlm(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur agent" }, { status: 500 });
  }
}