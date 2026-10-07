# Migrasi emi-source → emi-final — 6 Oktober 2026

## Referensi

- Baseline: `6ebe394` (migrasi sebelumnya).
- `fbc560c914cb45fa6c3ac26a4109c943be30c0b6` — Remove Cutting Stock from Event Settings.
- `6c94551ab8097f97befddf65c3939bc54a28b7ce` — Add Convert tab to Request Production and Stock History in Warehouse Inventory.
- Ditinjau: `emi-source/docs/changes.md` Round 24–25, keputusan baru di
  `emi-source/docs/context.md` tanggal 5 Oktober 2026, dan diff implementasi kedua commit.

## Rangkuman perubahan

1. **Event Settings / Event Status**: kolom, statistik, input Cutting Stock,
   dan aturan eksklusivitasnya dihapus. Stock Return tetap hanya boleh dipakai
   satu status; Production Item boleh dipakai beberapa status.
   Sesuai source, logic Cutting Stock di Event Detail tidak dihapus. Flag lama
   yang tersimpan masih bisa berlaku sampai status diedit; penyimpanan status
   sekarang menonaktifkan flag tersebut. Tidak menghapus storage pengguna secara massal.
2. **Request Production**: dua tab, New Production dan Convert. Needed By dihapus.
   New Production mempertahankan nama, qty, area/sub-area, catatan, serta memberi
   informasi bahwa detail barang perlu dilengkapi di Inventory setelah dibuat.
3. **Convert**: pilihan barang lama dari warehouse inventory BE, barang baru dari
   katalog inventory BE, jumlah lama dan jumlah baru. Pencarian memakai komponen
   searchable select; data diambil dengan pagination, bukan fixture source.
   ID warehouse-item dan inventory-item dibedakan; barang asal dan tujuan tidak
   boleh sama. Jumlah wajib bilangan bulat positif, jumlah lama tidak boleh
   melampaui saldo preview setelah reservasi tertunda lintas-event.
4. Pengajuan Convert berstatus **Pending** dan bisa dibatalkan. Konfirmasi maju
   tahap menampilkan daftar konversi. Stok BE dibaca ulang untuk validasi, lalu
   perubahan tahap tetap menggunakan API event existing. Preview baru diterapkan
   setelah API sukses, tidak saat mundur tahap. Status berubah **Converted**;
   konversi yang sudah diterapkan tidak dipotong ulang ketika maju lagi.
5. Hasil konversi tampil di barang event sebagai item preview **Converted**, area
   UNASSIGNED, ownership IHC, dan tahap saat konversi diterapkan. Berlaku pada
   Cards/List serta drawer. ID negatif mencegahnya masuk scan/package/finalize BE.
   Tab Production menampilkan request produksi dan konversi dengan badge jenisnya.
6. **Warehouse Inventory → Stock History**: tanggal (WIB), barang, gudang,
   perubahan, saldo sebelum/sesudah, alasan, event/tahap, dan pengguna.
7. Wording baru menggunakan semantic key EN/ID. Loading, error/retry, validasi
   stok, dan pemberitahuan batas preview ditambahkan.

## Batas backend dan penyesuaian dari source

- Integrasi event/status, inventory, scan, ownership, package, return/transfer,
  summary/print yang sudah ada dipertahankan. Filter ownership tetap lewat Check.
- Dua commit source **tidak menyediakan kontrak API konversi/mutasi stok**.
  Tidak menebak endpoint atau mengirim pengurangan stok gudang sungguhan.
- Pilihan barang dan saldo awal berasal dari BE. Hanya request, saldo konversi,
  barang hasil, serta ledger yang merupakan preview lokal dan diberi label jelas.
  Tabel Inventory utama tetap menampilkan stok BE, bukan angka preview.
- Hanya stok barang lama yang dikurangi di ledger preview. Stok gudang barang
  baru tidak ditambah/dikurangi; jumlah baru adalah jumlah yang diterima event preview.
- Source memakai ledger in-memory yang hilang saat reload. Di final, request dan
  ledger disimpan bersama dalam lifecycle storage existing, di-scope sesuai
  company/user login, agar request Converted dan riwayat tetap konsisten saat reload.
  Preview ini tidak tersinkron antar-browser/perangkat dan bukan transaksi BE.
- Validasi konversi bersifat all-or-nothing untuk satu batch. Saldo tidak di-clamp
  diam-diam jika stok kurang. Tidak ada pengurangan sebelum update tahap sukses.
- Data dummy, seed inventory/event, mock auth, dan mock tanggal tidak dibawa.
- Perubahan existing `vite.config.js` tidak disentuh. Tidak commit/push.

## Validasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos; warning ukuran bundle existing.
- `node --test tests/*.test.cjs`: 9 tes lolos, termasuk reservation lintas-event,
  atomic batch validation, pencegahan pemotongan ulang, pagination loader,
  eksklusivitas Stock Return, dan regresi chip return/transfer.
- `git diff --check`: lolos.
- Skill Browser digunakan untuk mencoba pemeriksaan UI, tetapi runtime tidak
  menemukan browser terhubung. Visual/end-to-end dan request BE live belum diuji.

## Berkas utama

- `src/pages/EventStatusPage.tsx`, `EventDetailPage.tsx`, `WarehouseInventoryPage.tsx`
- `src/components/EventItemEditor.tsx`, `ConversionForm.tsx`, `ConversionStockHistory.tsx`
- `src/lib/eventLifecycle.ts`, `eventStageRules.ts`, `conversionInventory.ts`, `conversionPreview.ts`
- `src/eventUpgrade.css`, `src/locales/{en,id}/translation.json`
- `tests/eventUpgrade.test.cjs`
