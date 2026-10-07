import { useTranslation } from 'react-i18next';
import { useEventLifecycle } from '../lib/eventLifecycle';

export default function ConversionStockHistory() {
  const { t, i18n } = useTranslation();
  const store = useEventLifecycle();
  const rows = store.stockMovements ?? [];
  return <div className="card">
    <p className="prod-notice prod-notice-warn">{t('conversion.historyNotice')}</p>
    <div className="table-wrap"><table><thead><tr>{['date', 'item', 'warehouse', 'change', 'stock', 'reason', 'event', 'by'].map(key => <th key={key}>{t('conversion.columns.' + key)}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map(row => <tr key={row.id}>
        <td>{new Date(row.at).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta' })}</td>
        <td>{row.itemName}</td><td>{row.warehouse}</td><td style={{ color: 'var(--red)' }}>{row.change}</td><td>{row.before} → {row.after}</td>
        <td><span className="badge badge-orange">{t('conversion.convert')}</span><div>{row.note}</div></td><td>{row.eventName}<div>{row.stage}</div></td><td>{row.by || '—'}</td>
      </tr>) : <tr><td colSpan={8} className="no-data">{t('conversion.emptyHistory')}</td></tr>}</tbody>
    </table></div>
  </div>;
}
