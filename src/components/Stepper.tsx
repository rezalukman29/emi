import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Compact event-status control: the current status is a dropdown button listing
// every stage, with a thin segmented progress track underneath (hover a segment to
// see its stage name). Replaces the old numbered dot stepper, which took a full row
// and needed horizontal scrolling.
// Moving forward happens only through the page's Next button. Stages after
// `maxIndex` (the furthest stage reached with Next) are listed but locked: visible,
// not selectable. Stages up to `maxIndex` stay selectable so the user can go back.
// `onStepClick` undefined = fully read-only (event is past the on-going phase).
export default function Stepper({ steps, currentIndex, maxIndex = currentIndex, onStepClick }: { steps: string[]; currentIndex: number; maxIndex?: number; onStepClick?: (step: string, index: number) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const interactive = !!onStepClick;
  const current = steps[currentIndex] ?? '—';
  const isLocked = (idx: number) => !interactive || idx > maxIndex;

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  function pick(step: string, idx: number) {
    if (isLocked(idx)) return;
    setOpen(false);
    if (idx !== currentIndex) onStepClick?.(step, idx);
  }

  return (
    <div className="status-progress">
      <div className="status-progress-head" ref={wrapRef}>
        <button
          type="button"
          className="status-current-btn"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="status-current-name">{current}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span className="status-step-count">{t('eventUpgrade.stepCount', { current: currentIndex + 1, total: steps.length })}</span>

        {open && (
          <div className="status-menu" role="listbox">
            <div className="status-menu-hint">
              {interactive
                ? t('eventUpgrade.nextHint')
                : t('eventUpgrade.readOnly')}
            </div>
            {steps.map((step, idx) => {
              const locked = isLocked(idx) && idx !== currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  role="option"
                  aria-selected={idx === currentIndex}
                  aria-disabled={locked}
                  className={`status-menu-item${idx === currentIndex ? ' active' : ''}${idx < currentIndex ? ' done' : ''}${locked ? ' locked' : ''}`}
                  title={interactive && idx > maxIndex ? t('eventUpgrade.nextHint') : undefined}
                  onClick={() => pick(step, idx)}
                >
                  <span className="status-menu-num">
                    {idx < currentIndex
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : idx + 1}
                  </span>
                  <span className="status-menu-label">{step}</span>
                  {interactive && idx > maxIndex && (
                    <svg className="status-menu-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="status-track">
        {steps.map((step, idx) => (
          <button
            key={step}
            type="button"
            className={`status-seg${idx < currentIndex ? ' done' : idx === currentIndex ? ' active' : ''}`}
            title={`${idx + 1}. ${step}${interactive && idx > maxIndex ? ' (locked)' : ''}`}
            aria-label={`${idx + 1}. ${step}`}
            disabled={isLocked(idx)}
            onClick={() => pick(step, idx)}
          />
        ))}
      </div>
    </div>
  );
}
