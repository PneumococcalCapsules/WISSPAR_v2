// Sidebar filter controls, mirroring the dashboardSidebar in app.R.

import { AgeGroup, FilterState } from "../filters";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="wf-field">
      <label className="wf-label">{label}</label>
      {children}
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

export interface SidebarProps {
  state: FilterState;
  set: (patch: Partial<FilterState>) => void;
  options: {
    vax: string[];
    serotypes: string[];
    fineAge: string[];
    schedule: string[];
    dose: string[];
    phase: string[];
    sponsors: string[];
    studyIds: string[];
  };
}

export function Sidebar({ state, set, options }: SidebarProps) {
  return (
    <aside className="wf-sidebar">
      <Field label="Vaccine:">
        <MultiCheck options={options.vax} selected={state.vax} onChange={(vax) => set({ vax })} />
      </Field>

      <Field label="Serotypes:">
        <MultiCheck
          options={options.serotypes}
          selected={state.serotypes}
          onChange={(serotypes) => set({ serotypes })}
        />
      </Field>

      <Field label="Child or adults:">
        <Single
          options={["Child", "Adult"]}
          value={state.age}
          onChange={(age) => set({ age: age as AgeGroup })}
        />
      </Field>

      <Field label="Finer age categories:">
        <MultiCheck
          options={options.fineAge}
          selected={state.fineAge}
          onChange={(fineAge) => set({ fineAge })}
        />
      </Field>

      <Field label="Schedule:">
        <MultiCheck
          options={options.schedule}
          selected={state.schedule}
          onChange={(schedule) => set({ schedule })}
        />
      </Field>

      <Field label="Doses received and timing:">
        <Single options={options.dose} value={state.dose} onChange={(dose) => set({ dose })} />
      </Field>

      <label className="wf-check wf-standalone">
        <input
          type="checkbox"
          checked={state.pairedOnly}
          onChange={(e) => set({ pairedOnly: e.target.checked })}
        />
        <span>Show paired observations only</span>
      </label>

      <Field label="Trial Phase:">
        <MultiCheck options={options.phase} selected={state.phase} onChange={(phase) => set({ phase })} />
      </Field>

      <Field label="Reference vaccine:">
        <Single options={state.vax} value={state.refVax} onChange={(refVax) => set({ refVax })} />
      </Field>

      <Field label="Comparator vaccine:">
        <Single options={state.vax} value={state.compVax} onChange={(compVax) => set({ compVax })} />
      </Field>

      <Field label="Sponsor:">
        <MultiCheck
          options={options.sponsors}
          selected={state.sponsors}
          onChange={(sponsors) => set({ sponsors })}
        />
      </Field>

      <Field label="Trial:">
        <MultiCheck
          options={options.studyIds}
          selected={state.studyIds}
          onChange={(studyIds) => set({ studyIds })}
        />
      </Field>
    </aside>
  );
}
