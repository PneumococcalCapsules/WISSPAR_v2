import { useState } from "react";

export interface TabDef {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

export function Tabs({ tabs, idPrefix, label }: { tabs: TabDef[]; idPrefix: string; label?: string }) {
  const [active, setActive] = useState(0);
  // Clamp when the set of tabs changes (e.g. Child <-> Adult).
  const current = Math.min(active, tabs.length - 1);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setActive(next);
    document.getElementById(`${idPrefix}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="wf-tabs">
      <div className="wf-tablist" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={`${idPrefix}-${t.id}`}
            id={`${idPrefix}-tab-${t.id}`}
            role="tab"
            aria-selected={i === current}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={i === current ? 0 : -1}
            className={`wf-tab${i === current ? " active" : ""}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="wf-tabpanel"
        role="tabpanel"
        id={`${idPrefix}-panel-${tabs[current]?.id}`}
        aria-labelledby={`${idPrefix}-tab-${tabs[current]?.id}`}
      >
        {tabs[current]?.render()}
      </div>
    </div>
  );
}
