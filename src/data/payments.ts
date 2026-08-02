export interface Payment {
  id: number;
  invoiceNo: string;
  customer: string;
  plan: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

export const initialPayments: Payment[] = [
  { id: 1,  invoiceNo: 'INV-2026-0091', customer: 'Anugerah Wedding Organizer', plan: 'Business',   amount: 3200000, method: 'Bank Transfer', status: 'paid',     date: '14 Jul 2026' },
  { id: 2,  invoiceNo: 'INV-2026-0090', customer: 'Bali Dream Events',          plan: 'Pro',        amount: 1500000, method: 'Credit Card',   status: 'paid',     date: '02 Jul 2026' },
  { id: 3,  invoiceNo: 'INV-2026-0089', customer: 'Cahaya Pesta Nusantara',     plan: 'Enterprise', amount: 8500000, method: 'Virtual Account',status: 'paid',     date: '21 Jul 2026' },
  { id: 4,  invoiceNo: 'INV-2026-0088', customer: 'Griya Resepsi Indonesia',    plan: 'Pro',        amount: 1500000, method: 'Credit Card',   status: 'failed',   date: '05 Jul 2026' },
  { id: 5,  invoiceNo: 'INV-2026-0087', customer: 'Nusantara Event Solutions',  plan: 'Business',   amount: 3200000, method: 'QRIS',           status: 'paid',     date: '18 Jul 2026' },
  { id: 6,  invoiceNo: 'INV-2026-0086', customer: 'Surabaya Grand Events',      plan: 'Pro',        amount: 1500000, method: 'Bank Transfer',  status: 'paid',     date: '12 Jul 2026' },
  { id: 7,  invoiceNo: 'INV-2026-0085', customer: 'Bandung Creative Events',    plan: 'Business',   amount: 3200000, method: 'Virtual Account',status: 'pending',  date: '25 Jul 2026' },
  { id: 8,  invoiceNo: 'INV-2026-0084', customer: 'Yogyakarta Heritage EO',     plan: 'Pro',        amount: 1500000, method: 'QRIS',           status: 'paid',     date: '25 Jun 2026' },
  { id: 9,  invoiceNo: 'INV-2026-0083', customer: 'Semarang Elite Events',      plan: 'Enterprise', amount: 8500000, method: 'Bank Transfer',  status: 'paid',     date: '09 Jul 2026' },
  { id: 10, invoiceNo: 'INV-2026-0082', customer: 'Makassar Prime Organizer',   plan: 'Starter',    amount: 750000,  method: 'Credit Card',   status: 'refunded', date: '16 Jun 2026' },
  { id: 11, invoiceNo: 'INV-2026-0081', customer: 'Anugerah Wedding Organizer', plan: 'Business',   amount: 3200000, method: 'Bank Transfer', status: 'paid',     date: '14 Jun 2026' },
  { id: 12, invoiceNo: 'INV-2026-0080', customer: 'Bali Dream Events',          plan: 'Pro',        amount: 1500000, method: 'Credit Card',   status: 'paid',     date: '02 Jun 2026' },
  { id: 13, invoiceNo: 'INV-2026-0079', customer: 'Nusantara Event Solutions',  plan: 'Business',   amount: 3200000, method: 'QRIS',           status: 'pending',  date: '18 Jun 2026' },
  { id: 14, invoiceNo: 'INV-2026-0078', customer: 'Surabaya Grand Events',      plan: 'Pro',        amount: 1500000, method: 'Bank Transfer',  status: 'paid',     date: '12 Jun 2026' },
  { id: 15, invoiceNo: 'INV-2026-0077', customer: 'Bandung Creative Events',    plan: 'Business',   amount: 3200000, method: 'Virtual Account',status: 'paid',     date: '07 Jun 2026' },
  { id: 16, invoiceNo: 'INV-2026-0076', customer: 'Yogyakarta Heritage EO',     plan: 'Pro',        amount: 1500000, method: 'QRIS',           status: 'failed',   date: '25 May 2026' },
];
