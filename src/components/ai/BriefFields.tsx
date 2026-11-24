import { useTranslation } from 'react-i18next';
import type { EventBrief } from '../../lib/threeStar';

// The structured event brief the 3 Star assistant reads. Used in the 3 Star tab and in the New / Edit Event form.

export default function BriefFields({ brief, onChange, idPrefix = 'ts' }: {
  brief: EventBrief;
  onChange: (next: EventBrief) => void;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  const set = <K extends keyof EventBrief>(key: K, value: EventBrief[K]) => onChange({ ...brief, [key]: value });
  const outdoorish = brief.venueType === 'outdoor' || brief.venueType === 'semi';
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="ts-brief-fields">
      <label className="ts-f"><span>{t('threeStar.brief.eventType')}</span>
        <select id={id('type')} value={brief.eventType} onChange={(e) => set('eventType', e.target.value as EventBrief['eventType'])}>
          <option value="">—</option>{['wedding', 'corporate', 'birthday', 'gala', 'exhibition', 'other'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.typeOpt.${v}`)}</option>)}
        </select></label>
      <label className="ts-f"><span>{t('threeStar.brief.guests')}</span><input id={id('guests')} type="number" min={0} inputMode="numeric" value={brief.guests} onChange={(e) => set('guests', e.target.value)} placeholder="250" /></label>
      <label className="ts-f"><span>{t('threeStar.brief.venueType')}</span>
        <select id={id('venue')} value={brief.venueType} onChange={(e) => set('venueType', e.target.value as EventBrief['venueType'])}>
          <option value="">—</option>{['indoor', 'outdoor', 'semi'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.venueOpt.${v}`)}</option>)}
        </select></label>
      <label className="ts-f"><span>{t('threeStar.brief.power')}</span>
        <select id={id('power')} value={brief.power} onChange={(e) => set('power', e.target.value as EventBrief['power'])}>
          <option value="">—</option>{['venue', 'genset', 'none'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.powerOpt.${v}`)}</option>)}
        </select></label>
      {outdoorish && <label className="ts-f"><span>{t('threeStar.brief.ground')}</span>
        <select id={id('ground')} value={brief.ground} onChange={(e) => set('ground', e.target.value as EventBrief['ground'])}>
          <option value="">—</option>{['grass', 'sand', 'floor', 'carpet'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.groundOpt.${v}`)}</option>)}
        </select></label>}
      {outdoorish && <label className="ts-f"><span>{t('threeStar.brief.rainPlan')}</span>
        <select id={id('rain')} value={brief.rainPlan} onChange={(e) => set('rainPlan', e.target.value as EventBrief['rainPlan'])}>
          <option value="">—</option>{['tent', 'indoor', 'none'].map((v) => <option key={v} value={v}>{t(`threeStar.brief.rainOpt.${v}`)}</option>)}
        </select></label>}
      <label className="ts-f"><span>{t('threeStar.brief.loadIn')}</span><input id={id('loadin')} type="datetime-local" value={brief.loadIn} onChange={(e) => set('loadIn', e.target.value)} /></label>
      <label className="ts-f"><span>{t('threeStar.brief.eventStartTime')}</span><input id={id('start')} type="time" value={brief.eventStartTime} onChange={(e) => set('eventStartTime', e.target.value)} /></label>
      <label className="ts-f wide"><span>{t('threeStar.brief.style')}</span><input id={id('style')} value={brief.style} onChange={(e) => set('style', e.target.value)} placeholder={t('threeStar.brief.stylePh')} /></label>
      <label className="ts-f wide"><span>{t('threeStar.brief.colors')}</span><input id={id('colors')} value={brief.colors} onChange={(e) => set('colors', e.target.value)} placeholder={t('threeStar.brief.colorsPh')} /></label>
      <label className="ts-f full"><span>{t('threeStar.brief.priorities')}</span><textarea id={id('prio')} rows={3} value={brief.priorities} onChange={(e) => set('priorities', e.target.value)} placeholder={t('threeStar.brief.prioritiesPh')} /></label>
    </div>
  );
}
