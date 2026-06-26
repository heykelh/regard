import fs from "node:fs";
import path from "node:path";
import { transform, type RawRow } from "./transform";

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

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const root = process.cwd();
const raw = fs.readFileSync(path.join(root, "pipeline", "raw", "exposures_raw.csv"), "utf8");
const [, ...dataRows] = parseCsv(raw);
const rawRows: RawRow[] = dataRows.map((r) => ({
  exposureId: r[0] ?? "", counterparty: r[1] ?? "", amount: r[2] ?? "", currency: r[3] ?? "", asOf: r[4] ?? "",
}));

const { kept, rejected, duplicatesDropped } = transform(rawRows);

// table gold → public/data (requêtable par DuckDB-WASM côté navigateur)
const goldHeader = "id,counterparty,amount,currency,asOf,qualityScore,sourceFile";
const goldLines = kept.map((r) =>
  [r.id, r.counterparty, r.amount, r.currency, r.asOf, r.qualityScore, r.sourceFile].map(csvCell).join(",")
);
const dataDir = path.join(root, "public", "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "exposures_gold.csv"), [goldHeader, ...goldLines].join("\n"), "utf8");

const avgQuality = kept.length ? kept.reduce((s, r) => s + r.qualityScore, 0) / kept.length : 0;
const byReason: Record<string, number> = {};
for (const r of rejected) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;

const report = {
  generatedAt: new Date().toISOString(),
  sourceFile: "exposures_raw.csv",
  totalRaw: rawRows.length,
  kept: kept.length,
  rejected: rejected.length,
  duplicatesDropped: duplicatesDropped.length,
  avgQuality: Math.round(avgQuality * 1000) / 1000,
  qualityBuckets: {
    high: kept.filter((r) => r.qualityScore >= 0.9).length,
    medium: kept.filter((r) => r.qualityScore >= 0.7 && r.qualityScore < 0.9).length,
    low: kept.filter((r) => r.qualityScore < 0.7).length,
  },
  rejectionsByReason: byReason,
  rejections: rejected,
};
fs.writeFileSync(path.join(dataDir, "quality_report.json"), JSON.stringify(report, null, 2), "utf8");

console.table({
  "lignes brutes": rawRows.length,
  "retenues (gold)": kept.length,
  "rejetées": rejected.length,
  "doublons écartés": duplicatesDropped.length,
  "qualité moyenne": report.avgQuality,
});
console.log("✓ public/data/exposures_gold.csv");
console.log("✓ public/data/quality_report.json");