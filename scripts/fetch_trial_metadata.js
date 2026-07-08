// Downloads ClinicalTrials.gov API v2 data for every NCT number in the WISSPAR
// dataset. Writes two things:
//   1. data/trials_meta.json         — a compact search index (one row per trial)
//                                       that powers the fast list/filter on the
//                                       "Look up a trial" page.
//   2. data/trials/<NCT>.json         — the full study record (protocol + results)
//                                       for each trial, loaded on demand when the
//                                       user opens a record in the detail panel.
// Re-run to refresh:  node scripts/fetch_trial_metadata.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "data", "wisspar_export.json");
const OUT_INDEX = path.join(ROOT, "data", "trials_meta.json");
const OUT_DIR = path.join(ROOT, "data", "trials");

const uniq = (a) => [...new Set(a.filter(Boolean))];

// Build the compact search-index row from a full study record.
function toIndexRow(d, nctId) {
  const p = d.protocolSection || {};
  const id = p.identificationModule || {};
  const st = p.statusModule || {};
  const sp = p.sponsorCollaboratorsModule || {};
  const de = p.designModule || {};
  const co = p.conditionsModule || {};
  const ai = p.armsInterventionsModule || {};
  const cl = p.contactsLocationsModule || {};
  const ds = p.descriptionModule || {};
  const locations = cl.locations || [];

  return {
    nctId: id.nctId || nctId,
    title: id.briefTitle || id.officialTitle || nctId,
    officialTitle: id.officialTitle || "",
    status: st.overallStatus || "",
    phase: (de.phases || []).join(", "),
    studyType: de.studyType || "",
    enrollment: de.enrollmentInfo ? de.enrollmentInfo.count : null,
    startDate: (st.startDateStruct || {}).date || "",
    completionDate: (st.completionDateStruct || {}).date || "",
    sponsor: (sp.leadSponsor || {}).name || "",
    collaborators: uniq((sp.collaborators || []).map((c) => c.name)),
    conditions: co.conditions || [],
    interventions: uniq((ai.interventions || []).map((i) =>
      i.name ? `${i.type ? i.type + ": " : ""}${i.name}` : null)),
    countries: uniq(locations.map((l) => l.country)),
    briefSummary: ds.briefSummary || "",
    hasResults: !!d.hasResults,
    url: `https://clinicaltrials.gov/study/${id.nctId || nctId}`,
  };
}

async function fetchOne(nctId) {
  // No `fields` param → return the complete study record (protocol + results).
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${nctId}: HTTP ${res.status}`);
  return res.json();
}

(async function () {
  const rows = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const ncts = uniq(rows.map((r) => r.study_id)).filter((x) => /^NCT/.test(x)).sort();
  console.log(`Fetching metadata for ${ncts.length} trials…`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const index = [];
  for (const nct of ncts) {
    try {
      const study = await fetchOne(nct);
      // Full record for the detail panel (drop the bulky historical-changes noise
      // if present; keep protocol, results, derived, and document sections).
      const detail = {
        nctId: nct,
        hasResults: !!study.hasResults,
        protocolSection: study.protocolSection || {},
        resultsSection: study.resultsSection || null,
        derivedSection: study.derivedSection || null,
        documentSection: study.documentSection || null,
      };
      fs.writeFileSync(path.join(OUT_DIR, `${nct}.json`), JSON.stringify(detail));
      index.push(toIndexRow(study, nct));
      process.stdout.write(".");
    } catch (e) {
      console.error(`\n  ! ${e.message}`);
      index.push({ nctId: nct, title: nct, url: `https://clinicaltrials.gov/study/${nct}`, _error: true });
    }
  }
  index.sort((a, b) => a.nctId.localeCompare(b.nctId));
  fs.writeFileSync(OUT_INDEX, JSON.stringify(index));
  console.log(`\nWrote ${index.length} index rows to ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`Wrote ${index.filter((r) => !r._error).length} detail files to ${path.relative(ROOT, OUT_DIR)}/`);
})();
