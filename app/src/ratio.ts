// Comparator/reference immunogenicity ratio, ported from the plot_ratio /
// plot_ratio_opa reactives in app.R.
//
// app.R dcasts value by vaccine (mean-aggregated) keyed on:
//   GMC:  dose_description + schedule + study_id + serotype + assay
//   OPA:  dose_description +            study_id + serotype + assay
// then computes ratio = value(comparator) / value(reference) per key.

import { Row } from "./data";

export interface RatioPoint {
  study_id: string;
  serotype: string;
  dose_description: string;
  ratio: number;
}

export function computeRatios(
  rows: Row[],
  refVax: string,
  compVax: string,
  keyIncludesSchedule: boolean,
): RatioPoint[] {
  if (!refVax || !compVax || refVax === compVax) return [];

  interface Cell {
    study_id: string;
    serotype: string;
    dose_description: string;
    byVax: Map<string, { sum: number; n: number }>;
  }
  const cells = new Map<string, Cell>();

  for (const r of rows) {
    if (r.value === null) continue;
    const key = keyIncludesSchedule
      ? `${r.dose_description}${r.schedule}${r.study_id}${r.serotype}`
      : `${r.dose_description}${r.study_id}${r.serotype}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = {
        study_id: r.study_id,
        serotype: r.serotype,
        dose_description: r.dose_description,
        byVax: new Map(),
      };
      cells.set(key, cell);
    }
    const agg = cell.byVax.get(r.vaccine);
    if (agg) {
      agg.sum += r.value;
      agg.n += 1;
    } else {
      cell.byVax.set(r.vaccine, { sum: r.value, n: 1 });
    }
  }

  const points: RatioPoint[] = [];
  for (const cell of cells.values()) {
    const ref = cell.byVax.get(refVax);
    const comp = cell.byVax.get(compVax);
    if (!ref || !comp) continue;
    const refMean = ref.sum / ref.n;
    const compMean = comp.sum / comp.n;
    if (!(refMean > 0)) continue;
    const ratio = Math.round((compMean / refMean) * 100) / 100;
    if (!Number.isFinite(ratio)) continue;
    points.push({
      study_id: cell.study_id,
      serotype: cell.serotype,
      dose_description: cell.dose_description,
      ratio,
    });
  }
  return points;
}
