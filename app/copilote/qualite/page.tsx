"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getQualityDistribution, getCounterpartySummaries, getDataSpan,
  type CounterpartySummary, type QualityBucketCount, type DataSpan,
} from "@/lib/data/duckdb";

interface QualityReport {
  generatedAt: string;
  sourceFile: string;
  totalRaw: number;
  kept: number;
  rejected: number;
  duplicatesDropped: number;
  avgQuality: number;
  qualityBuckets: { high: number; medium: number; low: number };
  rejectionsByReason: Record<string, number>;
}

const fmtInt = new Intl.NumberFormat("fr-FR");
const fmtCompact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

function qualityTone(score: number) {
  if (score >= 0.9) return { label: "élevée", cls: "bg-ok/15 text-ok border-ok/30" };
  if (score >= 0.7) return { label: "moyenne", cls: "bg-warn/15 text-warn border-warn/30" };
  return { label: "faible", cls: "bg-danger/15 text-danger border-danger/30" };
}

const BUCKET_META = {
  high: { label: "Élevée (≥ 0,9)", color: "var(--ok)" },
  medium: { label: "Moyenne (0,7–0,9)", color: "var(--warn)" },
  low: { label: "Faible (< 0,7)", color: "var(--danger)" },
} as const;

export default function QualityPage() {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [dist, setDist] = useState<QualityBucketCount[]>([]);
  const [summaries, setSummaries] = useState<CounterpartySummary[]>([]);
  const [span, setSpan] = useState<DataSpan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rep, d, s, sp] = await Promise.all([
          fetch("/data/quality_report.json").then((r) => {
            if (!r.ok) throw new Error("quality_report.json introuvable");
            return r.json() as Promise<QualityReport>;
          }),
          getQualityDistribution(),
          getCounterpartySummaries(),
          getDataSpan(),
        ]);
        setReport(rep);
        setDist(d);
        setSummaries(s);
        setSpan(sp);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="animate-pulse text-sm font-mono text-muted-foreground">
          Initialisation de DuckDB et chargement de la table gold…
        </div>
      </main>
    );
  }

  if (error || !report || !span) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error ?? "Données indisponibles."} — as-tu lancé <span className="font-mono">npm run build:gold</span> ?
        </div>
      </main>
    );
  }

  const written = report.kept + report.duplicatesDropped + report.rejected;
  const distSorted = (["high", "medium", "low"] as const).map((b) => ({
    bucket: b,
    count: dist.find((x) => x.bucket === b)?.count ?? 0,
    ...BUCKET_META[b],
  }));
  const reasons = Object.entries(report.rejectionsByReason).sort((a, b) => b[1] - a[1]);
  const maxReason = Math.max(1, ...reasons.map(([, n]) => n));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Couche données · {report.sourceFile}
        </p>
        <h1 className="mt-2 text-3xl text-foreground">Qualité des données</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ce que devient une donnée d&apos;entreprise réelle une fois nettoyée et scorée. Rien n&apos;est
          masqué : ce qui est écarté est tracé et justifié.
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Période couverte : {span.minAsOf} → {span.maxAsOf}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Lignes brutes" value={fmtInt.format(report.totalRaw)} />
        <Kpi label="Retenues (gold)" value={fmtInt.format(report.kept)} tone="ok" />
        <Kpi
          label="Écartées"
          value={fmtInt.format(report.rejected + report.duplicatesDropped)}
          hint={`${report.rejected} rejets · ${report.duplicatesDropped} doublons`}
          tone="danger"
        />
        <Kpi label="Qualité moyenne" value={`${Math.round(report.avgQuality * 100)} %`} tone="warn" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base text-foreground">Rétention</h2>
        <div className="flex h-3 overflow-hidden rounded-full border border-border">
          <div className="bg-ok" style={{ width: `${pct(report.kept, written)}%` }} title={`Retenues : ${report.kept}`} />
          <div className="bg-warn" style={{ width: `${pct(report.duplicatesDropped, written)}%` }} title={`Doublons : ${report.duplicatesDropped}`} />
          <div className="bg-danger" style={{ width: `${pct(report.rejected, written)}%` }} title={`Rejets : ${report.rejected}`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
          <Legend color="var(--ok)" label={`Retenues ${pct(report.kept, written)}%`} />
          <Legend color="var(--warn)" label={`Doublons ${pct(report.duplicatesDropped, written)}%`} />
          <Legend color="var(--danger)" label={`Rejets ${pct(report.rejected, written)}%`} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Répartition de la qualité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distSorted} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distSorted.map((d) => (
                      <Cell key={d.bucket} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Motifs de rejet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reasons.length === 0 && <p className="text-sm text-muted-foreground">Aucun rejet.</p>}
            {reasons.map(([reason, n]) => (
              <div key={reason}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground">{reason}</span>
                  <span className="font-mono text-muted-foreground">{n}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-danger/70" style={{ width: `${(n / maxReason) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-base text-foreground">Expositions par contrepartie</h2>
        <p className="mb-3 font-mono text-xs text-muted-foreground">
          Σ montants brut, non converti FX (devises mélangées)
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrepartie</TableHead>
                <TableHead className="text-right">Expositions</TableHead>
                <TableHead className="text-right">Σ montant</TableHead>
                <TableHead className="text-right">Qualité moy.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.slice(0, 10).map((s) => {
                const tone = qualityTone(s.avgQuality);
                return (
                  <TableRow key={s.counterparty}>
                    <TableCell className="font-medium text-foreground">{s.counterparty}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{s.exposureCount}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{fmtCompact.format(s.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={tone.cls}>
                        {Math.round(s.avgQuality * 100)} %
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" | "danger" }) {
  const accent = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}