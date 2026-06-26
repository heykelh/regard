"use client";

import * as duckdb from "@duckdb/duckdb-wasm";
import type { ExposureRecord } from "@/lib/types";

let connPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;

async function init(): Promise<duckdb.AsyncDuckDBConnection> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: "text/javascript" })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  const conn = await db.connect();

  // La table gold est servie statiquement depuis /public/data
  const res = await fetch("/data/exposures_gold.csv");
  if (!res.ok) throw new Error(`exposures_gold.csv introuvable (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  await db.registerFileBuffer("exposures_gold.csv", buf);

  // Schéma explicite : on fige les types et on préserve le camelCase des colonnes
  await conn.query(`
    CREATE TABLE exposures AS
    SELECT
      CAST("id" AS VARCHAR)            AS id,
      CAST("counterparty" AS VARCHAR)  AS counterparty,
      CAST("amount" AS DOUBLE)         AS amount,
      CAST("currency" AS VARCHAR)      AS currency,
      CAST("asOf" AS VARCHAR)          AS "asOf",
      CAST("qualityScore" AS DOUBLE)   AS "qualityScore",
      CAST("sourceFile" AS VARCHAR)    AS "sourceFile"
    FROM read_csv_auto('exposures_gold.csv', header = true);
  `);

  return conn;
}

function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!connPromise) connPromise = init();
  return connPromise;
}

// Arrow → objets JS plats, en convertissant les BigInt (COUNT, etc.) en number
function normalize<T>(rows: unknown[]): T[] {
  return rows.map((r) => {
    const o = (r as { toJSON?: () => Record<string, unknown> }).toJSON?.() ?? (r as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = typeof v === "bigint" ? Number(v) : v;
    return out as T;
  });
}

export async function runQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await getConnection();
  const table = await conn.query(sql);
  return normalize<T>(table.toArray());
}

export async function getAllExposures(): Promise<ExposureRecord[]> {
  return runQuery<ExposureRecord>(
    `SELECT * FROM exposures ORDER BY "asOf" DESC, counterparty;`
  );
}

export async function getExposuresByCounterparty(name: string): Promise<ExposureRecord[]> {
  const conn = await getConnection();
  const stmt = await conn.prepare(
    `SELECT * FROM exposures WHERE lower(counterparty) = lower(?) ORDER BY "asOf" DESC;`
  );
  const table = await stmt.query(name);
  await stmt.close();
  return normalize<ExposureRecord>(table.toArray());
}

export interface CounterpartySummary {
  counterparty: string;
  exposureCount: number;
  totalAmount: number;
  avgQuality: number;
}

export async function getCounterpartySummaries(): Promise<CounterpartySummary[]> {
  return runQuery<CounterpartySummary>(`
    SELECT
      counterparty,
      COUNT(*)                       AS "exposureCount",
      SUM(amount)                    AS "totalAmount",
      ROUND(AVG("qualityScore"), 3)  AS "avgQuality"
    FROM exposures
    GROUP BY counterparty
    ORDER BY "totalAmount" DESC;
  `);
}

export interface QualityBucketCount {
  bucket: "high" | "medium" | "low";
  count: number;
}

export async function getQualityDistribution(): Promise<QualityBucketCount[]> {
  return runQuery<QualityBucketCount>(`
    SELECT bucket, COUNT(*) AS count FROM (
      SELECT CASE
        WHEN "qualityScore" >= 0.9 THEN 'high'
        WHEN "qualityScore" >= 0.7 THEN 'medium'
        ELSE 'low'
      END AS bucket
      FROM exposures
    ) GROUP BY bucket;
  `);
}

export interface DataSpan {
  minAsOf: string;
  maxAsOf: string;
  total: number;
}

export async function getDataSpan(): Promise<DataSpan> {
  const [row] = await runQuery<DataSpan>(`
    SELECT MIN("asOf") AS "minAsOf", MAX("asOf") AS "maxAsOf", COUNT(*) AS total
    FROM exposures;
  `);
  return row;
}