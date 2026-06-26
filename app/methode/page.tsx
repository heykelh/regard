import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, Wallet, Coins, CalendarDays, Copy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QualityReport {
  totalRaw: number;
  kept: number;
  rejected: number;
  duplicatesDropped: number;
  avgQuality: number;
}

function loadReport(): QualityReport | null {
  try {
    const file = path.join(process.cwd(), "public", "data", "quality_report.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as QualityReport;
  } catch {
    return null;
  }
}

const MESSY = [
  { id: "(vide)", cp: "  BNPP ", amount: "1 250 000", cur: "€", date: "01/03/2026", pb: "Id manquant, nom abrégé, montant espacé, date au format français" },
  { id: "EXP-1043", cp: "soc gen", amount: "2.4M", cur: "eur", date: "mars 2026", pb: "Nom en minuscules, montant en millions, devise en minuscules" },
  { id: "EXP-1055", cp: "Deutsche Bank", amount: "920000.00", cur: "(vide)", date: "2026/02/14", pb: "Devise absente, date avec séparateurs différents" },
  { id: "EXP-DUP-3", cp: "HSBC", amount: "1.250.000,00", cur: "GBP", date: "2026-01-20", pb: "Doublon d'une autre ligne, montant au format européen" },
  { id: "EXP-BAD-2", cp: "(vide)", amount: "N/A", cur: "(vide)", date: "31/02/2026", pb: "Irréparable : ni contrepartie, ni montant, date impossible" },
];

export default function MethodePage() {
  const r = loadReport();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">REGARD · Méthode</p>
        <h1 className="mt-2 text-3xl text-foreground sm:text-4xl">Du fichier brut à la table « gold »</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Avant qu&apos;une IA puisse répondre quoi que ce soit de fiable, il faut dompter la donnée.
          Voici, étape par étape et sans jargon, comment une donnée d&apos;entreprise sale devient une
          donnée de confiance.
        </p>
      </header>

      <section className="mb-14 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg text-foreground">Pourquoi c&apos;est le vrai travail</h2>
        <p className="mt-2 text-muted-foreground">
          Dans une vraie organisation, la donnée n&apos;arrive jamais propre. Elle sort de plusieurs
          systèmes, saisie par des humains, dans des formats qui ne s&apos;accordent pas. Une part
          importante est même inexploitable. La valeur n&apos;est pas de faire semblant qu&apos;elle est
          propre — c&apos;est de la nettoyer méthodiquement, et de <strong className="text-foreground">tracer
          ce qu&apos;on écarte</strong>. C&apos;est précisément ce que fait cette première brique.
        </p>
      </section>

      <Section n="1" title="Le fichier brut (« raw »)">
        <p className="text-muted-foreground">
          « Raw » veut dire <strong className="text-foreground">brut</strong> : les données telles
          qu&apos;elles sortent des systèmes, sans aucune retouche. Notre fichier de départ liste des
          <em> expositions de risque</em> par contrepartie — une contrepartie étant une banque ou un acteur
          avec qui on a un engagement financier. Voici un échantillon représentatif de son désordre :
        </p>
        <div className="mt-5 overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left">Id</th>
                <th className="px-3 py-2 text-left">Contrepartie</th>
                <th className="px-3 py-2 text-left">Montant</th>
                <th className="px-3 py-2 text-left">Devise</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Problème</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {MESSY.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.id}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.cp}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.amount}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.cur}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.date}</td>
                  <td className="px-3 py-2 font-sans text-danger/90">{row.pb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="2" title="Le nettoyage, étape par étape">
        <p className="mb-6 text-muted-foreground">
          Un programme passe chaque ligne au crible et applique des règles de réparation. Cinq chantiers :
        </p>
        <div className="space-y-3">
          <Repair icon={<Wallet className="size-4" />} title="Montants" before={['"1 250 000"', '"1.2M"', '"1.250.000,00 €"']} after="1250000"
            why="On retire espaces, symboles et séparateurs, on interprète les millions, pour obtenir un seul nombre comparable." />
          <Repair icon={<Coins className="size-4" />} title="Devises" before={['"€"', '"eur"', '" EUR "']} after="EUR"
            why="On normalise vers un code standard à trois lettres. Si la devise manque mais qu'un symbole traîne dans le montant, on la déduit." />
          <Repair icon={<CalendarDays className="size-4" />} title="Dates" before={['"01/03/2026"', '"mars 2026"', '"2026/03/01"']} after="2026-03-01"
            why="Tout est ramené au format international AAAA-MM-JJ : trié et comparé sans ambiguïté." />
          <Repair icon={<Copy className="size-4" />} title="Doublons" before={['BNP Paribas · 2026-03-01', 'BNP Paribas · 2026-03-01']} after="une seule ligne conservée"
            why="Même contrepartie + même date = doublon. On garde la version la mieux notée, on écarte l'autre — et on la trace." />
          <Repair icon={<Ban className="size-4" />} title="Rejets" before={['montant "N/A"', 'devise absente', 'date "31/02/2026"']} after="ligne écartée + motif consigné" danger
            why="Certaines lignes sont irréparables. On ne devine pas : on les rejette en notant pourquoi. Inventer une donnée serait pire que la jeter." />
        </div>
      </Section>

      <Section n="3" title="Le score de qualité">
        <p className="text-muted-foreground">
          Chaque ligne qui survit reçoit une <strong className="text-foreground">note entre 0 et 1</strong>.
          Le principe est simple : plus une ligne a eu besoin de réparations, plus sa note baisse. Une ligne
          parfaite dès le départ vaut 1,0 ; une ligne qu&apos;il a fallu corriger sur plusieurs champs vaut
          moins. Cette note n&apos;est pas décorative : plus tard, l&apos;agent IA s&apos;en sert pour décider
          s&apos;il peut <em>s&apos;appuyer</em> sur une donnée, la <em>signaler</em>, ou <em>refuser</em> de
          répondre.
        </p>
      </Section>

      <Section n="4" title="La table « gold »">
        <p className="text-muted-foreground">
          En ingénierie de données, on parle de paliers :{" "}
          <span className="font-mono text-xs text-muted-foreground">bronze</span> (brut),{" "}
          <span className="font-mono text-xs text-muted-foreground">silver</span> (nettoyé),{" "}
          <span className="font-mono text-xs text-foreground">gold</span> (prêt à l&apos;emploi). La table
          gold est la version finale : <strong className="text-foreground">propre, dédupliquée, notée,
          fiable</strong>. C&apos;est la seule que l&apos;IA et les tableaux de bord ont le droit de
          consulter. Tout part d&apos;elle.
        </p>

        {r && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Lignes brutes" value={r.totalRaw.toString()} />
            <Stat label="Retenues (gold)" value={r.kept.toString()} tone="ok" />
            <Stat label="Écartées" value={(r.rejected + r.duplicatesDropped).toString()} tone="danger" />
            <Stat label="Qualité moyenne" value={`${Math.round(r.avgQuality * 100)} %`} tone="warn" />
          </div>
        )}
      </Section>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-8">
        <Button asChild>
          <Link href="/copilote/qualite">Voir le détail de la qualité <ArrowRight className="ml-1.5 size-4" /></Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/copilote">Essayer le copilote</Link>
        </Button>
      </div>
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-md border border-border font-mono text-xs text-muted-foreground">{n}</span>
        <h2 className="text-xl text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Repair({ icon, title, before, after, why, danger }: { icon: React.ReactNode; title: string; before: string[]; after: string; why: string; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md border border-border text-foreground">{icon}</span>
        <h3 className="text-base text-foreground">{title}</h3>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        {before.map((b, i) => (
          <span key={i} className="rounded bg-muted px-2 py-1 text-muted-foreground">{b}</span>
        ))}
        <ArrowRight className="size-4 text-muted-foreground" />
        <span className={`rounded px-2 py-1 ${danger ? "bg-danger/15 text-danger" : "bg-ok/15 text-ok"}`}>{after}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{why}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const accent = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${accent}`}>{value}</p>
    </div>
  );
}