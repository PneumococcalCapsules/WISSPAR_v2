// Shared visual language for the single-serotype head-to-head charts
// (DumbbellPlot + RatioForest). Light-mode only, to match the host Quarto page.
//
// Color rule: BLUE is always the reference vaccine. Each comparator keeps a
// fixed hue drawn from a CVD-validated categorical set, assigned by the
// vaccine's position in the (reference-excluded) master vaccine order — so a
// comparator's color does not shuffle as you toggle other comparators on/off.

export const REF_COLOR = "#2a78d6"; // blue — reserved for the reference

// orange, aqua, violet, yellow, magenta, red, green — validated for CVD on white
export const COMP_SLOTS = [
  "#eb6834",
  "#149669",
  "#4a3aa7",
  "#b97a00",
  "#d25a82",
  "#e34948",
  "#008300",
];

// Curated priority order so the common comparators land on the best-separated,
// CVD-validated slots (PCV15 orange, PCV20 aqua, PCV7 violet, …) rather than
// wherever they fall in the raw alphabetical vaccine list.
const VAX_PRIORITY = [
  "PCV15",
  "PCV20",
  "PCV7",
  "PCV10 (Synflorix)",
  "PCV10 (Pneumosil)",
  "PCV21(Merck V116)",
  "PCV13 (Pfizer)",
  "PCV13 (Walvax)",
];

// Stable comparator color: depends only on the reference (which owns blue) and
// the curated vaccine order, so a comparator's hue does not shuffle as other
// comparators are toggled on/off.
export function comparatorColor(
  vaccine: string,
  refVax: string,
  allVax: string[],
): string {
  const canonical = [
    ...VAX_PRIORITY.filter((v) => allVax.includes(v)),
    ...allVax.filter((v) => !VAX_PRIORITY.includes(v)),
  ];
  const order = canonical.filter((v) => v !== refVax);
  const i = order.indexOf(vaccine);
  return COMP_SLOTS[(i < 0 ? 0 : i) % COMP_SLOTS.length];
}

// Ink / chrome tokens (match styles.css light theme).
export const INK = "#363636";
export const INK_2 = "#6b6b6b";
export const MUTED = "#6e6c64";
export const GRID = "#eef0f2";
export const AXIS = "#c9c8c0";
export const CARD = "#ffffff";

// ---- log scale + ticks --------------------------------------------------
const log10 = Math.log10;

export function niceLogDomain(lo: number, hi: number): [number, number] {
  const dmin = Math.pow(10, Math.floor(log10(lo)));
  const dmax = Math.pow(10, Math.ceil(log10(hi)));
  return [dmin, dmax === dmin ? dmin * 10 : dmax];
}

// Linear map from log10(value) to pixels.
export function logScale(dmin: number, dmax: number, px0: number, px1: number) {
  const a = log10(dmin);
  const b = log10(dmax);
  return (v: number) => px0 + ((log10(v) - a) / (b - a)) * (px1 - px0);
}

export function logTicks(min: number, max: number): number[] {
  const mult = [1, 2, 3, 5];
  const out: number[] = [];
  for (let k = -3; k <= 5; k++) {
    for (const m of mult) {
      const v = m * Math.pow(10, k);
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

export function fmtTick(v: number): string {
  if (v >= 1) return v % 1 === 0 ? String(v) : v.toFixed(v < 10 ? 1 : 0);
  if (v < 0.1) return v.toFixed(2);
  return String(+v.toFixed(2));
}

// Ratio-axis tick label: "÷2", "1", "2×".
export function fmtRatioTick(v: number): string {
  if (Math.abs(v - 1) < 1e-9) return "1";
  if (v < 1) return "÷" + +(1 / v).toFixed(1 / v < 3 ? 1 : 0);
  return +v.toFixed(v < 3 ? 1 : 0) + "×";
}

// ---- timepoint labels ---------------------------------------------------
const TP_LABELS: Record<string, string> = {
  "1m post dose 1 adult": "Post-dose 1",
  "1m post primary child": "Post-primary",
  "1m post boost child": "Post-booster",
  "1m post 2nd primary dose child": "Post-2nd dose",
  "pre-boost child": "Pre-booster",
  "1m post dose 2 child": "Post-dose 2",
  "1m post dose 1 child": "Post-dose 1",
  "12m post boost child": "12m post-booster",
};

export function shortTimepoint(tp: string): string {
  return TP_LABELS[tp] ?? tp;
}

export function shortSchedule(sched: string): string {
  return sched.replace(/ (child|adult)$/, "");
}

export function shortVaccine(v: string): string {
  return v.replace(/\s*\(.*\)/, "");
}
