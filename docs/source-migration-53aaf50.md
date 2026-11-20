# Migrasi emi-source → emi-final — 20 November 2026

## Referensi

- Sumber: `sandmanzz/emi` (emi-source), branch `main` @ `687ba55`.
- Baseline: migrasi sebelumnya `docs/source-migration-2026-11-12.md` (s/d `4bcdfee`) dan `687ba55`
  (sidebar search, sudah diport 18 Nov — lihat `update-history.md`).
- Ditinjau: `53aaf50` (Round 44, PRD `emi-source/docs/prd/PRD-2026-11-16.md`), `bc3ffba` dan `d6b6aea`
  (dokumen review produk saja, tidak ada perubahan UI), dan tampilan halaman Event di emi-source
  yang dikirim owner (kartu dengan cover, jumlah item, tab Ready for Checking / Partial Return).
- Target: `daniel-staging-web`, di atas commit dark mode.

## Yang diport di commit ini

1. **Cover foto di kartu event** (bagian dari `6c7ffda` "card cover" yang belum tampil di list):
   kotak 16:9 `object-fit: cover` di atas kartu. Dibaca dari field opsional `images` (atau
   `image` / `cover_url`) pada record `/v2/event-filter`; menerima URL, data URL, base64 mentah
   (yang dikirim form Create/Edit Event), atau nullable `{String, Valid}`. Kalau kosong, tidak valid,
   atau gagal dimuat → tanpa cover, kartu sama seperti sebelumnya.
2. **Jumlah item di footer kartu** (badge abu-abu di sebelah ikon keranjang), dari `total_items`.
3. **Label lifecycle `checking-inventory` → "Ready for Checking"** (ID: "Siap Diperiksa") di tab,
   kartu ringkasan, badge dan teks PRD, supaya sama dengan emi-source dan dengan popup
   "Ready for Checking" di Event Detail yang sudah memakai istilah itu. Nilai status ke API tidak berubah.

## Round 44 (`53aaf50`) — sudah tercakup di emi-final

| Poin PRD 2026-11-16 | Status di emi-final |
|---|---|
| §1 Form transfer tidak terpotong (baris penuh) | Sudah: `EventLifecycleModal` menampilkan blok transfer full-width di bawah item. |
| §2 Info transferred | Sebagian: badge ↑/↓ Transferred dari flag backend (`is_transfer_from_other_event`, dll.) sudah ada di daftar & drawer. Log per jumlah ("5 transferred → Event (stage)") butuh **partial transfer** di backend — belum. |
| §3 Foto item tidak bisa diganti di Event Detail | Sudah: drawer Event Detail memang tidak punya upload/ganti foto. |
| §4 Rent / Outsource / Production sinkron dengan menu utama | Sudah lewat API: Outsource (Mark Received/Completed, Cancel), Production (status request), Rent (status di Borrowed Items) memakai endpoint yang sama dengan Event Detail. |

## Belum diport (butuh backend)

- **Tab / status Partial Return** dan hitungan "Ready for Checking" yang menjumlahkan partial return:
  API lifecycle (`/v2/event-filter?status=`) belum punya status `partial-return`. Perlu status lifecycle
  baru + return per jumlah yang atomik (lihat migrasi 11–12 Nov §"Closing checks and partial return").
- **Partial transfer + log transfer per jumlah** (Round 44 §2): perlu `transferred_qty`, event & stage tujuan
  per baris, dan `transferred_from` di baris tujuan.

## Asumsi yang perlu dikonfirmasi backend

- `/v2/event-filter` mengirim `images` (dan dalam format apa: URL atau base64) dan `total_items` per event.
  Jika `images` tidak dikirim, cover tidak tampil (tidak error). `total_items` sudah dipakai aplikasi mobile.
