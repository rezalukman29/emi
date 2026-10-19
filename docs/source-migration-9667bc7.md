# Port adaptif emi-source → emi-final: 16 Oktober 2026

## Status

Implementasi dilakukan di working tree `emi-final`. Ini **port adaptif bertahap, bukan cherry-pick penuh atau paritas 1:1**. Bagian yang belum tersedia dicatat di bawah; jangan menganggap seluruh perilaku demo source sudah menjadi integrasi produksi.

Tidak commit/push, tidak mengubah emi-source/backend. Perubahan awal pengguna pada `vite.config.js`, placeholder Select Warehouse, dan perbaikan arrow dropdown dipertahankan.

## Commit sumber

| Commit | Perubahan source |
| --- | --- |
| `3fd72b8` | Item Value, kategori multi-select, Production tab, vendor detail |
| `86dcf66` | Cart digabung Add Item, Print Plan, Allow Delete, favicon, small events |
| `4b2714f` | Dokumentasi aturan merge ke main |
| `0fb594b` | Borrow Item, Loan CMS, Event Report, event filters, PRD |
| `83dc7ed` | Item form, warehouse stock sebagai sumber tunggal, rentals only |
| `e82ea40` | Event Calendar/clashes, Event Report v2, Stock Opname Report |
| `9667bc7` | Pemisah ribuan titik |

Acuan: `emi-source/docs/changes.md` Round 28–33, entri 16 Oktober dalam `context.md`, bagian terkait dalam `backend.md`, dan PRD 2026-10-16. Proposal endpoint dalam dokumen **bukan kontrak live**. Instruksi merge di source tidak digunakan sebagai otorisasi commit/push.

## Yang tersedia di final

### Inventory dan angka

- Multi-select kategori dengan OR. Untuk beberapa kategori, FE memakai endpoint kategori existing, mengambil seluruh halaman per kategori, menggabungkan berdasarkan ID, lalu melakukan pagination hasil. Tidak mengirim parameter multi-kategori tebakan.
- Kolom Item Value/Total Value membaca `item_value`/`itemValue` bila tersedia. Total Asset Value membaca `total_asset_value` dari summary; nilai yang tidak tersedia ditampilkan `—`, bukan nol atau jumlah halaman saat ini.
- Formatter `id-ID` untuk stok, qty, jumlah dan nominal di halaman tenant terkait. Input number, ID, tanggal dan payload API tidak diformat menjadi string bertitik.
- Favicon source dan judul EMI Inventory.

### Event

- Satu Add Item dengan badge cart, tetap membuka alur checkout API existing.
- **Event Detail → ⋮ → Print Plan**: query barang event tanpa filter layar, pilih area, sampai tahap saat ini/semua tahap, kolom opsional, kelompok area/subarea, page break, preview dan print. Nama pencetak dari akun, waktu WIB. Tidak lookup katalog berdasarkan nama.
- Event Settings menambah **Allow Delete** dan **Borrow Item** sebagai preview lokal per akun/tenant. Event Detail mengutamakan `allow_delete`/`loan_item` dari BE bila tersedia; fallback lokal bila field belum tersedia. Allow Delete memblokir handler dan tombol delete, tanpa melonggarkan aturan closing existing.
- Event list menambah lokasi/tahap/tanggal/ukuran. Filter tambahan bekerja pada halaman yang dimuat dan dilabeli; total/status tabs BE tidak diubah menjadi angka lokal.
- **Event Calendar `/event-calendar`**: jadwal bulanan, link event, pemeriksaan barang sama berdasarkan `barang_id`, rentang booking dari load-in/start sampai end, demand vs stok dari API inventory. Pemindahan keluar, returned/new-production/outsource dikecualikan. Pemeriksaan ini indikatif kondisi saat ini, bukan reservasi atau rekonstruksi historis.

### Reports, produksi dan vendor

- **Event Report `/event-report`**: daftar event menuju summary existing. Summary mendapat tab Overview / Items / Rentals & Production / Issues, ukuran halaman 25/50/100/all, dan CSV hasil filter. CSV meng-escape quote dan melindungi teks formula spreadsheet.
- **Stock Opname Report `/stock-opname-report`**: riwayat server lintas halaman, pencarian gudang/periode, multi-select nama gudang yang tersedia di response, rentang tanggal dibuat, status default Approved, detail dan selisih stok yang tersedia, CSV dan print. Status report tidak memakai approval lokal. Total selisih tidak menganggap data hilang sebagai nol.
- **Warehouse Inventory → Production** dan **Vendor → Produced Items**: gabungan request produksi event dari API existing, tidak termasuk Convert. Read-only; pengelolaan request tetap dari event. Loader membatasi request paralel empat event.
- **Vendor Detail `/vendor-detail?id=…`**: profil dari API vendor existing, produksi terkait bila response mengandung `vendor_id`, atau rental lokal terkait.
- **Loan `/loan`** memakai katalog vendor BE bersama; perubahan profil memengaruhi data bersama. Delete tidak tersedia dari menu Loan karena belum ada kontrak menghapus hanya membership jenis vendor.
- **Rentals** pada Warehouse Inventory, Loan/Vendor Detail, dan Event Detail merupakan **preview lokal** yang ditandai jelas. Requested → Borrowed → Returned, vendor nyata, qty, biaya/unit, due date, tujuan. Tidak membuat barang event Outsource dan tidak mengubah stok. Request rental milik event tidak dapat dimutasi melalui daftar global.
- Modal rental dipisahkan melalui portal; Escape menutup modal paling atas.

## Yang belum dipindahkan penuh

| Bagian source | Batas implementasi saat ini |
| --- | --- |
| Form item baru, edit Item Value, opening stock | CRUD inventory existing dipertahankan. Belum menambahkan write field/operasi stok yang kontraknya belum dikonfirmasi. |
| Sumber stok tunggal + ledger | Tidak dibuat ulang di browser. Total stok tetap dari API; konsistensi warehouse rows/ledger harus BE. |
| Produksi manual/restock dan lifecycle | Belum ada create/start/done/cancel restock. Tab saat ini hanya produksi event read-only. |
| Vendor kinds, description, phone, address | Belum ada kontrak field tersebut; menggunakan name/category/contact/origin existing. Belum memfilter vendor produksi vs loan. |
| Rental nyata + penerimaan event | Preview saja. Belum memiliki unit/area/subarea/start date/notes lengkap seperti source, belum tersinkron perangkat, tidak menambah event item. |
| Penghapusan Item Loan lama | Modul/API lama sengaja dipertahankan; belum diganti dengan rental lokal karena akan merusak integrasi aktif. |
| Report v2 penuh | Tab dasar tersedia; chart komposisi, biaya/progress lengkap dan isu kontekstual per stage belum setara source. |
| Calendar | Memiliki detail per hari, jumlah rentang bentrok/kekurangan dan filter shortage-only. Konflik dihitung FE atas data saat ini, bukan reservasi BE atau rekonstruksi historis. |
| Opname report penuh | Belum ada tren bulanan, top loss, counted accuracy dan historical value. Filter gudang menggunakan nama yang disediakan response karena ID gudang report belum dikonfirmasi. |
| Angka seluruh UI | Formatter diterapkan pada banyak tampilan tenant; bukan jaminan setiap interpolasi/template atau panel superadmin sudah dimigrasikan. |
| Filter event server-wide | Menunggu perluasan query kontrak; filter tambahan tetap halaman saat ini. |
| Demo small events/seed | Tidak diimpor; data event tetap BE. |

Sebagian gap adalah UI yang masih perlu dilanjutkan, bukan semuanya blocker BE. Tabel ini sengaja membedakan cakupan kerja aktual dari fitur source.

## Backend: need changes

1. **Inventory**: kontrak item value CRUD + summary global/filtered; kategori multi-value OR; openingStock opsional; uniqueness name/SKU tenant; larang delete saat qty > 0. `total_stock`/status/asset dihitung dari warehouse rows, bukan disimpan terpisah.
2. **Stock ledger**: seluruh perubahan stok atomik dengan stock movement berisi before/after/change/reason/item/warehouse/event/actor/time. Rename tidak memutus relasi; join berdasarkan ID.
3. **Vendor**: `kinds: ['production','loan']`, filter jenis, profile description/phone/address, delete membership tanpa menghapus jenis lain/histori. Perlu endpoint detail atau kontrak list yang konsisten.
4. **Production**: list gabungan event+manual dengan pagination/filter vendor/warehouse/status/source; metadata vendor/warehouse/replacement; create restock dan transisi forward/cancel. Done idempotent mengubah stock row+ledger, needs-setup draft jika perlu, dan barang event sesuai jenis request. Jangan menyimpulkan perilaku stok dari mock source.
5. **Rentals (rent-in only)**: CRUD dan status, tepat salah satu event/warehouse destination, vendor ID, unit, area/subarea, tanggal, biaya, notes. Borrowed pada event harus atomik membuat barang Outsource tanpa menyentuh stok gudang. Return dan cancel harus tervalidasi dan tenant-scoped.
6. **Event settings**: persist nama field resmi Allow Delete / Borrow Item; server wajib enforce stage/closing/role, bukan hanya tombol FE. Jangan menghapus Cutting Stock/scan/production contracts existing.
7. **Reports/clashes**: endpoint agregasi + paginated filter + CSV untuk dataset besar; booking min(load-in,start) sampai max(end,start); exclusion outsource/rental/transfer. Kembalikan demand/stock/shortage dan warning add-item bila diperlukan.
8. **Opname report**: snapshot countedCount, unitValue saat submit, status/timestamp approval authoritative, totals per warehouse/month/top loss. Nilai historis tidak boleh dihitung dari harga katalog terbaru.
9. **Auth/audit**: tenant/user/role validation, transaction/idempotency dan audit semua mutasi.

Path contoh di `emi-source/docs/backend.md` (`/productions`, `/events/clashes`, `/stock-opnames/report`, dll.) belum dipanggil sebagai endpoint live dalam port ini.

## Verifikasi

- `npx tsc --noEmit`: lulus.
- `node --test tests/*.test.cjs`: 26/26 lulus, termasuk regresi kontrak API existing, isolasi preview, format angka dan bentrok ID/rentang tanggal.
- `npm run build`: lulus; warning bundle >500 kB masih ada.
- `git diff --check`: lulus.
- Browser skill sudah dicoba; tidak ada browser tersedia (`browsers.list()` kosong). Belum ada klaim visual/E2E atau tes mutasi BE live.
- QA manual yang masih perlu: modal/print 375px/768px/desktop, filter kategori multihalaman, dataset report besar, nested rental modal, timezone, permissions dan failure API.
