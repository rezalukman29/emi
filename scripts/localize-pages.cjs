const fs = require("node:fs");
const path = require("node:path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "src/pages");
const EN_PATH = path.join(ROOT, "src/locales/en/translation.json");
const ID_PATH = path.join(ROOT, "src/locales/id/translation.json");
const PRESENTATION_ATTRIBUTES = new Set([
  "aria-label",
  "emptyText",
  "label",
  "placeholder",
  "searchPlaceholder",
  "title",
]);
const PRESENTATION_PROPERTIES = new Set([
  "emptyText",
  "label",
  "placeholder",
  "searchPlaceholder",
  "title",
]);
const MESSAGE_CALLS = new Set(["error", "min", "oneOf", "required", "success", "toast"]);
const TECHNICAL_EXPRESSION_TEXT = new Set([
  "#6366f1",
  "#fff",
  "1.5px solid #d1d5db",
  "/event",
  "/superadmin/dashboard",
  "all",
  "asc",
  "badge-blue",
  "badge-green",
  "customer",
  "desc",
  "es",
  "inventory",
  "none",
  "opnamehistory",
  "s",
  "var(--brand)",
  "var(--orange)",
  "var(--red)",
]);
const IGNORED_TEXT = new Set([
  "EMI",
  "F1",
  "F2",
  "GB)",
  "JPG, PNG, WEBP",
  "PNG, JPG, GIF up to 10MB",
  "auth",
  "barang_gudang_id",
  "is_show_scan_result = 1",
  "order_data",
  "/month",
  "/stock-opname",
  "/superadmin",
]);

function walk(directory) {
  return fs.readdirSync(directory).flatMap((name) => {
    const filePath = path.join(directory, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return walk(filePath);
    return /\.(tsx|jsx)$/.test(name) ? [filePath] : [];
  });
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function collectTextFromSource(source) {
  const values = [];
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch {
    return values;
  }
  traverse(ast, {
    JSXText(nodePath) {
      const normalized = normalizeText(nodePath.node.value);
      if (shouldTranslate(normalized)) values.push(normalized);
    },
    JSXAttribute(nodePath) {
      const node = nodePath.node;
      if (!PRESENTATION_ATTRIBUTES.has(node.name.name)) return;
      if (node.value?.type !== "StringLiteral") return;
      const normalized = normalizeText(node.value.value);
      if (shouldTranslate(normalized)) values.push(normalized);
    },
  });
  return values;
}

function shouldTranslate(value) {
  return /[A-Za-z]/.test(value) && !IGNORED_TEXT.has(value);
}

function shouldTranslateExpression(value) {
  const normalized = normalizeText(value);
  if (!shouldTranslate(normalized)) return false;
  if (TECHNICAL_EXPRESSION_TEXT.has(normalized)) return false;
  if (/^[A-Z0-9_]+$/.test(normalized)) return false;
  if (/^\d+(?:px|rem|em|vh|vw|%)\b/.test(normalized)) return false;
  if (/^\s+[a-z-]+$/.test(value)) return false;
  return true;
}

const ID_EXACT = {
  "s": "",
  "es": "",
  "customer": "pelanggan",
  "Upload a decoration image to analyze the materials needed using AI.": "Unggah gambar dekorasi untuk menganalisis material yang diperlukan menggunakan AI.",
  "Upload a decoration image to": "Unggah gambar dekorasi untuk",
  "start the analysis.": "memulai analisis.",
  "No matching materials found in inventory.": "Tidak ada material yang cocok di inventaris.",
  "? This action cannot be undone.": "? Tindakan ini tidak dapat dibatalkan.",
  "No sub areas defined.": "Belum ada subarea yang ditentukan.",
  "— the nearest is": "— yang terdekat adalah",
  "upcoming ·": "mendatang ·",
  "No upcoming events.": "Tidak ada acara mendatang.",
  "d": "h",
  "SKUs have healthy stock levels.": "SKU memiliki tingkat stok yang sehat.",
  "No warehouse stock data.": "Tidak ada data stok gudang.",
  "No recent activity.": "Tidak ada aktivitas terbaru.",
  "No category stock data.": "Tidak ada data stok kategori.",
  "Packaging — group items to scan together": "Pengemasan — kelompokkan barang untuk dipindai bersama",
  "No area found": "Area tidak ditemukan",
  "packaged — each box scans as one QR code.": "dikemas — setiap kotak dipindai sebagai satu kode QR.",
  "No boxes yet. Use the box icon above to group items.": "Belum ada kotak. Gunakan ikon kotak di atas untuk mengelompokkan barang.",
  "Loading...": "Memuat...",
  "still need": "masih perlu",
  "scanning at event status": "dipindai pada status acara",
  "item(s) with status": "barang dengan status",
  "Qty:": "Jml.:",
  "Status:": "Status:",
  "Stock:": "Stok:",
  "No sub-areas available": "Tidak ada subarea yang tersedia",
  "Select All (": "Pilih Semua (",
  "Assign Locations (": "Tetapkan Lokasi (",
  "· Scanned out:": "· Dipindai keluar:",
  "Create Group (": "Buat Grup (",
  "No eligible ungrouped items.": "Tidak ada barang belum dikelompokkan yang memenuhi syarat.",
  "· Qty:": "· Jml.:",
  "Event detail is unavailable because a unique event ID could not be resolved.": "Detail acara tidak tersedia karena ID acara yang unik tidak dapat ditentukan.",
  "— Select Status —": "— Pilih Status —",
  "This list drives the stage stepper on every event detail page in the order shown below. Adding, removing, reordering, or renaming a status applies across events. A status set to Scan requires items to be scanned while an event is at that stage.": "Daftar ini mengatur tahapan pada setiap halaman detail acara sesuai urutan di bawah. Penambahan, penghapusan, perubahan urutan, atau perubahan nama status berlaku untuk seluruh acara. Status yang diatur sebagai Pindai mewajibkan barang dipindai saat acara berada pada tahap tersebut.",
  "Reordering — use the arrows below, then": "Mengubah urutan — gunakan panah di bawah, lalu",
  "to apply or": "untuk menerapkan atau",
  "to discard.": "untuk membatalkan.",
  "No image uploaded": "Belum ada gambar yang diunggah",
  "— Select Unit —": "— Pilih Satuan —",
  "— Select Category —": "— Pilih Kategori —",
  "AI Tune-Up Produk": "Penyempurnaan Produk dengan AI",
  "Harga Rata-Rata Pasar": "Harga Rata-Rata Pasar",
  "contoh: Rp 150.000 - Rp 250.000 / pcs": "contoh: Rp150.000–Rp250.000 / buah",
  "Cara Pemakaian": "Cara Pemakaian",
  "SKU)": "SKU)",
  "% of total": "% dari total",
  "EMI Inventory is an API-backed event and inventory management application. The tenant area manages events, warehouses, inventory, loans, reports, and master data. The separate Owner Panel under": "EMI Inventory adalah aplikasi manajemen acara dan inventaris yang terintegrasi dengan API. Area tenant mengelola acara, gudang, inventaris, peminjaman, laporan, dan data master. Panel Pemilik terpisah pada",
  "manages SaaS customers, plans, and defaults.": "mengelola pelanggan SaaS, paket, dan data bawaan.",
  "Event Detail builds its lifecycle from the Event Status API, ordered by": "Detail Acara membangun siklusnya dari API Status Acara yang diurutkan berdasarkan",
  ". Renaming or reordering the master records therefore changes the stepper without a separate hard-coded stage list.": ". Karena itu, mengubah nama atau urutan data master akan mengubah tahapan tanpa daftar tahap hard-coded terpisah.",
  "Every event item retains the status in which it was added.": "Setiap barang acara mempertahankan status saat barang tersebut ditambahkan.",
  "The item tabs expose Waiting Scan when relevant, Grouped packages, all items up through the current stage, and items added in the current status.": "Tab barang menampilkan Menunggu Pemindaian saat relevan, paket yang dikelompokkan, semua barang hingga tahap saat ini, dan barang yang ditambahkan pada status saat ini.",
  "Event Settings is an Admin shortcut to the same Event Status master page.": "Pengaturan Acara merupakan pintasan Admin menuju halaman master Status Acara yang sama.",
  "Status reordering is an explicit edit flow: Edit Order, adjust the draft, then Save Order or Cancel.": "Perubahan urutan status dilakukan melalui alur khusus: Ubah Urutan, sesuaikan draf, lalu Simpan Urutan atau Batal.",
  "A status with": "Status dengan",
  "is a scan stage. Item scan controls and the guided Next action are only shown at those stages. Moving forward is blocked while required items remain unscanned; moving backward stays available.": "merupakan tahap pemindaian. Kontrol pemindaian barang dan aksi Berikutnya hanya ditampilkan pada tahap tersebut. Perpindahan ke depan diblokir selama masih ada barang wajib yang belum dipindai; perpindahan ke belakang tetap tersedia.",
  "Packaging groups multiple event items into one physical box. A grouped view shows the box, its members, and a single scan action so one box QR can represent every item inside. Existing package information returned by the API remains the source of truth; newly assembled boxes stay local to the current Event Detail session until a create-package contract is available.": "Pengemasan mengelompokkan beberapa barang acara ke dalam satu kotak fisik. Tampilan grup menunjukkan kotak, isinya, dan satu aksi pemindaian sehingga satu QR kotak dapat mewakili semua barang di dalamnya. Informasi paket dari API tetap menjadi sumber data utama; kotak yang baru disusun disimpan lokal pada sesi Detail Acara saat ini sampai kontrak pembuatan paket tersedia.",
  "Event Detail provides a compact summary modal for total quantity, checked items, scan-in, and scan-out progress. View Full Detail opens the API-backed summary page using the event ID; its breadcrumb links back to the event list and the selected event.": "Detail Acara menyediakan modal ringkasan untuk jumlah total, barang yang diperiksa, serta progres pindai masuk dan keluar. Lihat Detail Lengkap membuka halaman ringkasan berbasis API menggunakan ID acara; breadcrumb-nya mengarah kembali ke daftar dan acara yang dipilih.",
  "Tenant login and password recovery use the backend authentication flow and store the authenticated profile in the": "Login tenant dan pemulihan kata sandi menggunakan alur autentikasi backend serta menyimpan profil terautentikasi pada entri",
  "local-storage entry. Tenant routes require that session. Admin and Employee roles use the same operational application; Admin additionally sees the Event Settings shortcut.": "di local storage. Route tenant memerlukan sesi tersebut. Peran Admin dan Karyawan menggunakan aplikasi operasional yang sama; Admin juga melihat pintasan Pengaturan Acara.",
  "Stock Opname is scoped to one warehouse and lives at": "Stock Opname dilakukan untuk satu gudang dan tersedia di",
  ". The operator enters Period, Remark, actual stock, and the observed condition. Submission creates an API record for review; applying an opname is performed from its history rather than silently replacing inventory data locally. Good/Poor condition and notes are included in the create payload, while apply, rollback, and eligible draft deletion use their dedicated backend actions.": ". Operator memasukkan Periode, Keterangan, stok aktual, dan kondisi hasil pemeriksaan. Pengajuan membuat data API untuk ditinjau; penerapan opname dilakukan dari riwayatnya dan tidak mengganti data inventaris secara lokal. Kondisi Baik/Buruk dan catatan disertakan dalam payload pembuatan, sedangkan penerapan, rollback, dan penghapusan draf menggunakan aksi backend masing-masing.",
  "Warehouse Inventory uses backend pagination, searching, sorting, warehouse and stock-status filters. Row actions expose API-backed detail, edit, and delete flows. Stock numbers displayed in the UI are never replaced by the prototype's in-memory warehouse arrays.": "Inventaris Gudang menggunakan paginasi, pencarian, pengurutan, serta filter gudang dan status stok dari backend. Aksi baris menyediakan alur detail, ubah, dan hapus berbasis API. Jumlah stok pada UI tidak pernah diganti oleh data gudang sementara di memori.",
  "The intended flow selects a source warehouse, one or more items and quantities, then a different destination warehouse. The form remains separated from Stock Opname because transfers and physical counts have different audit semantics. Creating an order and loading its history both use the Moving Order API.": "Alur yang dituju memilih gudang asal, satu atau beberapa barang beserta jumlahnya, lalu gudang tujuan yang berbeda. Formulir ini terpisah dari Stock Opname karena pemindahan dan penghitungan fisik memiliki audit yang berbeda. Pembuatan order dan pemuatan riwayatnya menggunakan API Moving Order.",
  "Tenant filters and long option lists use the shared searchable dropdown. Option values continue to use backend IDs or enums, while labels and metadata provide readable context. The Owner Panel keeps its own controls and styling.": "Filter tenant dan daftar opsi panjang menggunakan dropdown bersama yang dapat dicari. Nilai opsi tetap menggunakan ID atau enum backend, sedangkan label dan metadata memberikan konteks yang mudah dibaca. Panel Pemilik mempertahankan kontrol dan gayanya sendiri.",
  "The Log page and Dashboard Recent Activity use backend responses. Source-only localStorage activity logging is intentionally not used in this API-backed application, so refreshing or signing in never replaces server audit records with dummy entries.": "Halaman Log dan Aktivitas Terbaru pada Dasbor menggunakan respons backend. Pencatatan aktivitas melalui localStorage sengaja tidak digunakan sehingga refresh atau login tidak mengganti catatan audit server dengan data dummy.",
  "Item Loan uses backend pagination, searching, status filters, create, and return actions. The listing links to a dedicated detail page that keeps the selected API record readable and exposes its return action. The prototype's multi-item vendor model is not submitted because the current backend create contract accepts one": "Peminjaman Barang menggunakan paginasi, pencarian, filter status, pembuatan, dan aksi pengembalian dari backend. Daftar terhubung ke halaman detail khusus yang menampilkan data API terpilih dan aksi pengembaliannya. Model beberapa barang dari prototipe tidak dikirim karena kontrak backend saat ini menerima satu",
  "per loan.": "untuk setiap peminjaman.",
  "The Upgrade button in the tenant header opens a plan-comparison page. Current plan and storage usage come from the active user-plan response in Redux. The available plan cards and request action remain preview data until a tenant-facing pricing list and checkout endpoint are available.": "Tombol Tingkatkan pada header tenant membuka halaman perbandingan paket. Paket saat ini dan penggunaan penyimpanan berasal dari respons paket pengguna aktif di Redux. Kartu paket dan aksi permintaan masih berupa data pratinjau sampai daftar harga tenant dan endpoint checkout tersedia.",
  "Unable to verify pending stock opname submissions.": "Tidak dapat memverifikasi pengajuan stock opname yang tertunda.",
  "The submission is Pending. Inventory stock has not been changed yet.": "Pengajuan berstatus Menunggu. Stok inventaris belum berubah.",
  "Stock opname is counted one warehouse at a time.": "Stock opname dihitung untuk satu gudang dalam satu waktu.",
  "Stock Opname —": "Stock Opname —",
  "Submit for Approval (": "Ajukan untuk Persetujuan (",
  "Condition and condition notes are retained for review in this browser session. The current API payload persists the counted stock, period, and remark.": "Kondisi dan catatannya dipertahankan untuk peninjauan dalam sesi browser ini. Payload API saat ini menyimpan stok hasil hitung, periode, dan keterangan.",
  "will be submitted as Pending. Stock will not change until an Admin approves it.": "akan diajukan dengan status Menunggu. Stok tidak akan berubah sampai disetujui Admin.",
  "— Select Area —": "— Pilih Area —",
  "Unlock more modules, storage, and AI features for your team. Plan requests are previews until the payment flow is connected.": "Buka lebih banyak modul, penyimpanan, dan fitur AI untuk tim Anda. Permintaan paket masih berupa pratinjau sampai alur pembayaran terhubung.",
  "plan.": "paket.",
  "Search by item name, e.g. acrylic ball": "Cari berdasarkan nama barang, contoh: bola akrilik",
  "No matching items": "Tidak ada barang yang cocok",
  "Try a shorter keyword or clear the search to browse all items.": "Coba kata kunci yang lebih pendek atau bersihkan pencarian untuk melihat semua barang.",
  "selected)": "dipilih)",
  "No items with stock at this warehouse.": "Tidak ada barang yang memiliki stok di gudang ini.",
  "stock:": "stok:",
  "Rejected locally by": "Ditolak secara lokal oleh",
  ". This current-session override does not replace the API history record.": ". Perubahan pada sesi saat ini tidak mengganti catatan riwayat API.",
  "No sub users yet.": "Belum ada subpengguna.",
  "No recent signups.": "Tidak ada pendaftaran terbaru.",
  "Template categories offered to every new customer when their account is provisioned.": "Kategori templat yang ditawarkan kepada setiap pelanggan baru saat akunnya dibuat.",
  "Customers Using": "Pelanggan yang Menggunakan",
  "Template measurement units (e.g. cm, m, kg) offered to every new customer.": "Satuan pengukuran templat (contoh: cm, m, kg) yang ditawarkan kepada setiap pelanggan baru.",
  "No companies found": "Tidak ada perusahaan yang ditemukan",
  "Plan pricing is calculated automatically based on the selected modules, AI feature, and storage capacity.": "Harga paket dihitung otomatis berdasarkan modul, fitur AI, dan kapasitas penyimpanan yang dipilih.",
  "AI Feature": "Fitur AI",
  "Modules (": "Modul (",
  "Storage (": "Penyimpanan (",
  "Total per": "Total per",
  "The file must be an image (JPG, PNG, WEBP).": "File harus berupa gambar (JPG, PNG, WEBP).",
  "Failed to process the image.": "Gagal memproses gambar.",
  "An error occurred. Please try again.": "Terjadi kesalahan. Silakan coba lagi.",
  "No Context": "Tanpa Konteks",
  "Select Event": "Pilih Acara",
  "Manual Input": "Input Manual",
  "Total Sub Areas": "Total Subarea",
  "Required": "Wajib diisi",
  "Success modify area": "Area berhasil diperbarui",
  "Success adding area": "Area berhasil ditambahkan",
  "Success delete area": "Area berhasil dihapus",
  "Total Areas": "Total Area",
  "Search Results": "Hasil Pencarian",
  "Edit Area": "Ubah Area",
  "Success modify category": "Kategori berhasil diperbarui",
  "Success adding category": "Kategori berhasil ditambahkan",
  "Success delete category": "Kategori berhasil dihapus",
  "Total Categories": "Total Kategori",
  "Edit Category": "Ubah Kategori",
  "Scan out is only available when the current status action is SCAN_OUT.": "Pindai keluar hanya tersedia ketika aksi status saat ini adalah SCAN_OUT.",
  "Items saved to the event.": "Barang berhasil disimpan ke acara.",
  "Saving…": "Menyimpan…",
  "Next": "Berikutnya",
  "Re-scan Box": "Pindai Ulang Kotak",
  "Scan Box": "Pindai Kotak",
  "Failed to load areas": "Gagal memuat area",
  "Select an area": "Pilih area",
  "Select an area first": "Pilih area terlebih dahulu",
  "Failed to load sub-areas": "Gagal memuat subarea",
  "Select a sub-area": "Pilih subarea",
  "Add": "Tambah",
  "Select Sub Area": "Pilih Subarea",
  "(No Sub Areas)": "(Tidak Ada Subarea)",
  "Total Records": "Total Data",
  "Events on This Page": "Acara di Halaman Ini",
  "Showing": "Menampilkan",
  "Failed to update event.": "Gagal memperbarui acara.",
  "Failed to create event.": "Gagal membuat acara.",
  "Event updated successfully.": "Acara berhasil diperbarui.",
  "Event created successfully.": "Acara berhasil dibuat.",
  "Failed to delete event.": "Gagal menghapus acara.",
  "No events match your search.": "Tidak ada acara yang cocok dengan pencarian Anda.",
  "No past events.": "Tidak ada acara yang telah selesai.",
  "Edit Event": "Ubah Acara",
  "Minimum value is 0": "Nilai minimum adalah 0",
  "Event status updated successfully.": "Status acara berhasil diperbarui.",
  "Event status created successfully.": "Status acara berhasil dibuat.",
  "Failed to update event status.": "Gagal memperbarui status acara.",
  "Failed to create event status.": "Gagal membuat status acara.",
  "Event status order updated successfully.": "Urutan status acara berhasil diperbarui.",
  "Failed to save event status order.": "Gagal menyimpan urutan status acara.",
  "Failed to delete event status.": "Gagal menghapus status acara.",
  "Total Statuses": "Total Status",
  "Scan Enabled on Page": "Pemindaian Aktif di Halaman",
  "Events Running on Page": "Acara Berlangsung di Halaman",
  "Edit Event Status": "Ubah Status Acara",
  "Completed": "Selesai",
  "Missing": "Hilang",
  "Damaged": "Rusak",
  "Checking Completion": "Penyelesaian Pemeriksaan",
  "Scan In Completion": "Penyelesaian Pindai Masuk",
  "Scan Out Completion": "Penyelesaian Pindai Keluar",
  "Reserved": "Dipesan",
  "On Event": "Digunakan di Acara",
  "Success modify inventory": "Inventaris berhasil diperbarui",
  "Success adding inventory": "Inventaris berhasil ditambahkan",
  "Failed to contact AI.": "Gagal menghubungi AI.",
  "Product name is required before using AI tune-up.": "Nama produk wajib diisi sebelum menggunakan penyempurnaan AI.",
  "A product photo must be uploaded before using AI tune-up.": "Foto produk harus diunggah sebelum menggunakan penyempurnaan AI.",
  "AI tune-up saved successfully!": "Penyempurnaan AI berhasil disimpan!",
  "Failed to save data.": "Gagal menyimpan data.",
  "Edit Inventory": "Ubah Inventaris",
  "Minimum quantity is 1": "Jumlah minimum adalah 1",
  "Total Loans": "Total Peminjaman",
  "Currently Borrowed": "Sedang Dipinjam",
  "Overdue": "Terlambat",
  "Returned": "Dikembalikan",
  "Loaned": "Dipinjam",
  "Total Logs": "Total Log",
  "Today's Activity": "Aktivitas Hari Ini",
  "Active Users": "Pengguna Aktif",
  "Past": "Selesai",
  "Ongoing": "Berlangsung",
  "Failed to create account.": "Gagal membuat akun.",
  "Sub area updated successfully.": "Subarea berhasil diperbarui.",
  "Sub area added successfully.": "Subarea berhasil ditambahkan.",
  "Failed to update sub area.": "Gagal memperbarui subarea.",
  "Failed to add sub area.": "Gagal menambahkan subarea.",
  "Sub area deleted successfully.": "Subarea berhasil dihapus.",
  "Parent Areas": "Area Induk",
  "Edit Sub Area": "Ubah Subarea",
  "Failed to sync inventory.": "Gagal menyinkronkan inventaris.",
  "Syncing…": "Menyinkronkan…",
  "Sync All on This Page": "Sinkronkan Semua di Halaman Ini",
  "Matched on This Page": "Cocok di Halaman Ini",
  "Discrepancies on This Page": "Selisih di Halaman Ini",
  "Success modify unit": "Satuan berhasil diperbarui",
  "Success adding unit": "Satuan berhasil ditambahkan",
  "Total Units": "Total Satuan",
  "Edit Unit": "Ubah Satuan",
  "Custom": "Kustom",
  "Request sent — we’ll be in touch": "Permintaan terkirim — kami akan menghubungi Anda",
  "Contact Sales": "Hubungi Penjualan",
  "Failed to update user.": "Gagal memperbarui pengguna.",
  "Failed to add user.": "Gagal menambahkan pengguna.",
  "Failed to delete user.": "Gagal menghapus pengguna.",
  "Total Users": "Total Pengguna",
  "Admins on This Page": "Admin di Halaman Ini",
  "Admin": "Admin",
  "Staff": "Staf",
  "Edit User": "Ubah Pengguna",
  "Inactive": "Tidak Aktif",
  "Total Items (qty)": "Total Barang (jumlah)",
  "SKU Count": "Jumlah SKU",
  "Low Stock SKUs": "SKU Stok Menipis",
  "Please select item": "Silakan pilih barang",
  "Opname History": "Riwayat Opname",
  "Edit Warehouse Item": "Ubah Barang Gudang",
  "No stock": "Stok tidak tersedia",
  "Total Sessions": "Total Sesi",
  "Pending Approval": "Menunggu Persetujuan",
  "Items Adjusted": "Barang Disesuaikan",
  "Last Submitted": "Terakhir Diajukan",
  "Resolve the pending stock opname before starting a new one": "Selesaikan stock opname yang tertunda sebelum memulai yang baru",
  "Start a new stock opname": "Mulai stock opname baru",
  "Opname Detail": "Detail Opname",
  "Applying…": "Menerapkan…",
  "Deleting…": "Menghapus…",
  "Rolling back…": "Membatalkan penerapan…",
  "Success modify warehouse": "Gudang berhasil diperbarui",
  "Success adding warehouse": "Gudang berhasil ditambahkan",
  "Success delete warehouse": "Gudang berhasil dihapus",
  "Total Warehouses": "Total Gudang",
  "Locations": "Lokasi",
  "Edit Warehouse": "Ubah Gudang",
  "Company is required.": "Perusahaan wajib diisi.",
  "Contact name is required.": "Nama kontak wajib diisi.",
  "Email is required.": "Email wajib diisi.",
  "Plan is required.": "Paket wajib dipilih.",
  "Status is required.": "Status wajib dipilih.",
  "MRR is required.": "MRR wajib diisi.",
  "MRR cannot be negative.": "MRR tidak boleh negatif.",
  "Users is required.": "Jumlah pengguna wajib diisi.",
  "Users cannot be negative.": "Jumlah pengguna tidak boleh negatif.",
  "Failed to update customer.": "Gagal memperbarui pelanggan.",
  "Failed to create customer.": "Gagal membuat pelanggan.",
  "Suspended": "Ditangguhkan",
  "Failed to unblock customer.": "Gagal membuka blokir pelanggan.",
  "Failed to block customer.": "Gagal memblokir pelanggan.",
  "Trial": "Uji Coba",
  "Active MRR": "MRR Aktif",
  "Unblock": "Buka Blokir",
  "Block": "Blokir",
  "Unblock customer": "Buka blokir pelanggan",
  "Block customer": "Blokir pelanggan",
  "Edit Customer": "Ubah Pelanggan",
  "Update User": "Perbarui Pengguna",
  "Category name is required.": "Nama kategori wajib diisi.",
  "Failed to update default category.": "Gagal memperbarui kategori bawaan.",
  "Failed to create default category.": "Gagal membuat kategori bawaan.",
  "Unit name is required.": "Nama satuan wajib diisi.",
  "Abbreviation is required.": "Singkatan wajib diisi.",
  "Type is required.": "Tipe wajib dipilih.",
  "Failed to update default unit.": "Gagal memperbarui satuan bawaan.",
  "Failed to create default unit.": "Gagal membuat satuan bawaan.",
  "Amount is required.": "Jumlah wajib diisi.",
  "Payment method is required.": "Metode pembayaran wajib dipilih.",
  "Paid date is required.": "Tanggal pembayaran wajib diisi.",
  "Failed to update payment.": "Gagal memperbarui pembayaran.",
  "Failed to create payment.": "Gagal membuat pembayaran.",
  "Total Revenue": "Total Pendapatan",
  "Total Transactions": "Total Transaksi",
  "Failed": "Gagal",
  "Edit Payment": "Ubah Pembayaran",
  "Edit Pricing Plan": "Ubah Paket Harga",
  "Monthly": "Bulanan",
  "Yearly": "Tahunan",
  "Custom (price not shown)": "Kustom (harga tidak ditampilkan)",
  "Full name is required.": "Nama lengkap wajib diisi.",
  "Password is required.": "Kata sandi wajib diisi.",
  "Password must contain at least 6 characters.": "Kata sandi minimal 6 karakter.",
  "Role is required.": "Peran wajib dipilih.",
  "A living reference for EMI Inventory behavior, decisions, and current integration boundaries.": "Referensi aktif untuk perilaku, keputusan, dan batas integrasi EMI Inventory saat ini.",
  "A stock opname is awaiting approval. A new count cannot be started until the pending submission is resolved.": "Stock opname sedang menunggu persetujuan. Penghitungan baru tidak dapat dimulai sampai pengajuan yang tertunda diselesaikan.",
  "A stock opname is awaiting approval. Resolve it before starting a new one.": "Stock opname sedang menunggu persetujuan. Selesaikan sebelum memulai yang baru.",
  "Abbreviation": "Singkatan",
  "Action": "Aksi",
  "Actions": "Aksi",
  "Active": "Aktif",
  "active accounts": "akun aktif",
  "Active Subscriptions": "Langganan Aktif",
  "active warehouse locations": "lokasi gudang aktif",
  "Activity Log": "Log Aktivitas",
  "Actual Stock": "Stok Aktual",
  "Add a remark": "Tambahkan keterangan",
  "Add Item": "Tambah Barang",
  "Add Items from Inventory": "Tambah Barang dari Inventaris",
  "Add New Item": "Tambah Barang Baru",
  "Add Payment": "Tambah Pembayaran",
  "Add to Cart": "Tambah ke Keranjang",
  "Add User": "Tambah Pengguna",
  "Added New": "Baru Ditambahkan",
  "Additional": "Tambahan",
  "Additional Code": "Kode Tambahan",
  "Address": "Alamat",
  "AI Analyzer Access": "Akses Analisis AI",
  "AI is analyzing the product...": "AI sedang menganalisis produk...",
  "AI Powered": "Didukung AI",
  "AI Tune-Up": "Penyempurnaan AI",
  "Aisle": "Lorong",
  "Aisle / Rack / Level": "Lorong / Rak / Tingkat",
  "All": "Semua",
  "All Actions": "Semua Aksi",
  "All Areas": "Semua Area",
  "All Categories": "Semua Kategori",
  "All Companies": "Semua Perusahaan",
  "All items in this box will be scanned together.": "Semua barang dalam kotak ini akan dipindai bersamaan.",
  "All Modules": "Semua Modul",
  "All Place": "Semua Tempat",
  "all recorded events": "semua acara yang tercatat",
  "All Roles": "Semua Peran",
  "All Status": "Semua Status",
  "All Statuses": "Semua Status",
  "All stock levels are healthy.": "Semua tingkat stok dalam kondisi baik.",
  "All Types": "Semua Tipe",
  "All Warehouses": "Semua Gudang",
  "Amount": "Jumlah",
  "Analysis Results": "Hasil Analisis",
  "Analyze Materials": "Analisis Material",
  "Analyzing...": "Menganalisis...",
  "and": "dan",
  "Any additional notes…": "Catatan tambahan…",
  "Any item not already in a box can be added, regardless of stage.": "Barang yang belum berada dalam kotak dapat ditambahkan tanpa bergantung pada tahapnya.",
  "Applied": "Diterapkan",
  "Apply": "Terapkan",
  "Apply to": "Terapkan ke",
  "Are you sure you want to delete": "Anda yakin ingin menghapus",
  "Are you sure you want to delete “": "Anda yakin ingin menghapus “",
  "Are you sure you want to delete payment": "Anda yakin ingin menghapus pembayaran",
  "Area": "Area",
  "Area Info": "Informasi Area",
  "Area not found.": "Area tidak ditemukan.",
  "Area:": "Area:",
  "areas": "area",
  "Areas": "Area",
  "as returned?": "sebagai telah dikembalikan?",
  "Assign location": "Tetapkan lokasi",
  "At least 6 characters": "Minimal 6 karakter",
  "Authentication & Roles": "Autentikasi & Peran",
  "Available": "Tersedia",
  "available in inventory": "tersedia di inventaris",
  "Available in inventory": "Tersedia di inventaris",
  "Available stock:": "Stok tersedia:",
  "Back": "Kembali",
  "Backup Plan:": "Rencana Cadangan:",
  "Base platform fee": "Biaya dasar platform",
  "Billing cycle": "Siklus penagihan",
  "Billing Cycle": "Siklus Penagihan",
  "Borrower": "Peminjam",
  "Borrower Name": "Nama Peminjam",
  "box": "kotak",
  "Cancel": "Batal",
  "Cancel Edit": "Batalkan Perubahan",
  "cancelled accounts": "akun dibatalkan",
  "Cart": "Keranjang",
  "categories": "kategori",
  "Category": "Kategori",
  "Category Info": "Informasi Kategori",
  "Category not found.": "Kategori tidak ditemukan.",
  "Change Image": "Ganti Gambar",
  "Check": "Periksa",
  "Checked": "Diperiksa",
  "Checking": "Pemeriksaan",
  "Choose a warehouse…": "Pilih gudang…",
  "Choose warehouse…": "Pilih gudang…",
  "Churn Rate": "Tingkat Churn",
  "Clear": "Bersihkan",
  "Click to select or search for an event...": "Klik untuk memilih atau mencari acara...",
  "Click to upload": "Klik untuk mengunggah",
  "Click to upload image": "Klik untuk mengunggah gambar",
  "Close": "Tutup",
  "Code": "Kode",
  "Code:": "Kode:",
  "Company": "Perusahaan",
  "completely out of stock": "stok benar-benar habis",
  "Completion Progress": "Progres Penyelesaian",
  "Condition": "Kondisi",
  "Condition Notes": "Catatan Kondisi",
  "Contact": "Kontak",
  "Contact Name": "Nama Kontak",
  "Context Used": "Konteks yang Digunakan",
  "Copy table": "Salin tabel",
  "Create Moving Order": "Buat Moving Order",
  "Created At": "Dibuat Pada",
  "Critical": "Kritis",
  "Current Plan": "Paket Saat Ini",
  "Currently Loaned": "Sedang Dipinjam",
  "Customer": "Pelanggan",
  "Customer Count": "Jumlah Pelanggan",
  "customers": "pelanggan",
  "Customers": "Pelanggan",
  "Dashboard": "Dasbor",
  "Date": "Tanggal",
  "Date Submitted": "Tanggal Pengajuan",
  "days": "hari",
  "Default Categories": "Kategori Bawaan",
  "Default Units": "Satuan Bawaan",
  "Delete": "Hapus",
  "Describe the issue…": "Jelaskan masalahnya…",
  "Description": "Deskripsi",
  "Description:": "Deskripsi:",
  "Descriptions, prices, and tips will be generated in the selected language.": "Deskripsi, harga, dan tips akan dibuat dalam bahasa yang dipilih.",
  "Destination Warehouse": "Gudang Tujuan",
  "Detail": "Detail",
  "Detail / Cart": "Detail / Keranjang",
  "Details": "Detail",
  "Done": "Selesai",
  "Due Date": "Tanggal Jatuh Tempo",
  "Edit": "Ubah",
  "Edit Order": "Ubah Urutan",
  "Email": "Email",
  "English": "English",
  "Enter amount": "Masukkan jumlah",
  "Enter at least 3 characters": "Masukkan minimal 3 karakter",
  "Enter event name": "Masukkan nama acara",
  "Enter full name": "Masukkan nama lengkap",
  "Enter password": "Masukkan kata sandi",
  "Est. Qty": "Perkiraan Jml.",
  "Event": "Acara",
  "Event Cart": "Keranjang Acara",
  "Event Context (optional)": "Konteks Acara (opsional)",
  "Event Date": "Tanggal Acara",
  "Event Detail": "Detail Acara",
  "Event Inventory": "Inventaris Acara",
  "Event Lifecycle": "Siklus Acara",
  "Event location / address": "Lokasi / alamat acara",
  "Event Name": "Nama Acara",
  "Event Progress": "Progres Acara",
  "Event Running": "Acara Berlangsung",
  "Event Status": "Status Acara",
  "Event Summary": "Ringkasan Acara",
  "events": "acara",
  "Events by Location": "Acara berdasarkan Lokasi",
  "Example: July 2026": "Contoh: Juli 2026",
  "Finish Date": "Tanggal Selesai",
  "Floor": "Lantai",
  "Floor / Lane": "Lantai / Jalur",
  "found": "ditemukan",
  "Frequently Asked Questions": "Pertanyaan yang Sering Diajukan",
  "from": "dari",
  "From": "Dari",
  "Full name": "Nama lengkap",
  "Full Name": "Nama Lengkap",
  "Go to Opname History": "Buka Riwayat Opname",
  "Good": "Baik",
  "Group Items for Packaging": "Kelompokkan Barang untuk Pengemasan",
  "Group Name": "Nama Grup",
  "Grouped": "Dikelompokkan",
  "History": "Riwayat",
  "Image": "Gambar",
  "Image Preview": "Pratinjau Gambar",
  "Important Considerations": "Pertimbangan Penting",
  "in": "di",
  "in area": "di area",
  "in this box": "dalam kotak ini",
  "Input By": "Diinput Oleh",
  "Invalid or missing event ID.": "ID acara tidak valid atau tidak tersedia.",
  "Inventory": "Inventaris",
  "Inventory Availability": "Ketersediaan Inventaris",
  "Inventory item list": "Daftar barang inventaris",
  "Inventory Report": "Laporan Inventaris",
  "Inventory SKU": "SKU Inventaris",
  "Invite User": "Undang Pengguna",
  "Invoice #": "No. Invoice",
  "item": "barang",
  "Item": "Barang",
  "Item Code": "Kode Barang",
  "Item Count": "Jumlah Barang",
  "Item Detail": "Detail Barang",
  "Item Info": "Informasi Barang",
  "Item Loan": "Peminjaman Barang",
  "Item Name": "Nama Barang",
  "Item not found.": "Barang tidak ditemukan.",
  "Item stock": "Stok barang",
  "Item Stock": "Stok Barang",
  "items": "barang",
  "Items": "Barang",
  "Items by Area": "Barang berdasarkan Area",
  "items found": "barang ditemukan",
  "Items in this Category": "Barang dalam Kategori ini",
  "Items in This Loan": "Barang dalam Peminjaman Ini",
  "Items in this Warehouse": "Barang dalam Gudang ini",
  "Items to Move": "Barang yang Dipindahkan",
  "Items Using": "Barang yang Menggunakan",
  "Items using this unit": "Barang yang menggunakan satuan ini",
  "Joined": "Bergabung",
  "Keyword Search": "Pencarian Kata Kunci",
  "Keywords": "Kata Kunci",
  "Lane": "Jalur",
  "Last Active": "Terakhir Aktif",
  "Level": "Tingkat",
  "Loan Date": "Tanggal Peminjaman",
  "Loan Item": "Pinjam Barang",
  "loans": "peminjaman",
  "Location": "Lokasi",
  "Location (city)": "Lokasi (kota)",
  "Log": "Log",
  "logs": "log",
  "Low Stock": "Stok Menipis",
  "Manage Users": "Kelola Pengguna",
  "Manage users across all customer companies.": "Kelola pengguna dari seluruh perusahaan pelanggan.",
  "Mark": "Tandai",
  "Match": "Cocok",
  "Material Analyzer": "Analisis Material",
  "Material Name": "Nama Material",
  "Memo": "Memo",
  "Method": "Metode",
  "Min": "Min.",
  "Minimum Stock": "Stok Minimum",
  "Module": "Modul",
  "Modules": "Modul",
  "Monthly Recurring Revenue": "Pendapatan Berulang Bulanan",
  "More menu": "Menu lainnya",
  "Most Popular": "Paling Populer",
  "Move down": "Pindahkan ke bawah",
  "Move up": "Pindahkan ke atas",
  "Moved By": "Dipindahkan Oleh",
  "Moving Order": "Moving Order",
  "moving orders": "moving order",
  "Moving orders are loaded directly from the API.": "Moving order dimuat langsung dari API.",
  "MRR (IDR)": "MRR (IDR)",
  "Name": "Nama",
  "need follow-up": "perlu ditindaklanjuti",
  "need immediate restocking": "perlu segera ditambah",
  "need restocking.": "perlu ditambah stoknya.",
  "Needs Attention — Low & Out of Stock": "Perlu Perhatian — Stok Menipis & Habis",
  "New": "Baru",
  "No": "Tidak",
  "No Data": "Tidak Ada Data",
  "None": "Tidak Ada",
  "Not Set": "Belum Diatur",
  "Note": "Catatan",
  "Notes": "Catatan",
  "of": "dari",
  "On this page": "Di halaman ini",
  "on trial": "dalam masa uji coba",
  "Optional": "Opsional",
  "or drag & drop": "atau tarik & lepas",
  "Order": "Urutan",
  "OTP": "OTP",
  "out of stock": "stok habis",
  "Out of Stock": "Stok Habis",
  "Overdue Loans": "Peminjaman Terlambat",
  "Overview": "Ringkasan",
  "Overview Report": "Laporan Ringkasan",
  "Package:": "Paket:",
  "Packaging": "Pengemasan",
  "Paid At": "Dibayar Pada",
  "Parent Area": "Area Induk",
  "Password": "Kata Sandi",
  "past": "selesai",
  "Past Events": "Acara Selesai",
  "Payment Detail": "Detail Pembayaran",
  "Payment Method": "Metode Pembayaran",
  "payments": "pembayaran",
  "Payments": "Pembayaran",
  "Pending": "Menunggu",
  "Period": "Periode",
  "Person in charge": "Penanggung jawab",
  "Phone number / email": "Nomor telepon / email",
  "Plan": "Paket",
  "Plan Name": "Nama Paket",
  "Plan status": "Status paket",
  "Poor": "Buruk",
  "Prepare a multi-item stock transfer between warehouses.": "Siapkan pemindahan beberapa barang antar gudang.",
  "Pricing Plans": "Paket Harga",
  "Print": "Cetak",
  "Print Report": "Cetak Laporan",
  "Product Description": "Deskripsi Produk",
  "Product Knowledge": "Pengetahuan Produk",
  "Product knowledge sections": "Bagian pengetahuan produk",
  "Purpose": "Keperluan",
  "QR Type": "Tipe QR",
  "Qty": "Jml.",
  "Rack": "Rak",
  "Recent Activity": "Aktivitas Terbaru",
  "Recent Payments": "Pembayaran Terbaru",
  "Recent Signups": "Pendaftaran Terbaru",
  "Recommended Additional Items": "Barang Tambahan yang Direkomendasikan",
  "records": "data",
  "registered inventory items": "barang inventaris terdaftar",
  "registered item types": "jenis barang terdaftar",
  "registered setup areas": "area penataan terdaftar",
  "Rejected": "Ditolak",
  "Remark": "Keterangan",
  "Remove": "Hapus",
  "Remove image": "Hapus gambar",
  "Reset": "Atur Ulang",
  "Return Date": "Tanggal Pengembalian",
  "Return Item": "Kembalikan Barang",
  "Role": "Peran",
  "Rollback": "Batalkan Penerapan",
  "Safe": "Aman",
  "Save": "Simpan",
  "Save Event": "Simpan Acara",
  "Save Inventory": "Simpan Inventaris",
  "Save Order": "Simpan Urutan",
  "Save to Inventory": "Simpan ke Inventaris",
  "Saving...": "Menyimpan...",
  "Scan": "Pindai",
  "Scan completed": "Pemindaian selesai",
  "Scan Gate & Next": "Tahap Pindai & Berikutnya",
  "Scan In": "Pindai Masuk",
  "Scan Item": "Pindai Barang",
  "Scan Out": "Pindai Keluar",
  "Scanned": "Dipindai",
  "Scanned In": "Dipindai Masuk",
  "Scanning…": "Memindai…",
  "Search": "Cari",
  "Search Item": "Cari Barang",
  "Search Items": "Cari Barang",
  "Search not applied yet": "Pencarian belum diterapkan",
  "Searchable Dropdowns": "Dropdown yang Dapat Dicari",
  "Seasonal Estimate": "Perkiraan Musiman",
  "Select a role": "Pilih peran",
  "Select a status": "Pilih status",
  "Select a warehouse": "Pilih gudang",
  "Select a warehouse first.": "Pilih gudang terlebih dahulu.",
  "Select additional code": "Pilih kode tambahan",
  "Select an item": "Pilih barang",
  "Select Area": "Pilih Area",
  "Select billing cycle…": "Pilih siklus penagihan…",
  "Select company…": "Pilih perusahaan…",
  "Select Item": "Pilih Barang",
  "Select payment method…": "Pilih metode pembayaran…",
  "Select plan…": "Pilih paket…",
  "Select QR Type": "Pilih Tipe QR",
  "Select role…": "Pilih peran…",
  "Select status…": "Pilih status…",
  "Select storage capacity…": "Pilih kapasitas penyimpanan…",
  "Select the AI Tune-Up output language": "Pilih bahasa hasil Penyempurnaan AI",
  "Select type…": "Pilih tipe…",
  "Select warehouse": "Pilih gudang",
  "Select Warehouse": "Pilih Gudang",
  "Selected Item": "Barang Terpilih",
  "Short description (optional)": "Deskripsi singkat (opsional)",
  "Short event description": "Deskripsi singkat acara",
  "Show Scan": "Tampilkan Pemindaian",
  "SKU": "SKU",
  "Source": "Sumber",
  "Source Warehouse": "Gudang Asal",
  "Start Counting": "Mulai Menghitung",
  "Start Date": "Tanggal Mulai",
  "Start Scan": "Mulai Pindai",
  "Start Stock Opname": "Mulai Stock Opname",
  "Status": "Status",
  "Status / State": "Status / Keadaan",
  "Status Name": "Nama Status",
  "statuses": "status",
  "Stock": "Stok",
  "Stock by Category": "Stok berdasarkan Kategori",
  "Stock by Warehouse": "Stok berdasarkan Gudang",
  "Stock Distribution by Warehouse": "Distribusi Stok berdasarkan Gudang",
  "Stock Health": "Kesehatan Stok",
  "Stock in Cart": "Stok di Keranjang",
  "Stock Item": "Stok Barang",
  "Stock Opname": "Stock Opname",
  "Stock Summary": "Ringkasan Stok",
  "Storage": "Penyimpanan",
  "Storage Capacity": "Kapasitas Penyimpanan",
  "Storage Limit": "Batas Penyimpanan",
  "Storage Limit (bytes)": "Batas Penyimpanan (byte)",
  "Storage used": "Penyimpanan terpakai",
  "sub area": "subarea",
  "Sub Area": "Subarea",
  "Sub Area Name": "Nama Subarea",
  "Sub Area:": "Subarea:",
  "sub areas": "subarea",
  "Sub Areas": "Subarea",
  "Submit Stock Opname for Approval": "Ajukan Stock Opname untuk Persetujuan",
  "Submitted By": "Diajukan Oleh",
  "Submitted for approval.": "Diajukan untuk persetujuan.",
  "Suitable for the event weather conditions": "Sesuai untuk kondisi cuaca acara",
  "Summary": "Ringkasan",
  "Sync": "Sinkronkan",
  "Sync Inventory": "Sinkronisasi Inventaris",
  "System Stock": "Stok Sistem",
  "Take from warehouse": "Ambil dari gudang",
  "The cart is empty": "Keranjang kosong",
  "The cart is empty.": "Keranjang kosong.",
  "This feature is coming soon.": "Fitur ini akan segera tersedia.",
  "This feature will be available soon": "Fitur ini akan segera tersedia",
  "Time": "Waktu",
  "To": "Ke",
  "total": "total",
  "Total Customers": "Total Pelanggan",
  "Total Events": "Total Acara",
  "Total Items": "Total Barang",
  "total loans": "total peminjaman",
  "Total quantity:": "Jumlah total:",
  "Total SKU": "Total SKU",
  "Total Stock": "Total Stok",
  "total units": "total unit",
  "Total Val.": "Total Nilai",
  "Total Valuation": "Total Valuasi",
  "Type": "Tipe",
  "Unavailable": "Tidak Tersedia",
  "Unit": "Satuan",
  "Unit Info": "Informasi Satuan",
  "Unit Name": "Nama Satuan",
  "Unit not found.": "Satuan tidak ditemukan.",
  "units": "unit",
  "units across all warehouses": "unit di seluruh gudang",
  "Upcoming": "Mendatang",
  "upcoming events": "acara mendatang",
  "Upcoming Events": "Acara Mendatang",
  "Updated": "Diperbarui",
  "Updated At": "Diperbarui Pada",
  "Upgrade": "Tingkatkan",
  "Upgrade Your Plan": "Tingkatkan Paket Anda",
  "Upload Decoration Image": "Unggah Gambar Dekorasi",
  "Usage Notes": "Catatan Penggunaan",
  "Used": "Digunakan",
  "User": "Pengguna",
  "users": "pengguna",
  "Users": "Pengguna",
  "Valuation": "Valuasi",
  "Variance": "Selisih",
  "View Detail": "Lihat Detail",
  "View Event Detail": "Lihat Detail Acara",
  "View Full Detail": "Lihat Detail Lengkap",
  "View image": "Lihat gambar",
  "View Opname History": "Lihat Riwayat Opname",
  "View sub areas": "Lihat subarea",
  "Waiting Scan": "Menunggu Pemindaian",
  "Warehouse": "Gudang",
  "Warehouse Info": "Informasi Gudang",
  "Warehouse Inventory": "Inventaris Gudang",
  "Warehouse Item": "Barang Gudang",
  "Warehouse Item Detail": "Detail Barang Gudang",
  "Warehouse not found.": "Gudang tidak ditemukan.",
  "Warehouse Stock": "Stok Gudang",
  "warehouses": "gudang",
  "Warehouses": "Gudang",
  "Warning": "Peringatan",
  "Weather Suitable": "Sesuai Cuaca",
  "Weather Tip": "Tips Cuaca",
  "Weather unavailable — the analysis uses only the image and date.": "Cuaca tidak tersedia — analisis hanya menggunakan gambar dan tanggal.",
  "Weather:": "Cuaca:",
  "Welcome back": "Selamat datang kembali",
  "Wh. Stock": "Stok Gudang",
  "What is the item being borrowed for?": "Untuk apa barang ini dipinjam?",
  "Yes": "Ya",
  "You can edit the AI results before saving.": "Anda dapat mengubah hasil AI sebelum menyimpan.",
  "You have": "Anda memiliki",
  "You're on the": "Anda menggunakan paket"
};

function translateToIndonesian(value) {
  if (Object.prototype.hasOwnProperty.call(ID_EXACT, value)) return ID_EXACT[value];
  if (/^(AI|EMI|IDR|MRR|OTP|PIC|QR|SKU|URL|JPG|PNG|WEBP)(\b|$)/.test(value) && value.split(/\s+/).length === 1) return value;

  const patterns = [
    [/^Loading (.+?)(…|\.\.\.)$/, (_, subject, dots) => `Memuat ${subject.toLowerCase()}${dots}`],
    [/^Failed to load (.+)\.$/, (_, subject) => `Gagal memuat ${subject.toLowerCase()}.`],
    [/^Unable to load (.+)\.$/, (_, subject) => `Tidak dapat memuat ${subject.toLowerCase()}.`],
    [/^No (.+) found\.$/, (_, subject) => `Tidak ada ${subject.toLowerCase()} yang ditemukan.`],
    [/^No (.+) available\.$/, (_, subject) => `Tidak ada ${subject.toLowerCase()} yang tersedia.`],
    [/^Search (.+?)(…|\.\.\.)$/, (_, subject, dots) => `Cari ${subject.toLowerCase()}${dots}`],
    [/^New (.+)$/, (_, subject) => `${subject} Baru`],
    [/^Delete (.+)$/, (_, subject) => `Hapus ${subject}`],
    [/^Back to (.+)$/, (_, subject) => `Kembali ke ${subject}`],
    [/^Select (.+?)(…|\.\.\.)$/, (_, subject, dots) => `Pilih ${subject.toLowerCase()}${dots}`],
    [/^All (.+)$/, (_, subject) => `Semua ${subject}`],
    [/^Add (.+)$/, (_, subject) => `Tambah ${subject}`],
    [/^View (.+)$/, (_, subject) => `Lihat ${subject}`],
    [/^Enter (.+)$/, (_, subject) => `Masukkan ${subject}`],
    [/^Short (.+)$/, (_, subject) => `Singkat ${subject}`],
    [/^(.+) not found\.$/, (_, subject) => `${subject} tidak ditemukan.`],
    [/^(.+) \(optional\)$/, (_, subject) => `${subject} (opsional)`],
    [/^e\.g\. (.+)$/, (_, example) => `contoh: ${example}`],
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  return value;
}

function makeKey(value, usedKeys) {
  const words = value
    .replace(/[’']/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 12);
  let slug = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
  if (!slug || /^\d/.test(slug)) slug = `text${slug}`;
  if (!usedKeys.has(slug) || usedKeys.get(slug) === value) {
    usedKeys.set(slug, value);
    return slug;
  }

  const trimmed = value.trim();
  const semanticSuffixes = [
    /[…]{1}$|\.{3}$/.test(trimmed) && "Placeholder",
    /^[—–-]/.test(trimmed) && "Option",
    /[:“'(]$/.test(trimmed) && "Prefix",
    /^\W/.test(trimmed) && "Suffix",
    /^[a-z]/.test(trimmed) && "Inline",
    /[.!?]$/.test(trimmed) && "Message",
    "Label",
    "Text",
    "Alternative",
  ].filter(Boolean);

  for (const suffix of semanticSuffixes) {
    const candidate = `${slug}${suffix}`;
    if (!usedKeys.has(candidate) || usedKeys.get(candidate) === value) {
      usedKeys.set(candidate, value);
      return candidate;
    }
  }
  throw new Error(`Unable to create a semantic translation key for: ${value}`);
}

function findDefaultFunction(ast) {
  let result;
  traverse(ast, {
    ExportDefaultDeclaration(nodePath) {
      if (nodePath.node.declaration.type === "FunctionDeclaration") {
        result = nodePath.node.declaration;
      }
    },
  });
  return result;
}

function isInside(node, parent) {
  return node.start >= parent.body.start && node.end <= parent.body.end;
}

const en = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
const id = JSON.parse(fs.readFileSync(ID_PATH, "utf8"));
const wording = { ...(en.wording ?? {}) };
const usedKeys = new Map();
const keyByText = new Map();

for (const [key, value] of Object.entries(wording)) {
  usedKeys.set(key, value);
  keyByText.set(value, key);
}

const pageFiles = walk(PAGES_DIR);
const existingKeys = new Set();
for (const filePath of pageFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const match of source.matchAll(/wording\.([A-Za-z0-9_]+)/g)) existingKeys.add(match[1]);
}
function translationKey(value) {
  if (!keyByText.has(value)) keyByText.set(value, makeKey(value, usedKeys));
  const key = keyByText.get(value);
  wording[key] = value;
  return `wording.${key}`;
}

for (const filePath of pageFiles) {
  let source = fs.readFileSync(filePath, "utf8");
  const ast = parser.parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const component = findDefaultFunction(ast);
  if (!component) continue;

  const replacements = [];
  let usesDirectI18n = false;
  let usesTranslationHook = false;
  traverse(ast, {
    JSXText(nodePath) {
      const node = nodePath.node;
      const normalized = normalizeText(node.value);
      if (!shouldTranslate(normalized)) return;
      const insideComponent = isInside(node, component);
      usesTranslationHook ||= insideComponent;
      usesDirectI18n ||= !insideComponent;
      const translate = insideComponent ? "t" : "i18n.t";
      const leading = node.value.match(/^\s*/)?.[0] ?? "";
      const trailing = node.value.match(/\s*$/)?.[0] ?? "";
      replacements.push({
        start: node.start,
        end: node.end,
        value: `${leading}{${translate}(${JSON.stringify(translationKey(normalized))})}${trailing}`,
      });
    },
    JSXAttribute(nodePath) {
      const node = nodePath.node;
      if (!PRESENTATION_ATTRIBUTES.has(node.name.name)) return;
      if (node.value?.type !== "StringLiteral") return;
      const normalized = normalizeText(node.value.value);
      if (!shouldTranslate(normalized)) return;
      const insideComponent = isInside(node, component);
      usesTranslationHook ||= insideComponent;
      usesDirectI18n ||= !insideComponent;
      const translate = insideComponent ? "t" : "i18n.t";
      replacements.push({
        start: node.value.start,
        end: node.value.end,
        value: `{${translate}(${JSON.stringify(translationKey(normalized))})}`,
      });
    },
    ConditionalExpression(nodePath) {
      if (!isInside(nodePath.node, component)) return;
      const jsxAttribute = nodePath.findParent((parent) => parent.isJSXAttribute());
      if (
        jsxAttribute &&
        !PRESENTATION_ATTRIBUTES.has(jsxAttribute.node.name.name)
      ) return;
      for (const branch of [nodePath.node.consequent, nodePath.node.alternate]) {
        if (branch.type !== "StringLiteral" || !shouldTranslateExpression(branch.value)) continue;
        replacements.push({
          start: branch.start,
          end: branch.end,
          value: `t(${JSON.stringify(translationKey(normalizeText(branch.value)))})`,
        });
        usesTranslationHook = true;
      }
    },
    ObjectProperty(nodePath) {
      if (!isInside(nodePath.node, component)) return;
      const key = nodePath.node.key.type === "Identifier"
        ? nodePath.node.key.name
        : nodePath.node.key.value;
      const value = nodePath.node.value;
      if (!PRESENTATION_PROPERTIES.has(key)) return;
      if (value.type !== "StringLiteral" || !shouldTranslateExpression(value.value)) return;
      replacements.push({
        start: value.start,
        end: value.end,
        value: `t(${JSON.stringify(translationKey(normalizeText(value.value)))})`,
      });
      usesTranslationHook = true;
    },
    CallExpression(nodePath) {
      if (!isInside(nodePath.node, component)) return;
      let callee = nodePath.node.callee;
      if (callee.type === "MemberExpression") callee = callee.property;
      const name = callee.type === "Identifier" ? callee.name : "";
      if (!MESSAGE_CALLS.has(name)) return;
      for (const argument of nodePath.node.arguments) {
        if (argument.type !== "StringLiteral" || !shouldTranslateExpression(argument.value)) continue;
        replacements.push({
          start: argument.start,
          end: argument.end,
          value: `t(${JSON.stringify(translationKey(normalizeText(argument.value)))})`,
        });
        usesTranslationHook = true;
      }
    },
  });

  if (!replacements.length) continue;

  const alreadyUsesTranslation = source.includes("useTranslation(");
  const imports = ast.program.body.filter((node) => node.type === "ImportDeclaration");
  const lastImport = imports.at(-1);
  if (usesTranslationHook && !alreadyUsesTranslation) {
    replacements.push({
      start: lastImport?.end ?? 0,
      end: lastImport?.end ?? 0,
      value: `${lastImport ? "\n" : ""}import { useTranslation } from "react-i18next";\n`,
    });
    replacements.push({
      start: component.body.start + 1,
      end: component.body.start + 1,
      value: "\n  const { t } = useTranslation();",
    });
  }
  if (usesDirectI18n && !/import i18n from ["'][^"']+\/i18n["']/.test(source)) {
    const relativeI18nPath = path
      .relative(path.dirname(filePath), path.join(ROOT, "src/i18n"))
      .split(path.sep)
      .join("/");
    const importPath = relativeI18nPath.startsWith(".") ? relativeI18nPath : `./${relativeI18nPath}`;
    replacements.push({
      start: lastImport?.end ?? 0,
      end: lastImport?.end ?? 0,
      value: `${lastImport ? "\n" : ""}import i18n from ${JSON.stringify(importPath)};\n`,
    });
  }

  replacements
    .sort((left, right) => right.start - left.start)
    .forEach(({ start, end, value }) => {
      source = `${source.slice(0, start)}${value}${source.slice(end)}`;
    });
  fs.writeFileSync(filePath, source);
}

en.wording = wording;
id.wording = Object.fromEntries(
  Object.entries(wording).map(([key, value]) => {
    const existing = id.wording?.[key];
    return [key, existing && existing !== value ? existing : translateToIndonesian(value)];
  }),
);
fs.writeFileSync(EN_PATH, `${JSON.stringify(en, null, 2)}\n`);
fs.writeFileSync(ID_PATH, `${JSON.stringify(id, null, 2)}\n`);

const untranslated = Object.entries(wording).filter(([key, value]) => id.wording[key] === value);
console.log(`Localized ${Object.keys(wording).length} unique page strings.`);
console.log(`${untranslated.length} Indonesian strings still use their English fallback.`);
for (const [, value] of untranslated) console.log(`- ${value}`);
const unresolved = [...existingKeys].filter((key) => !wording[key]);
if (unresolved.length) {
  console.warn(`Unable to recover ${unresolved.length} existing keys:`, unresolved);
}
