// Inline segmented toggle (pill group) — replaces nested tabs for small choices
// like ELISA/ECL, sponsor, or GMC/OPA ratio metric.

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  if (options.length <= 1) return null;
  return (
    <div className="wf-segmented-wrap">
      {label && <span className="wf-segmented-label">{label}</span>}
      <div className="wf-segmented" role="radiogroup" aria-label={label?.replace(/:$/, "")}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={`wf-seg${o.value === value ? " active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
