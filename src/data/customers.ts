export interface Customer {
  id: number;
  company: string;
  contact: string;
  email: string;
  plan: string;
  status: string;
  mrr: number;
  users: number;
  joinedAt: string;
  nextBilling: string;
}

export const initialCustomers: Customer[] = [
  { id: 1,  company: 'Anugerah Wedding Organizer',  contact: 'Dewi Anjani',     email: 'dewi@anugerahwo.id',      plan: 'Business',   status: 'active',    mrr: 3200000, users: 9,  joinedAt: '14 Feb 2025', nextBilling: '14 Aug 2026' },
  { id: 2,  company: 'Bali Dream Events',           contact: 'Made Wirawan',    email: 'made@balidreamevents.com', plan: 'Pro',        status: 'active',    mrr: 1500000, users: 5,  joinedAt: '02 Mar 2025', nextBilling: '02 Aug 2026' },
  { id: 3,  company: 'Jakarta Convention Partners',  contact: 'Rizky Ramadhan',  email: 'rizky@jcpartners.co.id',   plan: 'Starter',    status: 'trial',     mrr: 0,       users: 2,  joinedAt: '10 Jul 2026', nextBilling: '-' },
  { id: 4,  company: 'Cahaya Pesta Nusantara',       contact: 'Siti Rahmawati',  email: 'siti@cahayapesta.id',      plan: 'Enterprise', status: 'active',    mrr: 8500000, users: 24, joinedAt: '21 Nov 2024', nextBilling: '21 Aug 2026' },
  { id: 5,  company: 'Griya Resepsi Indonesia',      contact: 'Bambang Sutrisno',email: 'bambang@griyaresepsi.com', plan: 'Pro',        status: 'suspended', mrr: 1500000, users: 4,  joinedAt: '05 Jan 2025', nextBilling: '-' },
  { id: 6,  company: 'Nusantara Event Solutions',    contact: 'Ayu Kartika',     email: 'ayu@nusantaraevent.id',    plan: 'Business',   status: 'active',    mrr: 3200000, users: 11, joinedAt: '18 Apr 2025', nextBilling: '18 Aug 2026' },
  { id: 7,  company: 'Merapi Wedding Studio',        contact: 'Fajar Nugroho',   email: 'fajar@merapiwedding.com',  plan: 'Starter',    status: 'cancelled', mrr: 0,       users: 1,  joinedAt: '30 Aug 2024', nextBilling: '-' },
  { id: 8,  company: 'Surabaya Grand Events',        contact: 'Novita Sari',     email: 'novita@sbygrandevents.id', plan: 'Pro',        status: 'active',    mrr: 1500000, users: 6,  joinedAt: '12 Dec 2024', nextBilling: '12 Aug 2026' },
  { id: 9,  company: 'Lombok Paradise Weddings',     contact: 'Hendra Gunawan',  email: 'hendra@lombokparadise.com',plan: 'Starter',    status: 'trial',     mrr: 0,       users: 2,  joinedAt: '19 Jul 2026', nextBilling: '-' },
  { id: 10, company: 'Bandung Creative Events',      contact: 'Putri Amelia',    email: 'putri@bdgcreative.id',     plan: 'Business',   status: 'active',    mrr: 3200000, users: 8,  joinedAt: '07 Feb 2025', nextBilling: '07 Aug 2026' },
  { id: 11, company: 'Yogyakarta Heritage EO',       contact: 'Agus Santoso',    email: 'agus@jogjaheritage.com',   plan: 'Pro',        status: 'active',    mrr: 1500000, users: 5,  joinedAt: '25 May 2025', nextBilling: '25 Aug 2026' },
  { id: 12, company: 'Makassar Prime Organizer',     contact: 'Nurul Fadillah',  email: 'nurul@makassarprime.id',   plan: 'Starter',    status: 'suspended', mrr: 0,       users: 2,  joinedAt: '16 Mar 2025', nextBilling: '-' },
  { id: 13, company: 'Semarang Elite Events',        contact: 'Yusuf Hidayat',   email: 'yusuf@semarangelite.com',  plan: 'Enterprise', status: 'active',    mrr: 8500000, users: 19, joinedAt: '09 Sep 2024', nextBilling: '09 Aug 2026' },
  { id: 14, company: 'Medan Golden Occasions',       contact: 'Lidya Simatupang',email: 'lidya@medangolden.id',     plan: 'Pro',        status: 'trial',     mrr: 0,       users: 3,  joinedAt: '22 Jul 2026', nextBilling: '-' },
];
