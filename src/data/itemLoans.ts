export interface ItemLoan {
  id: number;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  warehouse: string;
  qty: number;
  borrowerName: string;
  borrowerContact: string;
  purpose: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
}

export const initialItemLoans: ItemLoan[] = [
  { id: 1, itemName: 'Kursi Tiffany Putih',         sku: 'KTP-013', category: 'Furniture',  unit: 'unit', warehouse: 'Gudang Bali 66',   qty: 20, borrowerName: 'Ari Setiawan',           borrowerContact: '0812-3456-7890', purpose: 'Acara komunitas RT',      loanDate: '2026-03-25', dueDate: '2026-04-05', returnDate: null },
  { id: 2, itemName: 'Backdrop Stand 2m',           sku: 'BSD-004', category: 'Equipment',  unit: 'unit', warehouse: 'Gudang C9',        qty: 2,  borrowerName: 'Studio Foto Kilau',      borrowerContact: '0813-2233-4455', purpose: 'Sesi foto produk',        loanDate: '2026-03-20', dueDate: '2026-03-28', returnDate: '2026-03-27' },
  { id: 3, itemName: 'Tripod Kamera Mini',          sku: 'TKM-019', category: 'Equipment',  unit: 'unit', warehouse: 'Gudang Cililitan', qty: 3,  borrowerName: 'Divisi Marketing',       borrowerContact: 'internal',       purpose: 'Dokumentasi kantor',      loanDate: '2026-04-02', dueDate: '2026-04-15', returnDate: null },
  { id: 4, itemName: 'Meja Buffet Putih',           sku: 'MBP-015', category: 'Furniture',  unit: 'unit', warehouse: 'Gudang Surabaya',  qty: 4,  borrowerName: 'Katering Bu Yuni',       borrowerContact: '0857-1111-2222', purpose: 'Acara syukuran',          loanDate: '2026-03-10', dueDate: '2026-03-20', returnDate: '2026-03-19' },
  { id: 5, itemName: 'Candle Holder Bulat Besar',   sku: 'CHB-006', category: 'Decoration', unit: 'pcs',  warehouse: 'Gudang Bali 70',   qty: 30, borrowerName: 'Wedding Organizer Mitra',borrowerContact: '0819-4567-8901', purpose: 'Sub-sewa vendor mitra',   loanDate: '2026-04-05', dueDate: '2026-04-12', returnDate: null },
  { id: 6, itemName: 'Acrylic Ball Silver 20cm',    sku: 'ABS-021', category: 'Decoration', unit: 'pcs',  warehouse: 'Gudang Bali 70',   qty: 15, borrowerName: 'Toko Dekorasi Rina',     borrowerContact: '0821-9988-7766', purpose: 'Dipinjam untuk pameran',  loanDate: '2026-02-01', dueDate: '2026-02-10', returnDate: null },
];
