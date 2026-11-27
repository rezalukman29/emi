import { useTranslation } from 'react-i18next';
import { baysOf, slotCode, type Shape, type ShapeStat } from '../../lib/warehouseLayout';

// Front view of a rack: bays left→right, level 1 at the bottom. Each slot shows how many item lines sit there;
// red/orange when one of them is out of stock / low. Click a slot to select it (filter / assign).

export default function RackElevation({ shape, stat, selected, onSlot }: { shape: Shape; stat?: ShapeStat; selected?: string | null; onSlot?: (slot: string | null) => void }) {
  const { t } = useTranslation();
  const bays = baysOf(shape);
  const levels = Math.max(1, shape.levels);
  const issues = new Map<string, 'critical' | 'low'>();
  for (const it of stat?.items ?? []) {
    const p = it.placement; if (!p?.bay || !p.level) continue;
    const k = `${p.bay}.${p.level}`;
    if (it.level === 'critical') issues.set(k, 'critical'); else if (it.level === 'low' && !issues.has(k)) issues.set(k, 'low');
  }
  const unslotted = (stat?.items ?? []).filter((it) => !it.placement?.bay).length;
  return (
    <div className="wl-elev">
      <div className="wl-elev-grid" style={{ gridTemplateColumns: `22px repeat(${bays}, minmax(18px, 1fr))` }} role="grid" aria-label={t('whLayout.elev.aria', { code: shape.code })}>
        {Array.from({ length: levels }, (_, r) => {
          const level = levels - r;
          return [
            <span key={`l${level}`} className="wl-elev-lvl">L{level}</span>,
            ...Array.from({ length: bays }, (_, c) => {
              const bay = c + 1; const k = `${bay}.${level}`;
              const n = stat?.slots.get(k) ?? 0;
              const code = slotCode(shape, bay, level);
              return (
                <button key={k} type="button" role="gridcell" title={`${code} · ${t('whLayout.elev.lines', { count: n })}`}
                  className={`wl-slot${n ? ' filled' : ''}${issues.get(k) ? ` ${issues.get(k)}` : ''}${selected === k ? ' active' : ''}`}
                  style={{ animationDelay: `${(c + r) * 18}ms` }}
                  onClick={() => onSlot?.(selected === k ? null : k)}>{n || ''}</button>
              );
            }),
          ];
        })}
        <span />
        {Array.from({ length: bays }, (_, c) => <span key={`b${c}`} className="wl-elev-bay">{String(c + 1).padStart(2, '0')}</span>)}
      </div>
      <p className="wl-tip">{selected ? t('whLayout.elev.selected', { code: slotCode(shape, Number(selected.split('.')[0]), Number(selected.split('.')[1])) }) : t('whLayout.elev.hint')}{unslotted ? ` ${t('whLayout.elev.unslotted', { count: unslotted })}` : ''}</p>
    </div>
  );
}
