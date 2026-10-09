# Port emi-source → emi-final — 10 Oktober 2026

## Sumber dan aturan migrasi

- `686bc425` — Check Ownership, broken-item reports, production vendor/warehouse, Vendor CMS.
- `a38a76bc` — UI responsif untuk phone/tablet.
- Baseline source: `6c94551`; baseline final: `bc8e5e4`.
- Dibaca: `emi-source/docs/changes.md` Round 26–27, keputusan 2026-10-09 dalam `context.md`, dan `backend.md`. Tidak ada `backend.ms`; nama file yang tersedia adalah `backend.md`.
- Port adaptif, bukan cherry-pick file mock ke aplikasi terintegrasi. Auth, plan/role checks, i18n, ID backend, CRUD, scan, packaging, finalize, production dan convert yang sudah terintegrasi dipertahankan.
- Tidak mengimpor seed/demo login, tanggal mock, pencocokan inventory berdasarkan nama, atau stok dummy dari source.
- Tidak mengubah `vite.config.js` yang sudah dirty sebelum pekerjaan. Tidak commit/push; tidak mengubah emi-source atau backend.

## Perubahan yang dibawa

### Responsif

- Tenant dan Owner panel memakai sidebar slide-over pada lebar <=900px, tertutup awalnya. Tutup melalui backdrop, Escape, atau navigasi. Toggle desktop tetap berfungsi.
- Header lebih ringkas; pada phone label Upgrade disembunyikan dengan accessible name tetap tersedia.
- Modal/picker/drawer, toolbar/filter, tab, KPI, tabel horizontal, dan grid detail/dashboard/report menyesuaikan tablet/phone.
- Breakpoint 900 / 560 / 430px; override terpusat dalam `src/sourceResponsive.css`, dimuat setelah stylesheet fitur.

### Event Settings dan alur Next

- Kolom/KPI/form **Check Ownership (preview)**. Setting tambahan ini disimpan per akun/tenant di browser, bukan dikirim sebagai field API tebakan.
- Forward Next: pertanyaan ownership untuk stage yang ditinggalkan → peringatan barang rusak bila ada → konfirmasi stage yang sudah ada.
- Yes membuka Bulk Assign Ownership yang menggunakan API asli. Setelah berhasil, alur lanjut kembali ke konfirmasi. Cancel tidak melanjutkan stage. Jawaban diingat per stage selama sesi event detail.
- Backward langsung ke konfirmasi; scan gate dan aturan stage existing tetap dipakai.
- **Cutting Stock tetap dipertahankan**, mengikuti integrasi/permintaan user di final. Stock Return tidak dimunculkan kembali di settings.
- Setelah update stage berhasil, refetch event, barang event, dan production requests agar hasil convert dari BE ikut diperbarui.

### Barang rusak dan detail barang

- Create/Edit/Remove laporan rusak, qty integer 1..qty barang event, catatan, pelapor dan waktu.
- Chip merah di kartu, tabel dan drawer; laporan lokal tetap tersimpan setelah reload untuk akun yang sama.
- Aksi laporan/replacement terkunci dari Checking Inventory dan setelahnya. Laporan tidak ditawarkan untuk baris New Production yang memakai namespace ID berbeda.
- Create Production pada barang rusak mengisi nama, qty rusak, area/sub-area, catatan pengganti dan metadata `replacesItemId`; tetap bergantung pada `production_item` current status.
- Drawer menampilkan kategori, SKU, serta nama gudang dan stok dari response barang event; tidak mencari mock catalog berdasarkan nama.

### Produksi dan Vendor

- New Production mendapat pilihan gudang dari API gudang existing, Internal/External, dan vendor sesuai origin. Warehouse placeholder Buy tidak ditampilkan.
- Vendor CMS `/vendor`: list, search, filter origin, KPI, create/edit/delete; tanpa seed. Nama vendor disnapshot dalam metadata produksi agar penghapusan vendor tidak menghapus histori metadata.
- Warehouse/vendor/replacement disimpan terpisah sebagai **metadata preview lokal**, ditampilkan tersendiri di tab Production. Request produksi sebenarnya tetap POST ke API existing dengan payload existing.
- Metadata tambahan dibuat **opsional** sementara; tidak menghalangi API produksi yang sudah berfungsi karena vendor/warehouse belum punya kontrak produksi yang dikonfirmasi. Di source, warehouse/vendor wajib — enforcement itu menunggu kontrak BE.
- Vendor CMS belum terhubung ke Item Loan backend; tidak mengganti integrasi Item Loan dengan vendor seed/local source.

### Needs setup

- Inventory dan Warehouse Inventory dapat menampilkan chip/baris oranye/banner dan filter jika response menyediakan boolean `needs_setup` (atau `needsSetup` sesuai proposal source).
- Missing flag tidak dianggap belum lengkap; explicit snake_case false mengalahkan camelCase true.
- Filter ini terbatas ke **halaman API yang sedang dimuat**, dilabeli demikian; pagination dan total BE tidak dipalsukan.
- Tidak membuat inventory/stok lokal ketika produksi Done dan tidak menghapus flag BE secara lokal. Update data tetap lewat form/API existing, flag harus dikendalikan BE.

## Batas integrasi yang disengaja

`backend.md` sendiri menyatakan path/payload adalah **proposal**, bukan kontrak API yang sudah live. Karena itu port ini tidak 1:1 menyalin efek samping mock:

- Laporan rusak saat ini preview, **belum mengurangi qty barang event** ketika Next. Peringatan menjelaskan ini; laporan tidak otomatis hilang. Write-off harus atomik di BE, bukan beberapa PUT parsial dari browser.
- Belum ada tombol produksi Done yang memalsukan inventory/stok. Draft SKU, stock row, needsSetup clearing dan production transition harus dari BE.
- Check Ownership, vendor CRUD dan metadata produksi lokal belum tersinkron lintas pengguna/perangkat.
- Store baru `emi.source-preview.v1.<company_id>.<user_id>` terpisah per tenant + user. Jika company_id tidak tersedia, user ID tetap memisahkan akun. Tidak mengubah store mock lama atau response server.

## Backend: need changes / kontrak yang perlu disepakati

| Area | Yang perlu disediakan / diverifikasi BE |
| --- | --- |
| Event status | Persist boolean Check Ownership; pastikan nama field final untuk GET/create/update. Source memakai `checkOwnership`, final API existing memakai snake_case untuk flag lain. Jangan menghapus `cutting_stock` yang sudah dipakai final. |
| Broken report | Create/update/delete laporan per event-item, integer qty 1..qty, note, reporter/time dari auth/server. Kembalikan laporan dan total written-off di GET barang event. Tolak mutasi saat Checking Inventory+ dan cegah cross-tenant/item mismatch. Proposal source: `POST/DELETE /events/:id/items/:itemId/report`; belum dipanggil FE. |
| Advance stage | Satu transaksi: validasi scan & stage → write-off broken qty event saja → apply pending conversion → update stage → audit. Reset broken qty, akumulasi written-off; cegah double apply/retry/race. Backward tidak mengeksekusi atau membalik write-off/convert. Proposal source: `/events/:id/advance`; final tetap menggunakan update event existing. |
| Production metadata | Perluasan kontrak create/list produksi untuk gudang tujuan (ID), vendor origin + ID + name snapshot, replacement item ID. Validasi warehouse nyata dan vendor sesuai origin/tenant. GET harus mengembalikan metadata sehingga tidak perlu draft browser. |
| Production lifecycle | Kontrak start/done/cancel dan mapping status source Requested/In Production/Done ke status API PENDING/COMPLETED/CANCELLED. Completion harus idempotent, membuat barang event ownership IHP, catalog draft jika diperlukan, stock row gudang tujuan dan ledger. Jangan deduplicate semata-mata dengan nama; gunakan ID/aturan server yang disepakati. |
| Inventory readiness | Boolean setup flag pada catalog/detail/warehouse rows, aturan wajib SKU/category/unit dan kapan flag dibersihkan. Filter/count server untuk needs-setup agar berlaku lintas halaman. Jangan menerima mark-as-setup tanpa validasi metadata. |
| Vendor CMS + Item Loan | CRUD vendor tenant-scoped: id, name, contact, business category, Internal/External. Hubungkan vendor ID ke produksi/loan, simpan name snapshot; delete tidak memutus histori. Proposal source `/vendors` belum dianggap endpoint live. |
| Stock history | Ledger authoritative, event/request/warehouse/item IDs, before/after/change/reason/actor/time; setiap efek stok produksi/convert/return/transfer dicatat dalam transaksi yang sama. Verifikasi endpoint dan pagination sebelum mengganti preview history existing. |
| Authorization/audit | Server tenant scoping, role/admin checks, ownership validation, audit log transaksi. UI/local storage bukan enforcement atau audit server. |

### Perbedaan source vs API final yang perlu perhatian

- Source berasumsi convert hanya mengurangi stok barang lama. Kontrak v3 yang diberikan user menyatakan stok lama dikurangi **dan stok barang baru ditambah** ketika stage berikutnya. Final tetap mengikuti kontrak v3; BE perlu menegaskan aturan ini pada transaksi/ledger, bukan menyalin asumsi source.
- Source menyederhanakan scan menjadi None/Scan dan ownership menjadi model mock lama. Final tetap memakai `is_show_scan_result`, `SCAN_IN/SCAN_OUT`, dan multi-ownership boolean yang sudah diintegrasikan.
- Lifecycle final tetap mengikuti `is_complete` + `is_finished`, endpoint list/status dan finalize existing; tidak diganti flag/string mock source.
- Endpoint yang sudah aktif tidak dibuat ulang: GET `/v3/fix-list-item-event`, PUT `/v3/fix-list-item`, POST `/v1/event-production-request`, POST `/v3/fix-list-item/convert`, GET `/v3/production-requests`, dan POST `/v3/fix-list-item/finalize`.
- Daftar mocked stores lain di akhir `backend.md` adalah konteks source, **bukan bukti** semua endpoint tersebut belum tersedia di emi-final. Audit backend live terpisah masih diperlukan.

## Verifikasi

- TypeScript `tsc --noEmit`: lulus.
- Node tests: **20/20 lulus**, termasuk isolasi tenant/user, validasi qty rusak, urutan prompt, flags readiness, dan regresi API production/convert/modify/scan/lifecycle.
- Vite production build: lulus; warning ukuran chunk >500 kB masih ada.
- `git diff --check`: lulus.
- Pemeriksaan visual browser belum dilakukan: skill Browser sudah dicoba, tetapi discovery mengembalikan tidak ada browser tersedia. Source menyatakan telah menguji 375/768px; klaim itu **tidak dianggap verifikasi emi-final**.
- Manual QA lanjutan: desktop/768/375px untuk tenant+Owner sidebar, dropdown/modals/picker, ownership Yes/No/Cancel, report/replacement, production API failure/success, setup flag lintas halaman, dan vendor CRUD. Tidak ada data produksi live yang dimutasi untuk tes ini.
