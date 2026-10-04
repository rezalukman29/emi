import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from './icons';

export default function Drawer({ open, title, onClose, children, footer }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector('.modal-overlay')) return;
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]');
        if (!nodes?.length) { event.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="drawer" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer-header"><h2 className="drawer-title">{title}</h2><button className="modal-close" onClick={onClose} aria-label={t('wording.close')}><IconClose /></button></div>
      <div className="drawer-body">{children}</div>
      {footer && <div className="drawer-footer">{footer}</div>}
    </aside>
  </div>;
}
