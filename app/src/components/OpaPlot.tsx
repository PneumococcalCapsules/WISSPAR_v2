// OPA (functional antibody) plot: facet sponsor (rows) x serotype (cols),
// study lines grouped by study_age. Log y-axis, no threshold line.

import { useMemo } from "react";
import { Row, sortNatural, uniqueInOrder } from "../data";
import { buildColorMap } from "../plot/palette";
import { buildFacetFigure, FacetPlot } from "./FacetGrid";
import { makeLineTraces, makePointTraces } from "../plot/xyTraces";

export function OpaPlot({ data }: { data: Row[] }) {
  const figure = useMemo(() => {
    if (data.length === 0) return null;
    const vaxOrder = sortNatural([...new Set(data.map((r) => r.vax))]);
    const colorMap = buildColorMap(vaxOrder);
    const colKeys = sortNatural([...new Set(data.map((r) => r.serotype))]);
    const rowKeys = uniqueInOrder(data, "sponsor");
    const shownVax = new Set<string>();

    return buildFacetFigure({
      rowKeys,
      colKeys,
      title: "Functional antibody (OPA) by product",
      buildCell: (rowKey, colKey) => {
        const cellRows = data.filter((r) => r.serotype === colKey && r.sponsor === rowKey);
        return [
          ...makeLineTraces(cellRows, vaxOrder, "study_age"),
          ...makePointTraces(cellRows, vaxOrder, colorMap, shownVax),
        ];
      },
      xaxis: { type: "category", categoryorder: "array", categoryarray: vaxOrder, tickangle: 90 },
      yaxis: { type: "log", title: { text: "OPA GMT" }, tickformat: ".2f" },
      colTitle: (k) => k,
      rowTitle: (k) => k,
    });
  }, [data]);

  if (!figure) return <div className="wisspar-empty">No OPA data for the current selection.</div>;

  const nrows = Math.max(1, uniqueInOrder(data, "sponsor").length);
  const height = Math.max(380, nrows * 240 + 80);
  return <FacetPlot figure={figure} height={height} />;
}
