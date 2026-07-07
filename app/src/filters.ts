// Filter cascade + plot-data subsetting, ported from the original Shiny app
// (DanWeinberger/PCV_antibodies, app.R). Each exported subset function mirrors
// one of the reactive({...}) blocks in that file.

import { Row, sortNatural, uniqueInOrder } from "./data";

export type AgeGroup = "Child" | "Adult";

export interface FilterState {
  vax: string[];
  serotypes: string[];
  age: AgeGroup;
  fineAge: string[];
  schedule: string[];
  dose: string; // single select
  pairedOnly: boolean;
  phase: string[];
  refVax: string;
  compVax: string;
  sponsors: string[];
  studyIds: string[];
}

// ---- Option lists for the cascading sidebar controls ------------------------

export function allVaccines(rows: Row[]): string[] {
  return sortNatural([...new Set(rows.map((r) => r.vaccine))].filter(Boolean));
}

export function allSerotypes(rows: Row[]): string[] {
  return sortNatural([...new Set(rows.map((r) => r.serotype))].filter(Boolean));
}

export function allPhases(rows: Row[]): string[] {
  return uniqueInOrder(rows, "phase");
}

export function fineAgeContainsChild(fineAge: string[]): boolean {
  return fineAge.some((a) => /Child/.test(a));
}

// standard_age_list values: "Child" -> those containing Child;
// "Adult" -> those containing Adult but NOT Child (matches app.R).
export function fineAgeOptions(rows: Row[], age: AgeGroup): string[] {
  const vals = [...new Set(rows.map((r) => r.standard_age_list))].filter(Boolean);
  if (age === "Adult") return vals.filter((v) => /Adult/.test(v) && !/Child/.test(v));
  return vals.filter((v) => /Child/.test(v));
}

export function scheduleOptions(rows: Row[], hasChild: boolean): string[] {
  const vals = [...new Set(rows.map((r) => r.schedule))].filter(Boolean);
  return vals.filter((v) => (hasChild ? /child/.test(v) : /adult/.test(v)));
}

export function doseOptions(rows: Row[], hasChild: boolean): string[] {
  const vals = [...new Set(rows.map((r) => r.dose_description))].filter(Boolean);
  return vals.filter((v) => (hasChild ? /child/.test(v) : /adult/.test(v)));
}

export function defaultDose(hasChild: boolean, options: string[]): string {
  const wanted = hasChild ? "1m post primary child" : "1m post dose 1 adult";
  return options.includes(wanted) ? wanted : options[0] ?? "";
}

// Sponsor / trial options are derived from the vaccine + dose + fine-age + phase
// subset (output$sponsor_name / output$study_id in app.R).
function sponsorStudySubset(rows: Row[], s: FilterState): Row[] {
  return rows.filter(
    (r) =>
      s.vax.includes(r.vaccine) &&
      r.dose_description === s.dose &&
      s.fineAge.includes(r.standard_age_list) &&
      s.phase.includes(r.phase),
  );
}

export function sponsorOptions(rows: Row[], s: FilterState): string[] {
  return sortNatural([...new Set(sponsorStudySubset(rows, s).map((r) => r.sponsor))].filter(Boolean));
}

export function studyIdOptions(rows: Row[], s: FilterState): string[] {
  return sortNatural([...new Set(sponsorStudySubset(rows, s).map((r) => r.study_id))].filter(Boolean));
}

// ---- Paired-observation gating ---------------------------------------------

function distinctVax(rows: Row[]): number {
  return new Set(rows.map((r) => r.vax)).size;
}

// Ungrouped gate (plot.ds.gmc / plot.ds.gmc_ecl / plot.ds.opa): keep everything
// only if the whole subset spans >= 2 vaccines.
function pairedGateWhole(sub: Row[], pairedOnly: boolean): Row[] {
  if (!pairedOnly) return sub;
  return distinctVax(sub) >= 2 ? sub : [];
}

// Grouped gate (plot.ds.gmc_elisa): keep groups (study/dose/age/schedule/phase/
// serotype) that span >= 2 vaccines.
function pairedGateGrouped(sub: Row[], pairedOnly: boolean): Row[] {
  const groups = new Map<string, Row[]>();
  for (const r of sub) {
    const k = [
      r.study_id,
      r.dose_description,
      r.location_continent,
      r.study_age,
      r.schedule,
      r.phase,
      r.serotype,
      r.assay,
    ].join("");
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out: Row[] = [];
  for (const g of groups.values()) {
    if (!pairedOnly || distinctVax(g) >= 2) out.push(...g);
  }
  return out;
}

// ---- Plot datasets ----------------------------------------------------------

export function gmcElisaData(rows: Row[], s: FilterState): Row[] {
  const sub = rows.filter(
    (r) =>
      s.vax.includes(r.vaccine) &&
      r.dose_description === s.dose &&
      s.fineAge.includes(r.standard_age_list) &&
      s.schedule.includes(r.schedule) &&
      s.phase.includes(r.phase) &&
      s.serotypes.includes(r.serotype) &&
      r.assay === "GMC" &&
      s.sponsors.includes(r.sponsor) &&
      r.sponsor !== "Merck" &&
      s.studyIds.includes(r.study_id),
  );
  return pairedGateGrouped(sub, s.pairedOnly);
}

export function gmcEclData(rows: Row[], s: FilterState): Row[] {
  const sub = rows.filter(
    (r) =>
      s.vax.includes(r.vaccine) &&
      r.dose_description === s.dose &&
      s.fineAge.includes(r.standard_age_list) &&
      s.schedule.includes(r.schedule) &&
      s.phase.includes(r.phase) &&
      s.serotypes.includes(r.serotype) &&
      r.assay === "GMC" &&
      s.sponsors.includes(r.sponsor) &&
      r.sponsor === "Merck" &&
      s.studyIds.includes(r.study_id),
  );
  return pairedGateWhole(sub, s.pairedOnly);
}

export function opaData(rows: Row[], s: FilterState): Row[] {
  const sub = rows.filter(
    (r) =>
      s.vax.includes(r.vaccine) &&
      r.dose_description === s.dose &&
      s.fineAge.includes(r.standard_age_list) &&
      s.phase.includes(r.phase) &&
      s.serotypes.includes(r.serotype) &&
      s.schedule.includes(r.schedule) &&
      r.assay === "OPA" &&
      s.sponsors.includes(r.sponsor) &&
      s.studyIds.includes(r.study_id),
  );
  return pairedGateWhole(sub, s.pairedOnly);
}

// Underlying data for the GMC ratio (plot.ds.gmc): includes Merck, no serotype
// facet split by assay type.
export function gmcRatioBase(rows: Row[], s: FilterState): Row[] {
  const sub = rows.filter(
    (r) =>
      s.vax.includes(r.vaccine) &&
      r.dose_description === s.dose &&
      s.fineAge.includes(r.standard_age_list) &&
      s.phase.includes(r.phase) &&
      s.schedule.includes(r.schedule) &&
      s.serotypes.includes(r.serotype) &&
      r.assay === "GMC" &&
      s.sponsors.includes(r.sponsor) &&
      s.studyIds.includes(r.study_id),
  );
  return pairedGateWhole(sub, s.pairedOnly);
}

export function anyMerckSelected(s: FilterState): boolean {
  return s.sponsors.includes("Merck");
}
