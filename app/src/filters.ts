// Filter state + row subsetting for the single-serotype head-to-head views.
//
// The tool now focuses on ONE serotype at a time, comparing a reference vaccine
// against one or more comparators. Population is derived from the timepoint
// label (as in the source data), and the remaining controls (schedule, phase,
// sponsor, trial) narrow the set of trial arms that feed the two charts.

import { Row, sortNatural } from "./data";
import { buildArms, availableComparators } from "./arms";

export type Population = "Child" | "Adult" | "All";
export type Metric = "gmc" | "opa";
export type ViewMode = "pooled" | "individual";

export interface FilterState {
  serotype: string;
  refVax: string;
  comparators: string[];
  population: Population;
  metric: Metric;
  view: ViewMode;
  schedules: string[]; // empty = all
  phases: string[];
  sponsors: string[];
  studyIds: string[];
}

export const assayOf = (m: Metric): string => (m === "gmc" ? "GMC" : "OPA");

// ---- option lists -----------------------------------------------------------

export function allVaccines(rows: Row[]): string[] {
  return sortNatural([...new Set(rows.map((r) => r.vaccine))].filter(Boolean));
}

export function allSerotypes(rows: Row[]): string[] {
  return sortNatural([...new Set(rows.map((r) => r.serotype))].filter(Boolean));
}

export function allPhases(rows: Row[]): string[] {
  return sortNatural([...new Set(rows.map((r) => r.phase))].filter(Boolean));
}

// Vaccines that have any data for this serotype + assay (candidate references).
export function vaccinesForSerotype(rows: Row[], serotype: string, metric: Metric): string[] {
  const assay = assayOf(metric);
  return sortNatural(
    [
      ...new Set(
        rows
          .filter((r) => r.serotype === serotype && r.assay === assay && r.value != null)
          .map((r) => r.vaccine),
      ),
    ].filter(Boolean),
  );
}

// Comparators that co-occur with the reference in a shared arm for this serotype.
export function comparatorOptions(rows: Row[], s: FilterState): string[] {
  const assay = assayOf(s.metric);
  const sub = rows.filter((r) => r.assay === assay);
  const arms = buildArms(sub, s.serotype, assay);
  return sortNatural(availableComparators(arms, s.refVax));
}

// Schedule / sponsor / trial options within the current vaccine + serotype scope.
function scopeRows(rows: Row[], s: FilterState): Row[] {
  const assay = assayOf(s.metric);
  const inScope = new Set([s.refVax, ...s.comparators]);
  return rows.filter(
    (r) =>
      r.serotype === s.serotype &&
      r.assay === assay &&
      r.value != null &&
      inScope.has(r.vaccine) &&
      (s.population === "All" || /adult/i.test(r.dose_description) === (s.population === "Adult")),
  );
}

export function scheduleOptions(rows: Row[], s: FilterState): string[] {
  return sortNatural([...new Set(scopeRows(rows, s).map((r) => r.schedule))].filter(Boolean));
}
export function sponsorOptions(rows: Row[], s: FilterState): string[] {
  return sortNatural([...new Set(scopeRows(rows, s).map((r) => r.sponsor))].filter(Boolean));
}
export function studyIdOptions(rows: Row[], s: FilterState): string[] {
  return sortNatural([...new Set(scopeRows(rows, s).map((r) => r.study_id))].filter(Boolean));
}

// ---- row subset that feeds the charts --------------------------------------

export function filteredRows(rows: Row[], s: FilterState): Row[] {
  const assay = assayOf(s.metric);
  const inScope = new Set([s.refVax, ...s.comparators]);
  const sponsors = new Set(s.sponsors);
  const studies = new Set(s.studyIds);
  const phases = new Set(s.phases);
  const schedules = new Set(s.schedules);
  return rows.filter(
    (r) =>
      r.serotype === s.serotype &&
      r.assay === assay &&
      r.value != null &&
      inScope.has(r.vaccine) &&
      (s.population === "All" || /adult/i.test(r.dose_description) === (s.population === "Adult")) &&
      (s.schedules.length === 0 || schedules.has(r.schedule)) &&
      phases.has(r.phase) &&
      sponsors.has(r.sponsor) &&
      studies.has(r.study_id),
  );
}
