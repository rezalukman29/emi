export function formatIDR(n: number | string) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

export function customerStatusBadge(status: string) {
  if (status === 'active') return 'green';
  if (status === 'trial') return 'blue';
  if (status === 'suspended') return 'orange';
  return 'red';
}

export function paymentStatusBadge(status: string) {
  if (status === 'paid') return 'green';
  if (status === 'pending') return 'orange';
  if (status === 'refunded') return 'purple';
  return 'red';
}
