// Sidebar controls for the single-serotype head-to-head tool.

import { useState } from "react";
import { FilterState, Population } from "../filters";
import { comparatorColor } from "../plot/chart";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="wf-field">
      <label className="wf-label">{label}</label>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`wf-section${open ? " open" : ""}`}>
      {collapsible ? (
        <button type="button" className="wf-section-head wf-section-toggle" onClick={() => setOpen((o) => !o)}>
          <span>{title}</span>
          <span className="wf-caret" aria-hidden>{open ? "–" : "+"}</span>
        </button>
      ) : (
        <div className="wf-section-head">{title}</div>
      )}
      {open && <div className="wf-section-body">{children}</div>}
    </div>
  );
}

function MultiCheck({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="wf-multi">
      <div className="wf-multi-actions">
        <button type="button" onClick={() => onChange([...options])}>All</button>
        <button type="button" onClick={() => onChange([])}>None</button>
      </div>
      <div className="wf-multi-list">
        {options.length === 0 && <div className="wf-multi-empty">None available</div>}
        {options.map((o) => (
          <label key={o} className="wf-check">
            <input
              type="checkbox"
              checked={set.has(o)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o);
                else next.delete(o);
                onChange(options.filter((x) => next.has(x)));
              }}
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Single({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select className="wf-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

// Comparator picker: color-swatched checkboxes, ordered by the master vaccine list.
function ComparatorPicker({
  options,
  selected,
  refVax,
  allVax,
  onChange,
}: {
  options: string[];
  selected: string[];
  refVax: string;
  allVax: string[];
  onChange: (next: string[]) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="wf-multi">
      <div className="wf-multi-list">
        {options.length === 0 && <div className="wf-multi-empty">No comparators share an arm with the reference.</div>}
        {options.map((o) => (
          <label key={o} className="wf-check">
            <input
              type="checkbox"
              checked={set.has(o)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o);
                else next.delete(o);
                onChange(allVax.filter((x) => next.has(x)));
              }}
            />
            <span className="wf-swatch" style={{ background: comparatorColor(o, refVax, allVax) }} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export interface SidebarProps {
  state: FilterState;
  set: (patch: Partial<FilterState>) => void;
  allVax: string[];
  options: {
    serotypes: string[];
    refOptions: string[];
    comparators: string[];
    schedules: string[];
    phases: string[];
    sponsors: string[];
    studyIds: string[];
  };
}

const POPS: { value: Population; label: string }[] = [
  { value: "Child", label: "Children" },
  { value: "Adult", label: "Adults" },
  { value: "All", label: "All" },
];

export function Sidebar({ state, set, allVax, options }: SidebarProps) {
  return (
    <aside className="wf-sidebar">
      <Section title="Serotype">
        <Field label="Serotype to view:">
          <Single options={options.serotypes} value={state.serotype} onChange={(serotype) => set({ serotype })} />
        </Field>
      </Section>

      <Section title="Products">
        <Field label="Reference vaccine:">
          <Single options={options.refOptions} value={state.refVax} onChange={(refVax) => set({ refVax })} />
        </Field>
        <Field label="Comparators:">
          <ComparatorPicker
            options={options.comparators}
            selected={state.comparators}
            refVax={state.refVax}
            allVax={allVax}
            onChange={(comparators) => set({ comparators })}
          />
        </Field>
      </Section>

      <Section title="Population">
        <div className="wf-seg-group" role="group" aria-label="Population">
          {POPS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`wf-segbtn${state.population === p.value ? " active" : ""}`}
              aria-pressed={state.population === p.value}
              onClick={() => set({ population: p.value })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Advanced filters" collapsible defaultOpen={false}>
        <Field label="Schedule:">
          <MultiCheck options={options.schedules} selected={state.schedules} onChange={(schedules) => set({ schedules })} />
        </Field>
        <Field label="Trial phase:">
          <MultiCheck options={options.phases} selected={state.phases} onChange={(phases) => set({ phases })} />
        </Field>
        <Field label="Sponsor:">
          <MultiCheck options={options.sponsors} selected={state.sponsors} onChange={(sponsors) => set({ sponsors })} />
        </Field>
        <Field label="Trial:">
          <MultiCheck options={options.studyIds} selected={state.studyIds} onChange={(studyIds) => set({ studyIds })} />
        </Field>
      </Section>
    </aside>
  );
}
