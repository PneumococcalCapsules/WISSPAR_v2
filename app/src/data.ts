// Data types and loading for the WISSPAR immunogenicity tool.
// The JSON is produced by scripts/fetch-data.mjs and already carries the
// transforms from the original Shiny app (app.R).

export interface Row {
  study_id: string;
  sponsor: string;
  phase: string;
  location_continent: string;
  standard_age_list: string;
  time_frame: string;
  assay: string; // "GMC" | "OPA"
  dose_number: number | null;
  serotype: string;
  value: number | null;
  upper_limit: number | null;
  lower_limit: number | null;
  vaccine: string;
  vax: string;
  dose_description: string;
  schedule: string;
  time_frame_weeks: number | null;
  study_age: string;
  Response: number | null;
  LogResponse: number | null;
  dose_descr_sponsor: string;
}

export async function loadData(url: string): Promise<Row[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load data (HTTP ${res.status})`);
  return (await res.json()) as Row[];
}

// Natural / numeric-aware sort matching R's stringr::str_sort(numeric = TRUE).
// Handles serotypes like "4", "6A", "6B", "14", "19F", "23F" and vaccine names.
export function naturalCompare(a: string, b: string): number {
  const re = /(\d+|\D+)/g;
  const ax = String(a).match(re) ?? [];
  const bx = String(b).match(re) ?? [];
  const n = Math.max(ax.length, bx.length);
  for (let i = 0; i < n; i++) {
    const as = ax[i];
    const bs = bx[i];
    if (as === undefined) return -1;
    if (bs === undefined) return 1;
    const an = Number(as);
    const bn = Number(bs);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) {
      if (an !== bn) return an - bn;
    } else if (as !== bs) {
      return as < bs ? -1 : 1;
    }
  }
  return 0;
}

export function sortNatural(values: string[]): string[] {
  return [...values].sort(naturalCompare);
}

export function uniqueSorted(rows: Row[], key: keyof Row): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (v !== "" && v !== null && v !== undefined) set.add(String(v));
  }
  return sortNatural([...set]);
}

// Preserve first-seen order (used where the Shiny app relied on unique()).
export function uniqueInOrder(rows: Row[], key: keyof Row): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const v = r[key];
    if (v === "" || v === null || v === undefined) continue;
    const s = String(v);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
