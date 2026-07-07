// GMC concentration plot (ELISA or ECL sub-tab).
// ELISA: facet dose_description (rows) x serotype (cols).
// ECL:   facet ~serotype (single row).  Dashed threshold line at GMC = 0.35.

import { useMemo } from "react";
import { Row, sortNatural, uniqueInOrder } from "../data";
import { buildColorMap } from "../plot/palette";
import { buildFacetFigure, FacetPlot } from "./FacetGrid";
import { makeLineTraces, makePointTraces } from "../plot/xyTraces";

export function GmcPlot({
  data,
  rowByDose,
  emptyMessage,
}: {
  data: Row[];
  rowByDose: boolean; // true = ELISA (dose rows), false = ECL (single row)
  emptyMessage: string;
}) {
  const figure = useMemo(() => {
    if (data.length === 0) return null;
    const vaxOrder = sortNatural([...new Set(data.map((r) => r.vax))]);
    const colorMap = buildColorMap(vaxOrder);
    const colKeys = sortNatural([...new Set(data.map((r) => r.serotype))]);
    const rowKeys = rowByDose ? uniqueInOrder(data, "dose_description") : [""];
    const shownVax = new Set<string>();

    return buildFacetFigure({
      rowKeys,
      colKeys,
      title: "Antibody concentration (GMC) by product",
      buildCell: (rowKey, colKey) => {
        const cellRows = data.filter(
          (r) => r.serotype === colKey && (!rowByDose || r.dose_description === rowKey),
        );
        return [
          ...makeLineTraces(cellRows, vaxOrder, "study_id"),
          ...makePointTraces(cellRows, vaxOrder, colorMap, shownVax),
        ];
      },
      cellShapes: (_r, _c, xref, yref) => [
        {
          type: "line",
          xref: `${xref} domain`,
          yref,
          x0: 0,
          x1: 1,
          y0: 0.35,
          y1: 0.35,
          line: { color: "gray", width: 1, dash: "dash" },
        },
      ],
      xaxis: { type: "category", categoryorder: "array", categoryarray: vaxOrder, tickangle: 90 },
      yaxis: { type: "log", title: { text: "GMC" }, tickformat: ".2f" },
      colTitle: (k) => k,
      rowTitle: rowByDose ? (k) => k : undefined,
    });
  }, [data, rowByDose]);

  if (!figure) return <div className="wisspar-empty">{emptyMessage}</div>;

  const nrows = rowByDose ? uniqueInOrder(data, "dose_description").length : 1;
  const height = Math.max(380, nrows * 240 + 80);
  return <FacetPlot figure={figure} height={height} />;
}
