// Design B — head-to-head ratio forest for a single serotype.
// Each comparator becomes a point at its ratio to the reference on a log axis,
// with a line of no difference at 1 and a reference-advantage wash to its left.

import { CompRow, Point, ratioLnSE } from "../arms";
import {
  comparatorColor,
  INK,
  INK_2,
  MUTED,
  GRID,
  CARD,
  logScale,
  logTicks,
  fmtRatioTick,
  shortTimepoint,
  shortSchedule,
  shortVaccine,
} from "../plot/chart";
import { useTooltip, useContainerWidth } from "./chartHooks";

const ML = 208;
const MR = 52;
const MT = 30;
const MB = 44;
const LANE = 15;
const HEAD = 22;
const GAP = 24;
const POOL = 17;
const Z = 1.96;
const LN10 = Math.LN10;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function RatioForest({
  rows,
  refVax,
  allVax,
  comparators,
  emptyMessage,
  pooledSummary,
}: {
  rows: CompRow[];
  refVax: string;
  allVax: string[];
  comparators: string[];
  emptyMessage: string;
  pooledSummary: boolean;
}) {
  const { show, hide, node } = useTooltip();
  const [ref, W] = useContainerWidth(600);

  if (rows.length === 0) {
    return <div className="wf-empty" ref={ref as React.RefObject<HTMLDivElement>}>{emptyMessage}</div>;
  }

  const armH = (r: CompRow) => Math.max(22, r.comps.length * LANE + 6);
  const ratioOf = (r: CompRow, cp: Point) => cp.val / r.ref.val;

  // group by population
  const groups: { pop: string; rows: CompRow[]; comps: string[] }[] = [];
  for (const r of rows) {
    const g = groups[groups.length - 1];
    if (g && g.pop === r.pop) g.rows.push(r);
    else groups.push({ pop: r.pop, rows: [r], comps: [] });
  }
  for (const g of groups) {
    const set = new Set<string>();
    g.rows.forEach((r) => r.comps.forEach((c) => set.add(c.vaccine)));
    g.comps = comparators.filter((c) => set.has(c));
  }

  // symmetric log-ratio domain
  let maxAbs = 0;
  for (const r of rows) {
    for (const cp of r.comps) {
      const rr = ratioOf(r, cp);
      const l = Math.abs(Math.log10(rr));
      const se = ratioLnSE(r.ref, cp);
      const hi = se ? Math.abs(Math.log10(rr) + (Z * se) / LN10) : l;
      const lo = se ? Math.abs(Math.log10(rr) - (Z * se) / LN10) : l;
      maxAbs = Math.max(maxAbs, l, hi, lo);
    }
  }
  const bexp = Math.min(Math.max(Math.ceil(maxAbs * 10) / 10, 0.3), 1.05);
  const dmin = Math.pow(10, -bexp);
  const dmax = Math.pow(10, bexp);

  let inner = 0;
  for (const g of groups)
    inner += HEAD + g.rows.reduce((s, r) => s + armH(r), 0) + (pooledSummary ? POOL * g.comps.length + 12 : 0) + GAP;
  const H = MT + inner + MB;
  const plotW = W - ML - MR;
  const X = (v: number) => logScale(dmin, dmax, ML, ML + plotW)(clamp(v, dmin, dmax));

  const gridEls: JSX.Element[] = [];
  const tickEls: JSX.Element[] = [];
  const tset = new Set<number>([...logTicks(dmin, dmax), 1]);
  [...tset]
    .sort((a, b) => a - b)
    .forEach((v) => {
      if (v < dmin * 0.99 || v > dmax * 1.01) return;
      const one = Math.abs(v - 1) < 1e-9;
      gridEls.push(
        <line key={`g${v}`} x1={X(v)} x2={X(v)} y1={MT} y2={H - MB} stroke={one ? INK_2 : GRID}
          strokeWidth={one ? 1.4 : 1} strokeDasharray={one ? "5 4" : undefined} />,
      );
      tickEls.push(
        <text key={`t${v}`} x={X(v)} y={H - MB + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
          {fmtRatioTick(v)}
        </text>,
      );
    });

  const marks: JSX.Element[] = [];
  let y = MT + 4;
  for (const g of groups) {
    marks.push(
      <text key={`h${g.pop}`} x={6} y={y + 13} fontSize={12} fontWeight={650} fill={INK}
        letterSpacing="0.06em">
        {g.pop === "Child" ? "CHILDREN" : "ADULTS"}
      </text>,
    );
    y += HEAD;
    const logsByComp: Record<string, number[]> = {};
    g.comps.forEach((c) => (logsByComp[c] = []));
    for (const r of g.rows) {
      const h = armH(r);
      const yc = y + h / 2;
      const k = r.comps.length;
      r.comps.forEach((cp, j) => {
        const ly = yc + (j - (k - 1) / 2) * LANE;
        const rr = ratioOf(r, cp);
        const col = comparatorColor(cp.vaccine, refVax, allVax);
        logsByComp[cp.vaccine]?.push(Math.log(rr));
        const se = ratioLnSE(r.ref, cp);
        if (se) {
          const lo = Math.pow(10, Math.log10(rr) - (Z * se) / LN10);
          const hi = Math.pow(10, Math.log10(rr) + (Z * se) / LN10);
          marks.push(
            <line key={`${r.key}-w${j}`} x1={X(lo)} x2={X(hi)} y1={ly} y2={ly} stroke={col}
              strokeWidth={2} opacity={0.38} strokeLinecap="round" />,
          );
        }
        if (r.pooled) {
          const cx = X(rr);
          marks.push(
            <path key={`${r.key}-d${j}`}
              d={`M ${cx - 6} ${ly} L ${cx} ${ly - 6} L ${cx + 6} ${ly} L ${cx} ${ly + 6} Z`}
              fill={col} stroke={CARD} strokeWidth={1.5}
              onMouseMove={(e) => show(e, ratioTip(r, cp, rr, col))} onMouseLeave={hide}
              style={{ cursor: "default" }} />,
          );
          marks.push(
            <text key={`${r.key}-v${j}`} x={ML + plotW + 8} y={ly + 3.5} fontSize={10.5} fill={INK_2}>
              {rr.toFixed(2)}×
            </text>,
          );
        } else {
          marks.push(
            <circle key={`${r.key}-p${j}`} cx={X(rr)} cy={ly} r={5} fill={col} stroke={CARD}
              strokeWidth={1.5} onMouseMove={(e) => show(e, ratioTip(r, cp, rr, col))}
              onMouseLeave={hide} style={{ cursor: "default" }} />,
          );
        }
      });
      marks.push(
        <text key={`${r.key}-l`} x={ML - 12} y={yc + 3} textAnchor="end" fontSize={11.5} fill={INK_2}>
          {rowLabel(r)}
        </text>,
      );
      y += h;
    }

    if (pooledSummary && g.comps.length) {
      y += 6;
      marks.push(<line key={`pl${g.pop}`} x1={ML} x2={ML + plotW} y1={y - 3} y2={y - 3} stroke={GRID} strokeWidth={1} />);
      for (const cv of g.comps) {
        const arr = logsByComp[cv];
        if (!arr || !arr.length) {
          y += POOL;
          continue;
        }
        const gm = Math.exp(arr.reduce((s, x) => s + x, 0) / arr.length);
        const col = comparatorColor(cv, refVax, allVax);
        const ly = y + POOL / 2;
        const cx = X(gm);
        marks.push(
          <path key={`pd${g.pop}${cv}`}
            d={`M ${cx - 6} ${ly} L ${cx} ${ly - 6} L ${cx + 6} ${ly} L ${cx} ${ly + 6} Z`}
            fill={col} stroke={CARD} strokeWidth={1.5}
            onMouseMove={(e) =>
              show(
                e,
                `<div class="wf-tip-h"><span class="wf-tip-sw" style="background:${col}"></span>Pooled — ${cv}</div>` +
                  `<div class="wf-tip-r">${g.pop.toLowerCase()}s, geo-mean ratio <b>${gm.toFixed(2)}×</b></div>` +
                  `<div class="wf-tip-r">${arr.length} paired arms</div>`,
              )
            }
            onMouseLeave={hide} style={{ cursor: "default" }} />,
        );
        marks.push(
          <text key={`ptl${g.pop}${cv}`} x={ML - 12} y={ly + 3} textAnchor="end" fontSize={11.5}
            fontWeight={650} fill={INK_2}>
            {`Pooled · ${shortVaccine(cv)} (${arr.length})`}
          </text>,
        );
        marks.push(
          <text key={`ptv${g.pop}${cv}`} x={ML + plotW + 8} y={ly + 3.5} fontSize={10.5}
            fontWeight={650} fill={INK_2}>
            {gm.toFixed(2)}×
          </text>,
        );
        y += POOL;
      }
    }
    y += GAP;
  }

  return (
    <div className="wf-svg-scroll" ref={ref as React.RefObject<HTMLDivElement>}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" style={{ display: "block" }}>
        <rect x={ML} y={MT} width={X(1) - ML} height={H - MT - MB} fill="rgba(42,120,214,0.07)" />
        {gridEls}
        <text x={X(1) - 8} y={MT - 12} textAnchor="end" fontSize={12} fontWeight={600} fill={MUTED}>
          {`◄  ${refVax} higher`}
        </text>
        <text x={X(1) + 8} y={MT - 12} textAnchor="start" fontSize={12} fontWeight={600} fill={MUTED}>
          comparator higher  ►
        </text>
        {tickEls}
        {marks}
      </svg>
      {node}
    </div>
  );
}

function rowLabel(r: CompRow): string {
  if (r.pooled) {
    const s = `${shortVaccine(r.label)} · ${shortTimepoint(r.sublabel)} (${r.ref.n})`;
    return s.length > 34 ? s.slice(0, 33) + "…" : s;
  }
  const parts = r.sublabel.split(" · ");
  const s = `${shortTimepoint(parts[0])} · ${shortSchedule(parts[1] ?? "")}  ·${r.label.slice(-4)}`;
  return s.length > 34 ? s.slice(0, 33) + "…" : s;
}

function ratioTip(r: CompRow, cp: Point, rr: number, col: string): string {
  const dir = rr < 1 ? r.ref.vaccine : cp.vaccine;
  const head = r.pooled
    ? `<div class="wf-tip-h">${cp.vaccine} — ${shortTimepoint(r.sublabel)}</div><div class="wf-tip-r">${r.pop} · pooled across ${cp.n} arms</div>`
    : `<div class="wf-tip-h">${r.label} · ${shortTimepoint(r.sublabel.split(" · ")[0])}</div><div class="wf-tip-r">${r.pop}</div>`;
  const ci = (p: Point) =>
    p.lo != null ? ` <span style="color:${MUTED}">(${p.lo}–${p.hi})</span>` : "";
  return (
    head +
    `<div class="wf-tip-r">${r.ref.vaccine}: <b>${Math.round(r.ref.val * 100) / 100}</b>${ci(r.ref)}</div>` +
    `<div class="wf-tip-r"><span class="wf-tip-sw" style="background:${col}"></span>${cp.vaccine}: <b>${
      Math.round(cp.val * 100) / 100
    }</b>${ci(cp)}</div>` +
    `<div class="wf-tip-r" style="margin-top:3px">Ratio <b>${rr.toFixed(2)}×</b> — ${dir} higher</div>`
  );
}
