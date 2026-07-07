import { useState } from "react";

export interface TabDef {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

export function Tabs({ tabs, idPrefix }: { tabs: TabDef[]; idPrefix: string }) {
  const [active, setActive] = useState(0);
  // Clamp when the set of tabs changes (e.g. Child <-> Adult).
  const current = Math.min(active, tabs.length - 1);
  return (
    <div className="wf-tabs">
      <div className="wf-tablist" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={`${idPrefix}-${t.id}`}
            role="tab"
            aria-selected={i === current}
            className={`wf-tab${i === current ? " active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="wf-tabpanel" role="tabpanel">
        {tabs[current]?.render()}
      </div>
    </div>
  );
}
