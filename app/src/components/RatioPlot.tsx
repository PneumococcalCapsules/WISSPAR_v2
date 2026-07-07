// GMC / OPA ratio plot: comparator / reference immunogenicity ratio.
// Horizontal scatter (x = ratio, y = study), facet by serotype (rows),
// dashed reference line at ratio = 1, x-range 0.2-1.7, colored by serotype
// (Lancet palette), point symbol by dose_description.

import { useMemo } from "react";
import { sortNatural } from "../data";
import { RatioPoint } from "../ratio";
import { lancetColorMap, symbolMap } from "../plot/palette";
import { buildFacetFigure, FacetPlot } from "./FacetGrid";

export function RatioPlot({
  points,
  refVax,
  compVax,
  xTitle,
}: {
  points: RatioPoint[];
  refVax: string;
  compVax: string;
  xTitle: string;
}) {
  const figure = useMemo(() => {
    if (points.length === 0) return null;
    const rowKeys = sortNatural([...new Set(points.map((p) => p.serotype))]);
    const colorMap = lancetColorMap(rowKeys);
    const doseKeys = [...new Set(points.map((p) => p.dose_description))];
    const symMap = symbolMap(doseKeys);
    const lastRow = rowKeys[rowKeys.length - 1];

    return buildFacetFigure({
      rowKeys,
      colKeys: [""],
      title: `Comparison of ${refVax} to ${compVax}`,
      matchX: true,
      buildCell: (serotype) => {
        const pts = points.filter((p) => p.serotype === serotype);
        if (pts.length === 0) return [];
        return [
          {
            type: "scatter",
            mode: "markers",
            x: pts.map((p) => p.ratio),
            y: pts.map((p) => p.study_id),
            marker: {
              color: colorMap[serotype],
              size: 8,
              symbol: pts.map((p) => symMap[p.dose_description] ?? "circle"),
            },
            text: pts.map((p) => `${p.study_id} — ${p.dose_description}`),
            hovertemplate: "%{text}<br>Ratio: %{x:.2f}<extra></extra>",
            showlegend: false,
          },
        ];
      },
      cellShapes: (_r, _c, xref, yref) => [
        {
          type: "line",
          xref,
          yref: `${yref} domain`,
          x0: 1,
          x1: 1,
          y0: 0,
          y1: 1,
          line: { color: "gray", width: 1, dash: "dash" },
        },
      ],
      cellAnnotations: (serotype, _c, xref, yref) =>
        serotype === lastRow
          ? [
              {
                x: 1.4, xref, y: 0.5, yref: `${yref} domain`,
                text: `Higher immunogenicity for ${compVax}`,
                showarrow: false, xanchor: "left", font: { size: 10, color: "gray" },
              },
              {
                x: 0.6, xref, y: 0.5, yref: `${yref} domain`,
                text: `Higher immunogenicity for ${refVax}`,
                showarrow: false, xanchor: "right", font: { size: 10, color: "gray" },
              },
            ]
          : [],
      xaxis: { type: "linear", range: [0.2, 1.7], zeroline: false },
      yaxis: { type: "category", showticklabels: false },
      rowTitle: (k) => k,
      xTitle,
    });
  }, [points, refVax, compVax, xTitle]);

  if (!figure) return <div className="wisspar-empty">Head-to-head not available.</div>;

  const nrows = Math.max(1, new Set(points.map((p) => p.serotype)).size);
  const height = Math.max(360, nrows * 90 + 120);
  return <FacetPlot figure={figure} height={height} />;
}
