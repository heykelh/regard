"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnswerCard } from "@/lib/types";

interface AskResponse {
  answer: AnswerCard;
  verdict: string;
  reason: string;
  retrievalScore: number;
  latencyMs: number;
  llm: boolean;
  error?: string;
}

const EXAMPLES = [
  "Quelle est l'exposition totale sur BNP Paribas ?",
  "Quelles expositions dépassent 5 millions ?",
  "Les données sont-elles à jour ?",
];

export default function CopilotePage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AskResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setLoading(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data: AskResponse = await r.json();
      if (!r.ok) throw new Error(data.error || "Erreur");
      setRes(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  const a = res?.answer;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">REGARD · Copilote</p>
        <h1 className="mt-2 text-3xl text-foreground">Pose une question sur les expositions</h1>
        <p className="mt-2 text-muted-foreground">
          L&apos;agent récupère la donnée gold, croise avec les règles, s&apos;autocontrôle, puis répond — ou refuse, avec un motif.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(q)}
          placeholder="ex. Exposition totale sur Deutsche Bank ?"
          className="flex-1 rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
        />
        <button
          onClick={() => ask(q)}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50"
          aria-label="Envoyer"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setQ(ex); ask(ex); }}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-8 animate-pulse font-mono text-sm text-muted-foreground">L&apos;agent réfléchit et s&apos;autocontrôle…</p>
      )}
      {err && (
        <div className="mt-8 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{err}</div>
      )}

      {a && (
        <article className={`mt-8 rounded-lg border ${a.refused ? "border-warn/40 bg-warn/5" : "border-border bg-card"} p-5`}>
          <div className="mb-3 flex items-center gap-2">
            {a.refused ? <ShieldAlert className="size-4 text-warn" /> : <ShieldCheck className="size-4 text-ok" />}
            <span className={`font-mono text-xs uppercase tracking-wider ${a.refused ? "text-warn" : "text-ok"}`}>
              {a.refused ? "Refus motivé" : "Réponse gouvernée"}
            </span>
          </div>

          <p className="text-foreground leading-relaxed">{a.answer}</p>

          {!a.refused && (
            <div className="mt-4 flex flex-wrap gap-2">
              <QualityBadgeView label="Fraîcheur" value={a.quality.freshnessDays >= 0 ? `${a.quality.freshnessDays} j` : "—"} ok={a.quality.withinSla} />
              <QualityBadgeView label="SLA" value={a.quality.withinSla ? "respecté" : "dépassé"} ok={a.quality.withinSla} />
              <QualityBadgeView label="Qualité" value={`${Math.round(a.quality.qualityScore * 100)} %`} ok={a.quality.qualityScore >= 0.7} />
            </div>
          )}

          {a.citations.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Sources ({a.citations.length})</p>
              <ul className="space-y-1">
                {a.citations.map((c) => (
                  <li key={c.ref} className="font-mono text-xs text-muted-foreground">
                    <span className="text-foreground">{c.ref}</span> · {c.excerpt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {res && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
              <span>verdict: {res.verdict}</span>
              <span>confiance: {res.retrievalScore}</span>
              <span>latence: {res.latencyMs} ms</span>
              <span>moteur: {res.llm ? "déterministe + LLM" : "déterministe seul"}</span>
            </div>
          )}
        </article>
      )}
    </main>
  );
}

function QualityBadgeView({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <Badge variant="outline" className={ok ? "border-ok/30 bg-ok/10 text-ok" : "border-warn/30 bg-warn/10 text-warn"}>
      {label}: {value}
    </Badge>
  );
}