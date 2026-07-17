#!/usr/bin/env node
// Fetches the WISSPAR PCV-antibodies export, applies the same transforms the
// original Shiny app (DanWeinberger/PCV_antibodies, app.R) applied, and writes
// an analysis-ready JSON snapshot to data/wisspar_export.json.
//
// Zero dependencies so it can run in CI without `npm install`.
// Usage: node scripts/fetch-data.mjs [--out <path>] [--from <local.csv>]

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPORT_URL =
  "https://github.com/PneumococcalCapsules/WISSPAR/raw/refs/heads/main/data/wisspar_export_production.csv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// ---- minimal RFC-4180-ish CSV parser (handles quotes, escaped quotes, CRLF) ----
function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); field = ""; row = [];
    } else if (c === "\r") {
      // swallow; handled by \n
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function stripPrefix(name) {
  return name
    .replace(/^outcome_overview_/, "")
    .replace(/^study_eligibility_/, "")
    .replace(/^clinical_trial_/, "");
}

function toNumOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "" || s.toUpperCase() === "NA") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeSponsor(s) {
  if (s === "Wyeth is now a wholly owned subsidiary of Pfizer") return "Pfizer";
  if (/Merck/.test(s)) return "Merck";
  return s;
}

function transform(rows) {
  const header = rows[0].map(stripPrefix);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const get = (r, key) => (idx[key] === undefined ? "" : r[idx[key]] ?? "");

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 1 && row[0] === "") continue;

    let vaccine = get(row, "vaccine");
    if (vaccine === "PCV13") vaccine = "PCV13 (Pfizer)";

    let assay = get(row, "assay");
    if (assay === "IgG") assay = "GMC";

    const sponsor = normalizeSponsor(get(row, "sponsor"));

    let doseDescription = get(row, "dose_description");
    if (doseDescription === "1m post primary series child")
      doseDescription = "1m post primary child";

    const studyId = get(row, "study_id");
    const standardAgeList = get(row, "standard_age_list");
    const value = toNumOrNull(get(row, "value"));

    out.push({
      study_id: studyId,
      sponsor,
      phase: get(row, "phase"),
      location_continent: get(row, "location_continent"),
      standard_age_list: standardAgeList,
      time_frame: get(row, "time_frame"),
      assay,
      dose_number: toNumOrNull(get(row, "dose_number")),
      serotype: get(row, "serotype"),
      value,
      upper_limit: toNumOrNull(get(row, "upper_limit")),
      lower_limit: toNumOrNull(get(row, "lower_limit")),
      vaccine,
      vax: vaccine,
      dose_description: doseDescription,
      schedule: get(row, "schedule"),
      time_frame_weeks: toNumOrNull(get(row, "time_frame_weeks")),
      // derived (mirrors app.R)
      study_age: `${studyId}${standardAgeList}`,
      Response: value === null ? null : Math.round(value * 100) / 100,
      LogResponse: value === null || value <= 0 ? null : Math.round(Math.log(value) * 100) / 100,
      dose_descr_sponsor: `${doseDescription}, Sponsor:${sponsor},  ${studyId}`,
    });
  }
  // drop rows with blank vaccine (app.R filters all.vax != '')
  return out.filter((d) => d.vaccine !== "");
}

async function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf("--out");
  const fromFlag = args.indexOf("--from");
  const outPath = outFlag >= 0 ? resolve(args[outFlag + 1]) : resolve(REPO_ROOT, "data/wisspar_export.json");
  const fromPath = fromFlag >= 0 ? resolve(args[fromFlag + 1]) : null;

  let csvText;
  if (fromPath) {
    console.error(`Reading local CSV: ${fromPath}`);
    csvText = readFileSync(fromPath, "utf8");
  } else {
    console.error(`Fetching: ${EXPORT_URL}`);
    const res = await fetch(EXPORT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching export endpoint`);
    csvText = await res.text();
  }

  const rows = parseCSV(csvText);
  const data = transform(rows);

  mkdirSync(dirname(outPath), { recursive: true });
  // compact JSON to keep the committed file small
  writeFileSync(outPath, JSON.stringify(data));
  console.error(`Wrote ${data.length} rows -> ${outPath}`);

  // diagnostics
  const uniq = (k) => [...new Set(data.map((d) => d[k]))].filter((v) => v !== "" && v !== null);
  console.error("vaccines:", uniq("vaccine").sort());
  console.error("assays:", uniq("assay"));
  console.error("phases:", uniq("phase"));
  console.error("sponsors:", uniq("sponsor").sort());
  console.error("serotypes:", uniq("serotype").length, "distinct");
}

main().catch((e) => { console.error(e); process.exit(1); });
