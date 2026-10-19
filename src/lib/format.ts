/** Display-only formatting. Keep request payloads and input values numeric. */
export function fmtNum(value: number | string | null | undefined, maximumFractionDigits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('id-ID', { maximumFractionDigits }) : String(value);
}

export function formatIDR(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : `Rp${fmtNum(value)}`;
}
