// Shared trace builders for the GMC and OPA "points + error bars + study lines"
// plots (geom_point + geom_errorbar + geom_line(group=study) in app.R).

import { Row } from "../data";

export function makePointTraces(
  cellRows: Row[],
  vaxOrder: string[],
  colorMap: Record<string, string>,
  shownVax: Set<string>,
): any[] {
  const traces: any[] = [];
  for (const vax of vaxOrder) {
    const pts = cellRows.filter((r) => r.vax === vax && r.value !== null);
    if (pts.length === 0) continue;
    traces.push({
      type: "scatter",
      mode: "markers",
      x: pts.map((p) => p.vax),
      y: pts.map((p) => p.Response),
      error_y: {
        type: "data",
        symmetric: false,
        array: pts.map((p) => (p.upper_limit != null && p.value != null ? p.upper_limit - p.value : 0)),
        arrayminus: pts.map((p) => (p.lower_limit != null && p.value != null ? p.value - p.lower_limit : 0)),
        color: colorMap[vax] ?? "#666",
        thickness: 1,
        width: 0,
      },
      marker: { color: colorMap[vax] ?? "#666", size: 7 },
      name: vax,
      legendgroup: vax,
      showlegend: !shownVax.has(vax),
      text: pts.map((p) => p.dose_descr_sponsor),
      hovertemplate: `%{text}<br>${vax}: %{y:.2f}<extra></extra>`,
    });
    shownVax.add(vax);
  }
  return traces;
}

export function makeLineTraces(
  cellRows: Row[],
  vaxOrder: string[],
  groupKey: "study_id" | "study_age",
): any[] {
  const order = new Map(vaxOrder.map((v, i) => [v, i]));
  const groups = new Map<string, Row[]>();
  for (const r of cellRows) {
    if (r.value === null) continue;
    const k = r[groupKey];
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const traces: any[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => (order.get(a.vax) ?? 0) - (order.get(b.vax) ?? 0));
    traces.push({
      type: "scatter",
      mode: "lines",
      x: sorted.map((p) => p.vax),
      y: sorted.map((p) => p.Response),
      line: { color: "rgba(150,150,150,0.6)", width: 1 },
      hoverinfo: "skip",
      showlegend: false,
    });
  }
  return traces;
}
