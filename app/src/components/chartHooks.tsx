// Small shared hooks for the SVG charts: a styled hover tooltip and a
// ResizeObserver-based container width so charts scale to their column.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const show = useCallback((e: React.MouseEvent, html: string) => {
    setTip({ x: e.clientX, y: e.clientY, html });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  const node = tip ? (
    <div
      className="wf-tip"
      style={{
        left: Math.min(tip.x + 14, window.innerWidth - 300),
        top: Math.min(tip.y + 14, window.innerHeight - 140),
      }}
      dangerouslySetInnerHTML={{ __html: tip.html }}
    />
  ) : null;

  return { show, hide, node };
}

export function useContainerWidth(min = 560): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(min);
  useLayoutEffect(() => {
    const elm = ref.current;
    if (!elm) return;
    const update = () => setW(Math.max(min, Math.floor(elm.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(elm);
    return () => ro.disconnect();
  }, [min]);
  // guard against the very first paint before layout runs
  useEffect(() => {
    if (ref.current) setW(Math.max(min, Math.floor(ref.current.clientWidth)));
  }, [min]);
  return [ref, w];
}
