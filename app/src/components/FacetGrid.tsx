// Builds a ggplot-style facet grid out of Plotly subplots. Plotly has no native
// facet_grid, so this lays out an (rows x cols) grid of linked axes, assigns each
// cell its own xaxis/yaxis, draws column strip labels on top and row strip labels
// on the right, and stamps per-cell shapes (e.g. the 0.35 GMC threshold line).

import { Plot } from "../plot/plotly";

export interface FacetOpts {
  rowKeys: string[];
  colKeys: string[];
  // Traces for a cell. Do NOT set xaxis/yaxis — the grid assigns them.
  buildCell: (rowKey: string, colKey: string) => any[];
  // Per-cell shapes; receives the axis refs to attach to (e.g. "x3", "y3").
  cellShapes?: (rowKey: string, colKey: string, xref: string, yref: string) => any[];
  // Per-cell annotations (data-space text inside a cell).
  cellAnnotations?: (rowKey: string, colKey: string, xref: string, yref: string) => any[];
  xaxis?: any; // base per-cell x-axis props
  yaxis?: any; // base per-cell y-axis props
  matchX?: boolean; // share x range across cells (default true)
  matchY?: boolean; // share y range across cells (default true)
  colTitle?: (k: string) => string;
  rowTitle?: (k: string) => string;
  title?: string;
  xTitle?: string;
  yTitle?: string;
  showXLabelsAllRows?: boolean; // show x tick labels on every row, not just bottom
  height?: number;
}

export function buildFacetFigure(opts: FacetOpts): { data: any[]; layout: any } {
  const {
    rowKeys,
    colKeys,
    buildCell,
    cellShapes,
    cellAnnotations,
    xaxis = {},
    yaxis = {},
    matchX = true,
    matchY = true,
    colTitle,
    rowTitle,
    title,
    xTitle,
    yTitle,
    showXLabelsAllRows = false,
  } = opts;

  const nrows = Math.max(1, rowKeys.length);
  const ncols = Math.max(1, colKeys.length);

  const hasRowStrip = !!rowTitle && rowKeys.length >= 1;
  const rightPad = hasRowStrip ? 0.055 : 0.01;
  const topPad = colTitle ? 0.05 : 0.01;

  const colGap = ncols > 1 ? 0.035 : 0;
  const rowGap = nrows > 1 ? 0.06 : 0;

  const usableW = 1 - rightPad;
  const colW = (usableW - colGap * (ncols - 1)) / ncols;
  const usableTop = 1 - topPad;
  const rowH = (usableTop - rowGap * (nrows - 1)) / nrows;

  const data: any[] = [];
  const layout: any = {
    shapes: [],
    annotations: [],
    showlegend: true,
    legend: { orientation: "v", x: 1.02, y: 1, xanchor: "left" },
    margin: { l: 60, r: hasRowStrip ? 40 : 20, t: title ? 60 : 24, b: 60 },
    hovermode: "closest",
    font: { family: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", size: 12 },
    plot_bgcolor: "#ffffff",
    paper_bgcolor: "#ffffff",
  };
  if (title) layout.title = { text: title, x: 0.02, xanchor: "left", font: { size: 15 } };

  for (let ri = 0; ri < nrows; ri++) {
    const rowKey = rowKeys[ri] ?? "";
    const y1 = usableTop - ri * (rowH + rowGap);
    const y0 = y1 - rowH;

    for (let ci = 0; ci < ncols; ci++) {
      const colKey = colKeys[ci] ?? "";
      const x0 = ci * (colW + colGap);
      const x1 = x0 + colW;
      const n = ri * ncols + ci + 1;
      const suf = n === 1 ? "" : String(n);
      const xref = "x" + suf;
      const yref = "y" + suf;

      // Assign traces to this cell's axes.
      const traces = buildCell(rowKey, colKey) ?? [];
      for (const t of traces) {
        data.push({ ...t, xaxis: xref, yaxis: yref });
      }

      const isBottom = ri === nrows - 1;
      const isLeft = ci === 0;

      layout["xaxis" + suf] = {
        domain: [x0, x1],
        anchor: yref,
        showticklabels: showXLabelsAllRows || isBottom,
        automargin: true,
        ...xaxis,
        ...(matchX && n > 1 ? { matches: "x" } : {}),
      };
      layout["yaxis" + suf] = {
        domain: [Math.max(0, y0), Math.max(0, y1)],
        anchor: xref,
        showticklabels: isLeft,
        automargin: true,
        ...yaxis,
        ...(matchY && n > 1 ? { matches: "y" } : {}),
      };

      if (cellShapes) {
        for (const s of cellShapes(rowKey, colKey, xref, yref)) layout.shapes.push(s);
      }
      if (cellAnnotations) {
        for (const a of cellAnnotations(rowKey, colKey, xref, yref)) layout.annotations.push(a);
      }

      // Column strip label (top row only).
      if (colTitle && ri === 0) {
        layout.annotations.push({
          x: (x0 + x1) / 2,
          y: usableTop + 0.012,
          xref: "paper",
          yref: "paper",
          text: colTitle(colKey),
          showarrow: false,
          font: { size: 12, color: "#363636" },
          xanchor: "center",
          yanchor: "bottom",
        });
      }
      // Row strip label (right column only).
      if (rowTitle && ci === ncols - 1) {
        layout.annotations.push({
          x: 1 - rightPad + 0.012,
          y: (y0 + y1) / 2,
          xref: "paper",
          yref: "paper",
          text: rowTitle(rowKey),
          showarrow: false,
          font: { size: 11, color: "#363636" },
          xanchor: "left",
          yanchor: "middle",
          textangle: 90,
        });
      }
    }
  }

  if (xTitle) {
    layout.annotations.push({
      x: usableW / 2, y: -0.08, xref: "paper", yref: "paper",
      text: xTitle, showarrow: false, font: { size: 13 }, xanchor: "center",
    });
  }
  if (yTitle) {
    layout.annotations.push({
      x: -0.06, y: 0.5, xref: "paper", yref: "paper",
      text: yTitle, showarrow: false, font: { size: 13 }, xanchor: "center",
      yanchor: "middle", textangle: -90,
    });
  }

  return { data, layout };
}

export function FacetPlot({
  figure,
  height,
}: {
  figure: { data: any[]; layout: any };
  height: number;
}) {
  return (
    <Plot
      data={figure.data}
      layout={{ ...figure.layout, height, autosize: true }}
      useResizeHandler
      style={{ width: "100%", height }}
      config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
    />
  );
}
