import { useEffect, useMemo, useState } from "react";
import { Row } from "./data";
import {
  FilterState,
  Metric,
  ViewMode,
  allSerotypes,
  allVaccines,
  allPhases,
  vaccinesForSerotype,
  comparatorOptions,
  scheduleOptions,
  sponsorOptions,
  studyIdOptions,
  filteredRows,
} from "./filters";
import { buildArms, individualRows, pooledRows } from "./arms";
import { comparatorColor, REF_COLOR, shortVaccine } from "./plot/chart";
import { Sidebar } from "./components/Sidebar";
import { Tabs, TabDef } from "./components/Tabs";
import { Segmented } from "./components/Segmented";
import { DumbbellPlot } from "./components/DumbbellPlot";
import { RatioForest } from "./components/RatioForest";

const PREF_REF = "PCV13 (Pfizer)";
const PREF_COMPS = ["PCV15", "PCV20", "PCV7"];

function pickRef(options: string[]): string {
  return options.includes(PREF_REF) ? PREF_REF : options[0] ?? "";
}
function pickComps(options: string[]): string[] {
  const pref = PREF_COMPS.filter((c) => options.includes(c));
  return (pref.length ? pref : options).slice(0, 3);
}

function initState(rows: Row[]): FilterState {
  const serotypes = allSerotypes(rows);
  const serotype = serotypes.includes("4") ? "4" : serotypes[0] ?? "";
  const base: FilterState = {
    serotype,
    refVax: "",
    comparators: [],
    population: "Child",
    metric: "gmc",
    view: "pooled",
    schedules: [],
    phases: allPhases(rows),
    sponsors: [],
    studyIds: [],
  };
  base.refVax = pickRef(vaccinesForSerotype(rows, serotype, base.metric, base.population));
  base.comparators = pickComps(comparatorOptions(rows, base));
  base.sponsors = sponsorOptions(rows, base);
  base.studyIds = studyIdOptions(rows, base);
  return base;
}

export function App({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<FilterState>(() => initState(rows));
  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  const allVax = useMemo(() => allVaccines(rows), [rows]);
  const optSero = useMemo(() => allSerotypes(rows), [rows]);
  const optPhase = useMemo(() => allPhases(rows), [rows]);
  const optRef = useMemo(
    () => vaccinesForSerotype(rows, state.serotype, state.metric, state.population),
    [rows, state.serotype, state.metric, state.population],
  );
  const optComp = useMemo(
    () => comparatorOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.serotype, state.metric, state.refVax, state.population],
  );
  const optSched = useMemo(
    () => scheduleOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.serotype, state.metric, state.refVax, state.comparators, state.population],
  );
  const optSponsor = useMemo(
    () => sponsorOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.serotype, state.metric, state.refVax, state.comparators, state.population],
  );
  const optStudy = useMemo(
    () => studyIdOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.serotype, state.metric, state.refVax, state.comparators, state.population],
  );

  // ---- cascade resets ----
  // reference must be valid for the current serotype + metric
  useEffect(() => {
    if (!optRef.includes(state.refVax)) set({ refVax: pickRef(optRef) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optRef.join("|")]);

  // comparators trimmed to what co-occurs; default if empty
  const compKey = optComp.join("|");
  useEffect(() => {
    const kept = state.comparators.filter((c) => optComp.includes(c));
    const next = kept.length ? kept : pickComps(optComp);
    if (next.join("|") !== state.comparators.join("|")) set({ comparators: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compKey]);

  // sponsor / trial selections reset to "all available" when scope changes
  useEffect(() => set({ sponsors: optSponsor }), [optSponsor.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => set({ studyIds: optStudy }), [optStudy.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  // schedules default to "all" (empty selection) on scope change
  useEffect(() => set({ schedules: [] }), [optSched.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- charts ----
  const sub = useMemo(() => filteredRows(rows, state), [rows, state]);
  const arms = useMemo(
    () => buildArms(sub, state.serotype, state.metric === "gmc" ? "GMC" : "OPA"),
    [sub, state.serotype, state.metric],
  );
  const chartRows = useMemo(
    () =>
      state.view === "pooled"
        ? pooledRows(arms, state.refVax, state.comparators)
        : individualRows(arms, state.refVax, state.comparators),
    [arms, state.refVax, state.comparators, state.view],
  );

  const valueTitle = state.metric === "gmc" ? "GMC (µg/mL, log scale)" : "OPA GMT (log scale)";
  const threshold = state.metric === "gmc" ? 0.35 : undefined;
  const nComparators = state.comparators.length;

  const legend = (
    <div className="wf-legend">
      <span className="wf-legend-item">
        <span className="wf-legend-sw ring" style={{ boxShadow: `0 0 0 2px ${REF_COLOR} inset` }} />
        <span className="wf-legend-name">{state.refVax}</span>
        <span className="wf-legend-role">reference</span>
      </span>
      {state.comparators.map((c) => (
        <span className="wf-legend-item" key={c}>
          <span className="wf-legend-sw" style={{ background: comparatorColor(c, state.refVax, allVax) }} />
          <span className="wf-legend-name">{c}</span>
        </span>
      ))}
    </div>
  );

  const levelsTab: TabDef = {
    id: "levels",
    label: "Immunogenicity",
    render: () => (
      <div>
        {legend}
        <DumbbellPlot
          rows={chartRows}
          refVax={state.refVax}
          allVax={allVax}
          valueTitle={valueTitle}
          threshold={threshold}
          emptyMessage="No arms match this reference + comparator selection."
        />
      </div>
    ),
  };

  const h2hTab: TabDef = {
    id: "h2h",
    label: "Head-to-head (ratio)",
    render: () => (
      <div>
        <div className="wf-legend-note">
          Each comparator vs <b>{state.refVax}</b>; dashed line = no difference. Left of the line,
          the reference is higher.
        </div>
        <RatioForest
          rows={chartRows}
          refVax={state.refVax}
          allVax={allVax}
          comparators={state.comparators}
          emptyMessage="No arms match this reference + comparator selection."
          pooledSummary={state.view === "individual"}
        />
      </div>
    ),
  };

  const tabs: TabDef[] = [levelsTab, h2hTab];

  return (
    <div className="wf-root">
      <Sidebar
        state={state}
        set={set}
        allVax={allVax}
        options={{
          serotypes: optSero,
          refOptions: optRef,
          comparators: optComp,
          schedules: optSched,
          phases: optPhase,
          sponsors: optSponsor,
          studyIds: optStudy,
        }}
      />
      <div className="wf-main">
        <div className="wf-toolbar">
          <div className="wf-toolbar-title">
            Serotype <b>{state.serotype}</b> · reference{" "}
            <b>{shortVaccine(state.refVax)}</b> vs {nComparators} comparator
            {nComparators === 1 ? "" : "s"}
          </div>
          <div className="wf-toolbar-controls">
            <Segmented<Metric>
              label="Assay:"
              options={[
                { value: "gmc", label: "GMC" },
                { value: "opa", label: "OPA" },
              ]}
              value={state.metric}
              onChange={(metric) => set({ metric })}
            />
            <Segmented<ViewMode>
              label="View:"
              options={[
                { value: "pooled", label: "Pooled" },
                { value: "individual", label: "Individual arms" },
              ]}
              value={state.view}
              onChange={(view) => set({ view })}
            />
          </div>
        </div>

        <Tabs idPrefix="main" tabs={tabs} label="Chart view" />

        <div className="wf-infobox wf-warn">
          <strong>Important information.</strong> This database is still under development — please
          use with caution. Data on immunogenicity alone cannot be used to infer differences in
          effectiveness between vaccines. Caution should be used when comparing data from trials
          conducted by different sponsors, which might use different assays. GMC values pool ELISA
          and ECL reads; use the sponsor filter to isolate assay-comparable trials.
        </div>
      </div>
    </div>
  );
}
