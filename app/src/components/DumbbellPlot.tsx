// Design A — paired dumbbells for a single serotype.
// One band per row (an individual trial arm, or a pooled comparator x timepoint).
// Each comparator sits on its own offset lane, joined to the reference by a bar.

import { CompRow, Point } from "../arms";
import {
  REF_COLOR,
  comparatorColor,
  INK,
  INK_2,
  MUTED,
  GRID,
  AXIS,
  CARD,
  niceLogDomain,
  logScale,
  logTicks,
  fmtTick,
  shortTimepoint,
  shortSchedule,
} from "../plot/chart";
import { useTooltip, useContainerWidth } from "./chartHooks";

const ML = 208;
const MR = 40;
const MT = 16;
const MB = 44;
const LANE = 15;
const HEAD = 22;
const GAP = 22;

function hasCI(p: Point): boolean {
  // A CI is only usable on a log axis when both bounds are positive and finite.
  return p.lo != null && p.hi != null && p.lo > 0 && p.hi > 0;
}
// Positive value for the log-scale domain: fall back to the point estimate when a
// CI bound is missing OR non-positive (0 lower bounds occur in the data and would
// send log10 to -Infinity, poisoning the whole scale with NaN).
function domLo(p: Point): number {
  return p.lo != null && p.lo > 0 ? p.lo : p.val;
}
function domHi(p: Point): number {
  return p.hi != null && p.hi > 0 ? p.hi : p.val;
}
function ciText(p: Point): string {
  return hasCI(p) ? ` <span style="color:${MUTED}">(${p.lo}–${p.hi})</span>` : "";
}

export function DumbbellPlot({
  rows,
  refVax,
  allVax,
  valueTitle,
  threshold,
  emptyMessage,
}: {
  rows: CompRow[];
  refVax: string;
  allVax: string[];
  valueTitle: string;
  threshold?: number;
  emptyMessage: string;
}) {
  const { show, showAtElement, hide, node } = useTooltip();
  const [ref, W] = useContainerWidth(600);

  if (rows.length === 0) {
    return <div className="wf-empty" ref={ref as React.RefObject<HTMLDivElement>}>{emptyMessage}</div>;
  }

  const armH = (r: CompRow) => Math.max(24, r.comps.length * LANE + 8);

  // group rows by population, preserving sorted order
  const groups: { pop: string; rows: CompRow[] }[] = [];
  for (const r of rows) {
    const g = groups[groups.length - 1];
    if (g && g.pop === r.pop) g.rows.push(r);
    else groups.push({ pop: r.pop, rows: [r] });
  }

  let inner = 0;
  for (const g of groups) inner += HEAD + g.rows.reduce((s, r) => s + armH(r), 0) + GAP;
  const H = MT + inner + MB;
  const plotW = W - ML - MR;

  // x domain
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    for (const p of [r.ref, ...r.comps]) {
      lo = Math.min(lo, domLo(p));
      hi = Math.max(hi, domHi(p));
    }
  }
  if (threshold != null) lo = Math.min(lo, threshold);
  const [dmin, dmax] = niceLogDomain(lo, hi);
  const X = logScale(dmin, dmax, ML, ML + plotW);

  const gridEls: JSX.Element[] = [];
  const tickEls: JSX.Element[] = [];
  for (const v of logTicks(dmin, dmax)) {
    gridEls.push(
      <line key={`g${v}`} x1={X(v)} x2={X(v)} y1={MT} y2={H - MB} stroke={GRID} strokeWidth={1} />,
    );
    tickEls.push(
      <text key={`t${v}`} x={X(v)} y={H - MB + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
        {fmtTick(v)}
      </text>,
    );
  }

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
    for (const r of g.rows) {
      const h = armH(r);
      const yc = y + h / 2;
      const k = r.comps.length;
      r.comps.forEach((cp, j) => {
        const ly = yc + (j - (k - 1) / 2) * LANE;
        const col = comparatorColor(cp.vaccine, refVax, allVax);
        // connector
        marks.push(
          <line key={`${r.key}-c${j}`} x1={X(r.ref.val)} x2={X(cp.val)} y1={ly} y2={ly}
            stroke={AXIS} strokeWidth={2} strokeLinecap="round" />,
        );
        // CI whiskers
        if (hasCI(r.ref))
          marks.push(
            <line key={`${r.key}-rw${j}`} x1={X(r.ref.lo!)} x2={X(r.ref.hi!)} y1={ly} y2={ly}
              stroke={REF_COLOR} strokeWidth={2} opacity={0.3} strokeLinecap="round" />,
          );
        if (hasCI(cp))
          marks.push(
            <line key={`${r.key}-cw${j}`} x1={X(cp.lo!)} x2={X(cp.hi!)} y1={ly} y2={ly}
              stroke={col} strokeWidth={2} opacity={0.32} strokeLinecap="round" />,
          );
        // reference dot
        marks.push(
          <circle key={`${r.key}-rd${j}`} cx={X(r.ref.val)} cy={ly} r={5} fill={CARD}
            stroke={REF_COLOR} strokeWidth={2} tabIndex={0}
            onMouseMove={(e) => show(e, dotTip(r, r.ref, refVax, REF_COLOR))}
            onFocus={(e) => showAtElement(e.currentTarget, dotTip(r, r.ref, refVax, REF_COLOR))}
            onMouseLeave={hide} onBlur={hide} style={{ cursor: "default" }} />,
        );
        // comparator dot
        marks.push(
          <circle key={`${r.key}-cd${j}`} cx={X(cp.val)} cy={ly} r={5} fill={col}
            stroke={CARD} strokeWidth={1.5} tabIndex={0}
            onMouseMove={(e) => show(e, dotTip(r, cp, cp.vaccine, col))}
            onFocus={(e) => showAtElement(e.currentTarget, dotTip(r, cp, cp.vaccine, col))}
            onMouseLeave={hide} onBlur={hide} style={{ cursor: "default" }} />,
        );
      });
      marks.push(
        <text key={`${r.key}-l`} x={ML - 12} y={yc + 3} textAnchor="end" fontSize={11.5} fill={INK_2}>
          {rowLabel(r)}
        </text>,
      );
      y += h;
    }
    y += GAP;
  }

  const showThreshold = threshold != null && threshold >= dmin && threshold <= dmax;

  return (
    <div className="wf-svg-scroll" ref={ref as React.RefObject<HTMLDivElement>}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Dumbbell plot of ${valueTitle} comparing ${refVax} (reference) to the selected comparator vaccines across trial arms. Tab to a point to hear its value.`}
        style={{ display: "block" }}>
        {gridEls}
        {showThreshold && (
          <>
            <line x1={X(threshold!)} x2={X(threshold!)} y1={MT} y2={H - MB} stroke={MUTED}
              strokeWidth={1.3} strokeDasharray="4 4" />
            <text x={X(threshold!)} y={MT - 4} textAnchor="middle" fontSize={11} fill={MUTED}>
              {threshold} µg/mL
            </text>
          </>
        )}
        {tickEls}
        <text x={ML + plotW / 2} y={H - 6} textAnchor="middle" fontSize={12} fill={MUTED}>
          {valueTitle}
        </text>
        {marks}
      </svg>
      {node}
    </div>
  );
}

function rowLabel(r: CompRow): string {
  if (r.pooled) {
    const s = `Pooled · ${shortTimepoint(r.sublabel)} (n=${r.ref.n})`;
    return s.length > 34 ? s.slice(0, 33) + "…" : s;
  }
  const s = `${shortTimepoint(r.sublabel.split(" · ")[0])} · ${shortSchedule(
    r.sublabel.split(" · ")[1] ?? "",
  )}  ·${r.label.slice(-4)}`;
  return s.length > 34 ? s.slice(0, 33) + "…" : s;
}

function dotTip(r: CompRow, p: Point, name: string, col: string): string {
  const head = r.pooled
    ? `<div class="wf-tip-h">${name} — ${shortTimepoint(r.sublabel)}</div><div class="wf-tip-r">${r.pop} · pooled across ${p.n} arms</div>`
    : `<div class="wf-tip-h">${r.label} · ${shortTimepoint(r.sublabel.split(" · ")[0])}</div><div class="wf-tip-r">${r.pop}</div>`;
  return (
    head +
    `<div class="wf-tip-r"><span class="wf-tip-sw" style="background:${col}"></span>${name}: <b>${
      Math.round(p.val * 100) / 100
    }</b>${ciText(p)}</div>`
  );
}
