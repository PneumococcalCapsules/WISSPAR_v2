// Arm-level aggregation for the single-serotype head-to-head views.
//
// An "arm" is one trial x timepoint x schedule, within a single serotype and
// assay. Because a trial measures every product in the same population, all
// vaccines in an arm are a naturally paired comparison. We aggregate duplicate
// rows (e.g. repeated ECL/ELISA reads) to one estimate per vaccine per arm.

import { Row } from "./data";

export type Population = "Child" | "Adult";

export interface Point {
  vaccine: string;
  val: number;
  lo: number | null;
  hi: number | null;
  n: number; // rows aggregated (individual) or arms pooled (pooled)
}

export interface Arm {
  study: string;
  tp: string; // dose_description
  sched: string;
  pop: Population;
  vals: Record<string, Point>;
}

// A row to draw: one reference point + one or more comparator points that share
// the same population band. Individual rows are a single arm; pooled rows are a
// comparator x timepoint collapsed across studies.
export interface CompRow {
  pop: Population;
  label: string;
  sublabel: string;
  ref: Point;
  comps: Point[];
  pooled: boolean;
  key: string;
}

export function population(doseDescription: string): Population {
  return /adult/i.test(doseDescription) ? "Adult" : "Child";
}

const Z = 1.96;

export function lnSE(p: Point): number | null {
  if (p.lo != null && p.hi != null && p.lo > 0 && p.hi > 0) {
    return (Math.log(p.hi) - Math.log(p.lo)) / (2 * Z);
  }
  return null;
}

// Ratio (comparator / reference) log-space SE, when both arms report a CI.
export function ratioLnSE(ref: Point, comp: Point): number | null {
  const a = lnSE(ref);
  const b = lnSE(comp);
  if (a == null || b == null) return null;
  return Math.sqrt(a * a + b * b);
}

const geoMean = (xs: number[]): number =>
  Math.exp(xs.reduce((s, x) => s + Math.log(x), 0) / xs.length);

// Reject CI bounds that can't be a real CI for this point estimate: non-positive
// (0 is used in the source data to mean "not reported"), or inconsistent with the
// value itself (a source data-entry error, e.g. a different column copied in by
// mistake). An invalid CI is treated as absent rather than plotted, since a bad
// bound would both draw a nonsense whisker and drag the shared log-scale domain
// out to cover it, compressing every other arm's CI on the same chart.
function sanitizeCI(
  val: number,
  lo: number | null | undefined,
  hi: number | null | undefined,
): { lo: number | null; hi: number | null } {
  if (lo == null || hi == null || lo <= 0 || hi <= 0 || lo > val || hi < val) {
    return { lo: null, hi: null };
  }
  return { lo, hi };
}

// Build arms from an already row-filtered subset (phase / sponsor / study /
// schedule / timepoint filters applied by the caller). Only value > 0 rows in
// the requested assay contribute.
export function buildArms(rows: Row[], serotype: string, assay: string): Arm[] {
  const map = new Map<string, Arm>();
  for (const r of rows) {
    if (r.serotype !== serotype) continue;
    if (r.assay !== assay) continue;
    if (r.value == null || r.value <= 0) continue;
    const key = `${r.study_id}|${r.dose_description}|${r.schedule}`;
    let arm = map.get(key);
    if (!arm) {
      arm = {
        study: r.study_id,
        tp: r.dose_description,
        sched: r.schedule,
        pop: population(r.dose_description),
        vals: {},
      };
      map.set(key, arm);
    }
    const cur = arm.vals[r.vaccine];
    if (cur) {
      // running mean of the point estimate; drop CI once we aggregate (>1 read)
      cur.val = (cur.val * cur.n + r.value) / (cur.n + 1);
      cur.n += 1;
      cur.lo = null;
      cur.hi = null;
    } else {
      const val = Math.round(r.value * 100) / 100;
      const { lo, hi } = sanitizeCI(val, r.lower_limit, r.upper_limit);
      arm.vals[r.vaccine] = {
        vaccine: r.vaccine,
        val,
        lo,
        hi,
        n: 1,
      };
    }
  }
  return [...map.values()];
}

// Which comparators actually co-occur with the reference for this serotype.
export function availableComparators(arms: Arm[], refVax: string): string[] {
  const set = new Set<string>();
  for (const a of arms) {
    if (!a.vals[refVax]) continue;
    for (const v of Object.keys(a.vals)) if (v !== refVax) set.add(v);
  }
  return [...set];
}

// Canonical timepoint ordering (primary series -> booster -> late).
const TP_ORDER = [
  "1m post dose 1 child",
  "1m post dose 2 child",
  "1m post 2nd primary dose child",
  "1m post primary child",
  "pre-boost child",
  "1m post boost child",
  "12m post boost child",
  "1m post dose 1 adult",
];
const tpRank = (tp: string) => {
  const i = TP_ORDER.indexOf(tp);
  return i < 0 ? 99 : i;
};
const popRank = (p: Population) => (p === "Child" ? 0 : 1);

// Individual rows: one per arm that has the reference + >=1 selected comparator.
export function individualRows(
  arms: Arm[],
  refVax: string,
  comparators: string[],
): CompRow[] {
  const rows: CompRow[] = [];
  for (const a of arms) {
    const ref = a.vals[refVax];
    if (!ref) continue;
    const comps = comparators.map((c) => a.vals[c]).filter(Boolean) as Point[];
    if (comps.length === 0) continue;
    const sched = a.sched.replace(/ (child|adult)$/, "");
    rows.push({
      pop: a.pop,
      label: a.study,
      sublabel: [a.tp, sched].filter(Boolean).join(" · "),
      ref,
      comps,
      pooled: false,
      key: `${a.study}|${a.tp}|${a.sched}`,
    });
  }
  rows.sort(
    (x, y) =>
      popRank(x.pop) - popRank(y.pop) ||
      tpRank(x.sublabel) - tpRank(y.sublabel) ||
      x.sublabel.localeCompare(y.sublabel) ||
      x.label.localeCompare(y.label),
  );
  return rows;
}

// Pooled rows: geometric mean across studies, one row per
// population x timepoint x comparator.
export function pooledRows(
  arms: Arm[],
  refVax: string,
  comparators: string[],
): CompRow[] {
  interface Bucket {
    pop: Population;
    tp: string;
    comp: string;
    refVals: number[];
    compVals: number[];
  }
  const buckets = new Map<string, Bucket>();
  for (const a of arms) {
    const ref = a.vals[refVax];
    if (!ref) continue;
    for (const c of comparators) {
      const cv = a.vals[c];
      if (!cv) continue;
      const k = `${a.pop}|${a.tp}|${c}`;
      let b = buckets.get(k);
      if (!b) {
        b = { pop: a.pop, tp: a.tp, comp: c, refVals: [], compVals: [] };
        buckets.set(k, b);
      }
      b.refVals.push(ref.val);
      b.compVals.push(cv.val);
    }
  }
  const rows: CompRow[] = [];
  for (const b of buckets.values()) {
    const n = b.compVals.length;
    const refPt: Point = {
      vaccine: refVax,
      val: geoMean(b.refVals),
      lo: null,
      hi: null,
      n,
    };
    const compPt: Point = {
      vaccine: b.comp,
      val: geoMean(b.compVals),
      lo: null,
      hi: null,
      n,
    };
    rows.push({
      pop: b.pop,
      label: b.comp,
      sublabel: b.tp,
      ref: refPt,
      comps: [compPt],
      pooled: true,
      key: `${b.pop}|${b.tp}|${b.comp}`,
    });
  }
  rows.sort(
    (x, y) =>
      popRank(x.pop) - popRank(y.pop) ||
      tpRank(x.sublabel) - tpRank(y.sublabel) ||
      x.label.localeCompare(y.label),
  );
  return rows;
}
