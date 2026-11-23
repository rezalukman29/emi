import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { setUiVariant, useUiVariant, type UiScope, type UiVariant } from "../lib/uiVariant";

// Floating, draggable A/B switcher for layout tests (owner 2026-11-22).
// Shown to tenant admins on pages that have a B layout. Position and "hidden" are saved per browser;
// add ?ab=1 to the URL to bring it back after hiding it.

const POSITION_KEY = "emi.ui.variantSwitcher.pos.v1";
const HIDDEN_KEY = "emi.ui.variantSwitcher.hidden.v1";
const ROW_HEIGHT = 34;
const sizeFor = (rows: number) => ({ width: 216, height: 10 + rows * ROW_HEIGHT });

export interface VariantSwitcherRow { scope: UiScope; label: string }

function ScopeToggle({ row }: { row: VariantSwitcherRow }) {
  const { t } = useTranslation();
  const variant = useUiVariant(row.scope);
  const choose = (next: UiVariant) => setUiVariant(next, row.scope);
  return (
    <div className="ab-row">
      <span className="ab-label">{row.label}</span>
      <div className="ab-toggle" role="radiogroup" aria-label={t("abSwitcher.label", { name: row.label })}>
        {(["A", "B"] as const).map((value) => (
          <button key={value} type="button" role="radio" aria-checked={variant === value} className={variant === value ? "active" : ""} onClick={() => choose(value)}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function readPosition(SIZE: { width: number; height: number }) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) || "null") as { x: number; y: number } | null;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch { /* ignore */ }
  // Default bottom-left: bottom-right covers primary buttons such as "Save to Event".
  return { x: 16, y: window.innerHeight - SIZE.height - 16 };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export default function VariantSwitcher({ rows }: { rows: VariantSwitcherRow[] }) {
  const { t } = useTranslation();
  const SIZE = sizeFor(rows.length);
  const [position, setPosition] = useState(() => readPosition(SIZE));
  const [hidden, setHidden] = useState(() => {
    if (new URLSearchParams(window.location.search).get("ab") === "1") {
      try { window.localStorage.removeItem(HIDDEN_KEY); } catch { /* ignore */ }
      return false;
    }
    try { return window.localStorage.getItem(HIDDEN_KEY) === "1"; } catch { return false; }
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  // Keep it on screen when the window is resized.
  useEffect(() => {
    const keepInView = () => setPosition((current) => ({
      x: clamp(current.x, 8, window.innerWidth - SIZE.width - 8),
      y: clamp(current.y, 8, window.innerHeight - SIZE.height - 8),
    }));
    keepInView();
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, [SIZE.width, SIZE.height]);

  if (hidden) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current.moved = true;
    setPosition({
      x: clamp(event.clientX - drag.current.dx, 8, window.innerWidth - SIZE.width - 8),
      y: clamp(event.clientY - drag.current.dy, 8, window.innerHeight - SIZE.height - 8),
    });
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      try { window.localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* ignore */ }
    }
    drag.current = null;
  };

  return (
    <div
      className="ab-switcher"
      style={{ left: position.x, top: position.y }}
      role="group"
      aria-label={t("abSwitcher.version")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="ab-grip" aria-hidden="true" data-tip={t("abSwitcher.drag")} data-tip-align="start">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </span>
      <div className="ab-rows">
        {rows.map((row) => <ScopeToggle key={row.scope} row={row} />)}
      </div>
      <button
        type="button"
        className="ab-close"
        aria-label={t("abSwitcher.hide")}
        data-tip={t("abSwitcher.hideHint")}
        data-tip-align="end"
        onClick={() => { setHidden(true); try { window.localStorage.setItem(HIDDEN_KEY, "1"); } catch { /* ignore */ } }}
      >
        ×
      </button>
    </div>
  );
}
