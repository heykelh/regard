import fs from "node:fs";
import path from "node:path";

// PRNG seedé (mulberry32) → données reproductibles
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260626);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const chance = (p: number) => rng() < p;

const COUNTERPARTIES = [
  "BNP Paribas", "Société Générale", "Crédit Agricole", "Deutsche Bank",
  "Banco Santander", "ING Group", "UniCredit", "Barclays", "HSBC",
  "Natixis", "Rabobank", "Intesa Sanpaolo", "Commerzbank", "Nordea",
  "KBC Group", "ABN Amro",
];
const ALIASES: Record<string, string> = {
  "Société Générale": "Soc Gen", "BNP Paribas": "BNPP", "Deutsche Bank": "DB",
};
const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "" };
const FR_MONTHS = ["janvier","février","mars"]; // Q1 2026

function dirtyCounterparty(name: string): string {
  let s = name;
  if (chance(0.12) && ALIASES[name]) s = ALIASES[name];           // alias résoluble
  else if (chance(0.1)) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // accents retirés
  else if (chance(0.08)) s = name.slice(0, 4) + "X";              // typo non résoluble
  const mode = randInt(0, 3);
  if (mode === 0) s = s.toUpperCase();
  else if (mode === 1) s = s.toLowerCase();
  if (chance(0.3)) s = "  " + s + " ";                            // espaces parasites
  return s;
}

function groupThousands(intStr: string, sep: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function dirtyAmount(v: number): string {
  const strat = randInt(0, 6);
  if (strat === 0) return String(v);
  if (strat === 1) return v.toFixed(2);
  if (strat === 2) return groupThousands(String(v), " ");          // "1 250 000"
  if (strat === 3) return groupThousands(String(v), ",");          // "1,250,000"
  if (strat === 4) return groupThousands(String(v), ".") + ",00";  // "1.250.000,00"
  if (strat === 5) {                                               // millions
    const m = (v / 1e6).toFixed(2).replace(/\.?0+$/, "");
    return chance(0.5) ? `${m}M` : `${m.replace(".", ",")} M`;
  }
  return "€" + groupThousands(String(v), " ");                     // symbole collé
}

function dirtyDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const strat = randInt(0, 3);
  if (strat === 0) return `${y}-${m}-${day}`;          // ISO
  if (strat === 1) return `${y}/${m}/${day}`;          // yyyy/mm/dd
  if (strat === 2) return `${day}/${m}/${y}`;          // dd/mm/yyyy (FR)
  return `${FR_MONTHS[d.getUTCMonth()]} ${y}`;         // "mars 2026" → 1er du mois
}

function csvField(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

type Row = { exposure_id: string; counterparty: string; amount: string; currency: string; as_of: string };

const rows: Row[] = [];
const N_BASE = 175;

for (let i = 0; i < N_BASE; i++) {
  const cp = pick(COUNTERPARTIES);
  const cur = pick(CURRENCIES);
  const value = randInt(50, 9500) * 1000; // 50k → 9.5M
  const date = new Date(Date.UTC(2026, randInt(0, 2), randInt(1, 28)));

  // devise : parfois symbole, minuscule, espacée, ou manquante
  let curRaw = cur;
  const cMode = randInt(0, 4);
  if (cMode === 0 && SYMBOLS[cur]) curRaw = SYMBOLS[cur];
  else if (cMode === 1) curRaw = cur.toLowerCase();
  else if (cMode === 2) curRaw = ` ${cur} `;
  else if (cMode === 3) curRaw = ""; // manquante → inférable si symbole dans le montant

  rows.push({
    exposure_id: chance(0.06) ? "" : `EXP-${String(1000 + i)}`, // id parfois manquant
    counterparty: dirtyCounterparty(cp),
    amount: dirtyAmount(value),
    currency: curRaw,
    as_of: dirtyDate(date),
  });
}

// doublons quasi-identiques (~20)
for (let i = 0; i < 20; i++) {
  const src = pick(rows.filter((r) => r.exposure_id));
  rows.push({ ...src, exposure_id: `EXP-DUP-${i}`, amount: dirtyAmount(randInt(50, 9500) * 1000) });
}

// lignes corrompues (~12) — à rejeter, pas à réparer
const CORRUPT_AMOUNTS = ["", "N/A", "TBD", "-"];
for (let i = 0; i < 12; i++) {
  const broken = randInt(0, 2);
  rows.push({
    exposure_id: `EXP-BAD-${i}`,
    counterparty: broken === 0 ? "" : dirtyCounterparty(pick(COUNTERPARTIES)),
    amount: broken === 1 ? pick(CORRUPT_AMOUNTS) : dirtyAmount(randInt(50, 9500) * 1000),
    currency: broken === 2 ? "" : pick(CURRENCIES),         // ni devise ni symbole → rejet
    as_of: broken === 2 ? "31/02/2026" : dirtyDate(new Date(Date.UTC(2026, 1, 15))), // date invalide
  });
}

// mélange déterministe
for (let i = rows.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [rows[i], rows[j]] = [rows[j], rows[i]];
}

const header = "exposure_id,counterparty,amount,currency,as_of";
const lines = rows.map((r) =>
  [r.exposure_id, r.counterparty, r.amount, r.currency, r.as_of].map(csvField).join(",")
);
const out = path.join(process.cwd(), "pipeline", "raw", "exposures_raw.csv");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, [header, ...lines].join("\n"), "utf8");
console.log(`✓ ${rows.length} lignes sales écrites → ${out}`);