# Migrasi emi-source → emi-final, 4 Oktober 2026

## Referensi

- `0ab7e6bb96fc6429a0d67de2ee841193c5e80c4e`: header Event Detail, Next-only,
  konfirmasi stage, Cutting Stock, drawer, Modify, dan permintaan produksi.
- `6ebe394e2c2d97b40e27c797d6361a11729b74b3`: flag stok eksklusif,
  Stock Return, mode list, dan kunci perubahan barang.
- Baseline source: `109eb35`.
- Review mencakup `emi-source/docs/changes.md` Round 19–23, tambahan
  `context.md` pada kedua commit, dan implementasi source terkait.

## Ringkasan perubahan

1. Header Event Detail lebih ringkas: lifecycle badge di sebelah judul,
   dropdown status dan progress bar menggantikan stepper panjang.
   Judul tetap memakai tanggal/nama dari backend.
2. Next tampil pada semua tahap yang masih bisa dilanjutkan. Tahap baru hanya
   terbuka melalui Next; tahap yang pernah dicapai bisa dibuka kembali.
   Perubahan tahap meminta konfirmasi dan tetap menyimpan melalui API event
   yang sudah digunakan. Scan gate tetap berlaku pada tahap scan.
3. Filter disatukan dalam satu toolbar. Urutan tab menjadi All, Added New,
   Waiting Scan (jika perlu scan), Grouped, dan Production (jika relevan).
   **Check dipertahankan**: filter ownership baru memanggil API setelah Check,
   sesuai integrasi emi-final, meskipun source menghapus tombol no-op-nya.
4. Klik kartu/baris membuka drawer detail, termasuk foto, lokasi/sub-area,
   jumlah/satuan, PIC, ownership, scan, catatan, dan flag backend.
   Modify dan Delete tersedia pada kartu, list, dan drawer sebelum checking.
5. Tampilan Cards/List dapat dipilih dan preferensinya disimpan di browser.
   Berlaku juga untuk isi package. Package tetap memakai API GET/POST yang
   telah terintegrasi, serta tata letak package berjejer dan gambar fill.
6. Event Status mendapatkan Cutting Stock, Stock Return, dan Production Item
   pada form, tabel, serta statistik. Cutting Stock dan Stock Return masing-masing
   hanya boleh aktif pada satu status, dan keduanya tidak boleh pada status sama.
   Validasi menggunakan seluruh status, termasuk yang tidak terlihat di halaman.
7. Memasuki Cutting Stock menampilkan konfirmasi dan indikator stok preview.
   Memasuki Stock Return menandai barang yang sebelumnya dipotong sebagai
   dikembalikan dalam preview. Penambahan barang dikunci setelah Stock Return,
   termasuk ketika kembali ke tahap sebelumnya.
8. Request Production meminta barang baru: nama, qty, area/sub-area, tanggal
   kebutuhan, dan catatan. Alur preview: Requested → In Production → Done.
   Requested dapat dibatalkan. Done menghasilkan barang preview berlabel
   Production dan ownership IHP, tanpa membuat item backend palsu.
9. Checking Inventory mengunci Modify, Delete, grouping, dan Bulk Ownership.
   Event Returned & Completed / Transferred hanya menyediakan akses Detail
   dan Summary pada listing; penambahan barang pada event terminal dikunci.
10. Wording baru memakai key semantik English/Indonesia.

## Batas integrasi dan penyimpanan

Integrasi API existing tetap menjadi sumber data event, status, barang,
scan IN/OUT, ownership, package, finalisasi return/transfer, dan summary/print.
Chip Returned serta transfer masuk/keluar tetap membaca flag response backend.
Response lifecycle `is_complete` dan `is_finished` tetap menentukan status.
Scan action None / SCAN_IN / SCAN_OUT dan payloadnya tetap dipertahankan.

Source adalah prototipe tanpa backend. Kontrak API untuk field Cutting Stock,
Stock Return, Production Item, Modify barang, dan Production Request belum
tersedia dalam dua commit ini. Karena itu:

- Flag baru disimpan sebagai preview pada storage lifecycle yang sudah
  di-scope company/user, keyed by status ID. Tidak menebak nama field payload BE.
- Stage terjauh disimpan sebagai ID status, keyed by event ID. Stock Return
  menyimpan latch agar kembali ke tahap sebelumnya tidak membuka Add Item lagi.
- Cutting/return stock hanya indikator preview; tidak mengubah stok gudang BE.
  Indikator stock dan Modify bersifat state halaman, reset ketika reload.
- Production requests disimpan di browser per company/user + event ID.
  Item Done diturunkan dari request, menggunakan ID negatif untuk preview.
  Item ini tidak masuk payload scan, package, ataupun finalize API dan tidak
  menghalangi scan gate barang backend.
- UI form dan tab terkait menampilkan penjelasan preview.
- Kunci lifecycle/backend tetap berlaku; perubahan tahap nyata baru memperbarui
  indikator dan stage terjauh setelah API berhasil.

Tidak membawa data dummy event/inventory/warehouse, tanggal TODAY mock,
auth mock, atau seed nama event dari source. Konfigurasi Vite yang sudah berubah
sebelum migrasi tidak disentuh. Tidak melakukan commit atau push.

## Validasi

- TypeScript: `npx tsc --noEmit`.
- Production build: `npm run build` (warning ukuran bundle existing).
- Regression: `node --test tests/*.test.cjs`, termasuk aturan stage,
  eksklusivitas flag, render kartu/list, chip transfer dua arah, dan lock actions.
- `git diff --check`.
- Browser runtime melaporkan tidak ada browser tersedia; visual/browser
  end-to-end dan request backend live belum diuji dalam sesi ini.

## Berkas utama

- `src/pages/EventDetailPage.tsx`, `EventStatusPage.tsx`, `EventPage.tsx`
- `src/components/Stepper.tsx`, `Drawer.tsx`, `EventItemEditor.tsx`
- `src/lib/eventLifecycle.ts`, `eventStageRules.ts`
- `src/eventUpgrade.css`, `src/locales/{en,id}/translation.json`
- `tests/eventUpgrade.test.cjs`
