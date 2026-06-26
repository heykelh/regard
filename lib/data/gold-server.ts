import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { ExposureRecord } from "@/lib/types";

let cache: ExposureRecord[] | null = null;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function loadGold(): ExposureRecord[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public", "data", "exposures_gold.csv");
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
  const i = Object.fromEntries(header.map((h, k) => [h, k]));
  cache = rows
    .filter((r) => r.length > 1)
    .map((r) => ({
      id: r[i.id],
      counterparty: r[i.counterparty],
      amount: Number(r[i.amount]),
      currency: r[i.currency],
      asOf: r[i.asOf],
      qualityScore: Number(r[i.qualityScore]),
      sourceFile: r[i.sourceFile],
    }));
  return cache;
}

export const byCounterparty = (name: string) =>
  loadGold().filter((r) => r.counterparty.toLowerCase() === name.toLowerCase());
export const aboveAmount = (min: number) => loadGold().filter((r) => r.amount > min);
export const counterpartyNames = () => [...new Set(loadGold().map((r) => r.counterparty))];