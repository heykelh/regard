import type { ExposureRecord } from "../lib/types";

export type RawRow = {
  exposureId: string; counterparty: string; amount: string; currency: string; asOf: string;
};
export type Rejection = { exposureId: string; counterparty: string; reason: string };
export type TransformResult = {
  kept: ExposureRecord[];
  rejected: Rejection[];
  duplicatesDropped: Rejection[];
};

const PENALTY = {
  whitespace: 0.05, amountFormat: 0.1, currencySymbol: 0.1,
  dateFormat: 0.1, counterpartyCase: 0.05, counterpartyUnresolved: 0.15,
  idRecovered: 0.1, currencyInferred: 0.1,
};

const CANON = [
  "BNP Paribas", "Société Générale", "Crédit Agricole", "Deutsche Bank",
  "Banco Santander", "ING Group", "UniCredit", "Barclays", "HSBC",
  "Natixis", "Rabobank", "Intesa Sanpaolo", "Commerzbank", "Nordea",
  "KBC Group", "ABN Amro",
];
const ALIAS_TO_CANON: Record<string, string> = { "soc gen": "Société Générale", "bnpp": "BNP Paribas", "db": "Deutsche Bank" };
const SYMBOL_TO_ISO: Record<string, string> = { "€": "EUR", "$": "USD", "£": "GBP" };
const FR_MONTHS: Record<string, number> = { janvier: 1, février: 2, fevrier: 2, mars: 3 };
const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function cleanCounterparty(raw: string, repairs: string[]): string | null {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (trimmed !== raw) repairs.push("whitespace");
  const key = norm(trimmed);
  const canon = CANON.find((c) => norm(c) === key);
  if (canon) { if (canon !== trimmed) repairs.push("counterpartyCase"); return canon; }
  if (ALIAS_TO_CANON[key]) { repairs.push("counterpartyCase"); return ALIAS_TO_CANON[key]; }
  repairs.push("counterpartyUnresolved");
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanAmount(raw: string, repairs: string[]): number | null {
  const s = raw.trim();
  if (!s || /^(n\/?a|tbd|-|null)$/i.test(s)) return null;
  if (!/^\d+$/.test(s)) repairs.push("amountFormat");
  let t = s.replace(/[€$£]/g, "").replace(/[\s\u00a0]/g, "");
  const millions = /m$/i.test(t);
  if (millions) t = t.slice(0, -1);
  t = t.replace(/[a-z]/gi, "");
  const hasDot = t.includes("."), hasComma = t.includes(",");
  if (hasDot && hasComma) {
    const dec = t.lastIndexOf(".") > t.lastIndexOf(",") ? "." : ",";
    t = t.split(dec === "." ? "," : ".").join("").replace(dec, ".");
  } else if (hasComma) {
    const p = t.split(",");
    t = p.length === 2 && p[1].length <= 2 ? p.join(".") : t.split(",").join("");
  } else if (hasDot) {
    const p = t.split(".");
    if (p.length > 2) t = p.join("");
  }
  let v = parseFloat(t);
  if (!isFinite(v) || v <= 0) return null;
  if (millions) v *= 1e6;
  return Math.round(v * 100) / 100;
}

function cleanCurrency(raw: string, amountRaw: string, repairs: string[]): string | null {
  const t = raw.trim();
  if (t) {
    if (SYMBOL_TO_ISO[t]) { repairs.push("currencySymbol"); return SYMBOL_TO_ISO[t]; }
    const iso = t.toUpperCase();
    if (["EUR", "USD", "GBP", "CHF"].includes(iso)) { if (iso !== t) repairs.push("currencySymbol"); return iso; }
  }
  for (const sym of Object.keys(SYMBOL_TO_ISO)) {           // inférence depuis le symbole du montant
    if (amountRaw.includes(sym)) { repairs.push("currencyInferred"); return SYMBOL_TO_ISO[sym]; }
  }
  return null; // pas de devise fiable → on ne devine pas (rejet)
}

function cleanDate(raw: string, repairs: string[]): string | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let mt: RegExpMatchArray | null;
  if ((mt = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) [, , ,] = mt, (y = +mt[1]), (m = +mt[2]), (d = +mt[3]);
  else if ((mt = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/))) { repairs.push("dateFormat"); y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) { repairs.push("dateFormat"); d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else if ((mt = s.match(/^([a-zéû]+)\s+(\d{4})$/i)) && FR_MONTHS[norm(mt[1])]) { repairs.push("dateFormat"); m = FR_MONTHS[norm(mt[1])]; y = +mt[2]; d = 1; }
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // ex. 31/02
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function transform(rows: RawRow[]): TransformResult {
  const kept: ExposureRecord[] = [];
  const rejected: Rejection[] = [];
  const duplicatesDropped: Rejection[] = [];

  for (const row of rows) {
    const repairs: string[] = [];
    const counterparty = cleanCounterparty(row.counterparty, repairs);
    if (!counterparty) { rejected.push({ exposureId: row.exposureId, counterparty: row.counterparty, reason: "contrepartie manquante" }); continue; }
    const amount = cleanAmount(row.amount, repairs);
    if (amount === null) { rejected.push({ exposureId: row.exposureId, counterparty, reason: "montant illisible" }); continue; }
    const currency = cleanCurrency(row.currency, row.amount, repairs);
    if (!currency) { rejected.push({ exposureId: row.exposureId, counterparty, reason: "devise manquante" }); continue; }
    const asOf = cleanDate(row.asOf, repairs);
    if (!asOf) { rejected.push({ exposureId: row.exposureId, counterparty, reason: "date invalide ou manquante" }); continue; }

    let id = row.exposureId.trim();
    if (!id) { id = `GEN-${kept.length + 1}`; repairs.push("idRecovered"); }

    const penalty = repairs.reduce((sum, r) => sum + (PENALTY[r as keyof typeof PENALTY] ?? 0), 0);
    const qualityScore = Math.max(0, Math.round((1 - penalty) * 100) / 100);

    kept.push({ id, counterparty, amount, currency, asOf, qualityScore, sourceFile: "exposures_raw.csv" });
  }

  // déduplication : même contrepartie + même date → on garde la meilleure qualité
  const best = new Map<string, ExposureRecord>();
  for (const rec of kept) {
    const key = `${rec.counterparty}__${rec.asOf}`;
    const prev = best.get(key);
    if (!prev) { best.set(key, rec); continue; }
    const loser = rec.qualityScore > prev.qualityScore ? prev : rec;
    if (rec.qualityScore > prev.qualityScore) best.set(key, rec);
    duplicatesDropped.push({ exposureId: loser.id, counterparty: loser.counterparty, reason: `doublon de ${key}` });
  }

  return { kept: [...best.values()], rejected, duplicatesDropped };
}