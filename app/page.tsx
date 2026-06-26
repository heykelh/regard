import Link from "next/link";
import { ArrowRight, ShieldCheck, HardHat, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-border py-20 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          REGARD · Copilote de conformité
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight text-foreground sm:text-5xl">
          L&apos;IA branchée sur le désordre du réel.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Construire un modèle est devenu une commodité. Le mur, aujourd&apos;hui, c&apos;est de le faire
          tourner sur la donnée en désordre et les contraintes d&apos;une vraie organisation régulée.
          REGARD est une démonstration de ce passage — de la donnée brute à une réponse gouvernée,
          vérifiable et tracée.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/copilote">
              Ouvrir le copilote <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/copilote/qualite">Voir la qualité des données</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-px border-b border-border bg-border sm:grid-cols-3">
        <Pillar
          icon={<HardHat className="size-5 text-foreground" />}
          title="Le terrain, connu de l'intérieur"
          body="Douze ans en environnement critique ferroviaire : procédures, gestion d'incidents, décision rapide, savoir dire non. L'instinct opérationnel ne se code pas — c'est ce qui manque à la plupart des projets d'IA."
        />
        <Pillar
          icon={<ScrollText className="size-5 text-foreground" />}
          title="La donnée d'abord, sans faire semblant"
          body="Une donnée d'entreprise réelle est sale : un tiers est inexploitable ou redondant. REGARD ne le cache pas — il nettoie, score, et trace ce qu'il refuse de laisser passer."
        />
        <Pillar
          icon={<ShieldCheck className="size-5 text-foreground" />}
          title="La fiabilité se prouve"
          body="Aucune promesse de zéro erreur. Des contrôles déterministes d'abord, un LLM-juge pour le flou, une escalade humaine quand la confiance manque, et un journal d'audit complet."
        />
      </section>

      <section className="py-16">
        <h2 className="text-2xl text-foreground">Comment REGARD répond</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          L&apos;agent ne fait pas confiance au modèle pour se vérifier lui-même. Il récupère le chiffre
          dans la donnée gold et la règle dans le texte régulé, les croise, puis passe par une couche
          d&apos;autocontrôle avant de répondre — ou de refuser, avec un motif.
        </p>
        <ol className="mt-8 space-y-px overflow-hidden rounded-md border border-border bg-border font-mono text-sm">
          <Step n="01" title="Donnée sale → table gold" desc="Nettoyage, normalisation, déduplication, score qualité par ligne." />
          <Step n="02" title="Récupération croisée" desc="Le chiffre dans les données, la règle dans le texte régulé." />
          <Step n="03" title="Autocontrôle" desc="Citations, fraîcheur, seuils, plancher de confiance — déterministe, puis LLM-juge." />
          <Step n="04" title="Réponse ou refus motivé" desc="Réponse sourcée avec badges, ou escalade humaine. Tout est tracé." />
        </ol>
      </section>

      <footer className="border-t border-border py-10 font-mono text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>REGARD — démonstration forward deployed</span>
          <div className="flex gap-5">
            <a href="https://github.com/heykelh/regard" className="hover:text-foreground" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://heykelhachiche.com" className="hover:text-foreground" target="_blank" rel="noreferrer">
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-background p-6">
      <div className="flex size-10 items-center justify-center rounded-md border border-border">{icon}</div>
      <h3 className="mt-4 text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4 bg-background px-5 py-4">
      <span className="text-muted-foreground">{n}</span>
      <div>
        <p className="text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}