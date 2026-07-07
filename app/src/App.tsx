import { useEffect, useMemo, useState } from "react";
import { Row } from "./data";
import {
  FilterState,
  allPhases,
  allSerotypes,
  allVaccines,
  anyMerckSelected,
  defaultDose,
  doseOptions,
  fineAgeContainsChild,
  fineAgeOptions,
  gmcEclData,
  gmcElisaData,
  gmcRatioBase,
  opaData,
  scheduleOptions,
  sponsorOptions,
  studyIdOptions,
} from "./filters";
import { computeRatios } from "./ratio";
import { Sidebar } from "./components/Sidebar";
import { Tabs, TabDef } from "./components/Tabs";
import { GmcPlot } from "./components/GmcPlot";
import { OpaPlot } from "./components/OpaPlot";
import { RatioPlot } from "./components/RatioPlot";

const DEFAULT_VAX = ["PCV13 (Pfizer)", "PCV15"];
const DEFAULT_STS = ["4", "6A", "14", "19F"];

function initState(rows: Row[]): FilterState {
  const age = "Child" as const;
  const fineAge = fineAgeOptions(rows, age);
  const hasChild = fineAgeContainsChild(fineAge);
  const schedule = scheduleOptions(rows, hasChild);
  const dose = defaultDose(hasChild, doseOptions(rows, hasChild));
  const phase = allPhases(rows);
  const availVax = allVaccines(rows);
  const availSts = allSerotypes(rows);
  const vax = DEFAULT_VAX.filter((v) => availVax.includes(v));
  const base: FilterState = {
    vax,
    serotypes: DEFAULT_STS.filter((s) => availSts.includes(s)),
    age,
    fineAge,
    schedule,
    dose,
    pairedOnly: true,
    phase,
    refVax: vax[0] ?? "",
    compVax: vax[1] ?? vax[0] ?? "",
    sponsors: [],
    studyIds: [],
  };
  base.sponsors = sponsorOptions(rows, base);
  base.studyIds = studyIdOptions(rows, base);
  return base;
}

export function App({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<FilterState>(() => initState(rows));
  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  // ---- option lists ----
  const optVax = useMemo(() => allVaccines(rows), [rows]);
  const optSts = useMemo(() => allSerotypes(rows), [rows]);
  const optPhase = useMemo(() => allPhases(rows), [rows]);
  const optFineAge = useMemo(() => fineAgeOptions(rows, state.age), [rows, state.age]);
  const hasChild = fineAgeContainsChild(state.fineAge);
  const optSchedule = useMemo(() => scheduleOptions(rows, hasChild), [rows, hasChild]);
  const optDose = useMemo(() => doseOptions(rows, hasChild), [rows, hasChild]);
  const optSponsors = useMemo(
    () => sponsorOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.vax, state.dose, state.fineAge, state.phase],
  );
  const optStudies = useMemo(
    () => studyIdOptions(rows, state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, state.vax, state.dose, state.fineAge, state.phase],
  );

  // ---- cascade resets (mirror the renderUI dependencies in app.R) ----
  const fineAgeKey = optFineAge.join("|");
  useEffect(() => set({ fineAge: optFineAge }), [state.age, fineAgeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFineAgeKey = state.fineAge.join("|");
  useEffect(() => set({ schedule: optSchedule }), [selectedFineAgeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => set({ dose: defaultDose(hasChild, optDose) }), [selectedFineAgeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sponsorsKey = optSponsors.join("|");
  useEffect(() => set({ sponsors: optSponsors }), [sponsorsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const studiesKey = optStudies.join("|");
  useEffect(() => set({ studyIds: optStudies }), [studiesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const vaxKey = state.vax.join("|");
  useEffect(() => {
    set({ refVax: state.vax[0] ?? "", compVax: state.vax[1] ?? state.vax[0] ?? "" });
  }, [vaxKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- plot datasets ----
  const elisa = useMemo(() => gmcElisaData(rows, state), [rows, state]);
  const ecl = useMemo(() => gmcEclData(rows, state), [rows, state]);
  const opa = useMemo(() => opaData(rows, state), [rows, state]);
  const gmcRatios = useMemo(
    () => computeRatios(gmcRatioBase(rows, state), state.refVax, state.compVax, true),
    [rows, state],
  );
  const opaRatios = useMemo(
    () => computeRatios(opaData(rows, state), state.refVax, state.compVax, false),
    [rows, state],
  );

  // ---- tab layout (matches output$tabbed_output) ----
  const isChild = state.age === "Child";
  const showEcl = isChild && anyMerckSelected(state);

  const gmcTab: TabDef = {
    id: "gmc",
    label: "Concentration (GMC)",
    render: () =>
      showEcl ? (
        <Tabs
          idPrefix="gmc-assay"
          tabs={[
            {
              id: "ecl",
              label: "ECL",
              render: () => (
                <GmcPlot data={ecl} rowByDose={false} emptyMessage="ECL not performed or available for the selected vaccines." />
              ),
            },
            {
              id: "elisa",
              label: "ELISA",
              render: () => (
                <GmcPlot data={elisa} rowByDose={true} emptyMessage="ELISA not performed or available for the selected vaccines." />
              ),
            },
          ]}
        />
      ) : (
        <GmcPlot data={elisa} rowByDose={true} emptyMessage="ELISA not performed or available for the selected vaccines." />
      ),
  };

  const opaTab: TabDef = { id: "opa", label: "Activity (OPA)", render: () => <OpaPlot data={opa} /> };
  const gmcRatioTab: TabDef = {
    id: "gmc-ratio",
    label: "GMC Ratio",
    render: () => (
      <RatioPlot points={gmcRatios} refVax={state.refVax} compVax={state.compVax} xTitle="Ratio of Immunogenicity" />
    ),
  };
  const opaRatioTab: TabDef = {
    id: "opa-ratio",
    label: "OPA Ratio",
    render: () => (
      <RatioPlot points={opaRatios} refVax={state.refVax} compVax={state.compVax} xTitle="Ratio of OPA GMT" />
    ),
  };

  const tabs: TabDef[] = isChild
    ? [gmcTab, opaTab, gmcRatioTab, opaRatioTab]
    : [opaTab, opaRatioTab];

  return (
    <div className="wf-root">
      <Sidebar
        state={state}
        set={set}
        options={{
          vax: optVax,
          serotypes: optSts,
          fineAge: optFineAge,
          schedule: optSchedule,
          dose: optDose,
          phase: optPhase,
          sponsors: optSponsors,
          studyIds: optStudies,
        }}
      />
      <main className="wf-main">
        <Tabs idPrefix="main" tabs={tabs} />

        <div className="wf-infobox wf-warn">
          <strong>Important information.</strong> This database is still under development —
          please use with caution. Data on immunogenicity alone cannot be used to infer
          differences in effectiveness between vaccines. These data need to be combined with
          information on the protective concentration of antibodies required to protect against
          each serotype in different populations for meaningful comparisons. Caution should be
          used when comparing data from trials conducted by different sponsors, which might use
          different assays.
        </div>
        <div className="wf-infobox wf-note">
          <strong>Change log.</strong> Sept 30, 2022: Separately plot GMC calculated with ELISA
          from those measured with ECL, and separate out OPA results by sponsor, as suggested by
          a trial sponsor.
        </div>
      </main>
    </div>
  );
}
