# 🌿 Greeny Absen - Panduan Lengkap Instalasi & Penggunaan

**Greeny Absen** adalah aplikasi sistem presensi selfie modern berbasis web yang responsif untuk Smartphone (HP) dan Laptop, terintegrasi langsung dengan database **Google Sheets** dan penyimpanan foto **Google Drive** menggunakan **Google Apps Script (GAS)**.

---

## 📱 Fitur Utama Aplikasi

1. **Desain Mobile-First Modern (Nuansa Hijau & Putih)**
   - Terinspirasi dari antarmuka modern dengan glassmorphism & neumorphic card style.
   - Mode responsif: Nyaman digunakan di layar HP maupun layar laptop (tersedia tombol toggle layar lebar di laptop).
2. **Kamera Selfie Anti-Blokir (Universal Device Compatibility)**
   - Kamera live dengan panduan bingkai wajah oval & tombol balik kamera (depan/belakang).
   - **Fitur Anti-Blokir**: Dilengkapi tombol cadangan *"Buka Kamera HP Langsung"* menggunakan native camera capture browser HP, sehingga **100% dijamin tidak akan terblokir** meskipun dibuka lewat browser bawaan, Safari iOS, atau in-app browser seperti WhatsApp.
   - Watermark otomatis: Cap waktu resmi (WIB), koordinat GPS, jarak kantor, dan nama karyawan dibubuhkan otomatis ke dalam foto selfie.
3. **Pencatatan GPS & Validasi Radius Otomatis**
   - Menggunakan formula *Haversine* untuk menghitung jarak akurat dalam hitungan meter dari posisi karyawan ke titik koordinat kantor.
   - Status otomatis: **Hadir Tepat Waktu**, **Terlambat** (jika melebihi batas jam masuk), atau **Di Luar Radius**.
4. **Penyimpanan Foto ke Google Drive & Database Google Sheets**
   - Foto selfie dan bukti surat dokter otomatis diubah menjadi file gambar asli dan diunggah ke folder Google Drive (`Greeny_Absen_Selfie`).
   - Tautan file Drive dan koordinat GPS disimpan rapi di spreadsheet.
5. **Panel Admin & HR Real-time**
   - Rekapitulasi absensi seluruh karyawan secara real-time.
   - Filter berdasarkan tanggal, pencarian nama/ID, dan status kehadiran.
   - Preview foto selfie dan tautan koordinat langsung ke Google Maps.
   - Pengaturan lokasi kantor & toleransi radius (dapat diubah dengan satu klik menggunakan GPS saat ini).
   - Ekspor laporan rekapitulasi ke format **CSV / Excel**.
6. **Pengajuan Izin, Cuti, & Sakit (Approval Workflow)**
   - Form pengajuan cuti langsung dari aplikasi karyawan.
   - Fitur unggah foto surat dokter (wajib jika jenis 'Sakit').
   - Panel persetujuan (Approval) bagi Admin untuk menyetujui (*Approve*) atau menolak (*Reject*) dengan catatan.
7. **Riwayat Kehadiran Karyawan (Personal History)**
   - Rekap absensi pribadi karyawan selama bulan berjalan lengkap dengan jam masuk, jam pulang, dan status.

---

## 🛠️ Langkah-Langkah Pemasangan Backend (Google Sheets & Apps Script)

Untuk menghubungkan aplikasi ini ke Google Sheets dan Google Drive Anda, ikuti langkah mudah berikut:

### Langkah 1: Buat Google Spreadsheet Baru
1. Buka browser dan kunjungi: [https://sheets.new](https://sheets.new)
2. Beri nama spreadsheet Anda, misalnya: `Database Greeny Absen`.

### Langkah 2: Buka Google Apps Script
1. Pada menu atas spreadsheet, klik **Ekstensi (Extensions)** &gt; **Apps Script**.
2. Hapus semua teks yang ada di dalam editor `Code.gs`.
3. Buka file `Code.gs` yang ada di folder project ini, lalu salin (copy) dan tempel (paste) seluruh isinya ke editor Apps Script.

### Langkah 3: Inisialisasi Database Otomatis
1. Di bagian atas editor Apps Script, pada menu dropdown fungsi, pilih fungsi **`setupDatabase`**.
2. Klik tombol **Jalankan (Run)**.
3. Google akan meminta izin (*Authorization Required*):
   - Klik **Tinjau Izin (Review Permissions)**.
   - Pilih akun Google Anda.
   - Klik **Lanjutan (Advanced)** &gt; Klik **Buka... (tidak aman)** / *Go to Untitled project (unsafe)*.
   - Klik **Izinkan (Allow)**.
4. Kembali ke tab spreadsheet Anda. Anda akan melihat **4 sheet otomatis dibuat dengan header hijau cantik**:
   - `Users`: Data ID, Password, Nama, Role, Jabatan.
   - `Absensi`: Data riwayat presensi, foto selfie, koordinat, dan status.
   - `Cuti`: Data permohonan izin/cuti/sakit dan status approval.
   - `Settings`: Pengaturan nama kantor, koordinat GPS kantor, dan radius maksimal.
5. Google Apps Script juga akan otomatis membuat folder bernama **`Greeny_Absen_Selfie`** di Google Drive Anda.

### Langkah 4: Terapkan Sebagai Aplikasi Web (Deploy as Web App)
1. Di pojok kanan atas Apps Script, klik tombol biru **Terapkan (Deploy)** &gt; **Penerapan baru (New deployment)**.
2. Klik ikon gerigi (roda gigi) di sebelah *Pilih jenis*, lalu pilih **Aplikasi web (Web app)**.
3. Isi konfigurasi:
   - **Deskripsi**: `Greeny Absen Web API`
   - **Jalankan sebagai (Execute as)**: `Saya (emailanda@gmail.com)`
   - **Siapa yang memiliki akses (Who has access)**: **`Siapa saja (Anyone)`** *(PENTING: Pilih 'Anyone' agar aplikasi web dapat mengirim data tanpa kendala izin login)*.
4. Klik **Terapkan (Deploy)**.
5. Salin **URL Aplikasi Web (Web App URL)** yang berformat:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Langkah 5: Sambungkan ke Aplikasi Web Frontend
1. Buka file `index.html` di browser Anda (atau jalankan local web server).
2. Klik tombol **Database Sheet** di menu utama aplikasi atau klik ikon rantai/link di bilah atas.
3. Tempelkan URL Web App yang sudah disalin tadi ke kolom input URL.
4. Klik **Hubungkan & Tes API**. Status akan berubah menjadi **Sheets Online 🟢**.

---

## 👥 Akun Default untuk Pengujian (Demo Akun)

Sistem sudah dilengkapi dengan data akun awal yang dapat langsung digunakan:

| Tipe Akun | ID Pengguna | Password | Nama | Jabatan |
|---|---|---|---|---|
| **Administrator** | `ADM001` | `admin123` | Administrator Greeny | HR & IT Manager |
| **Karyawan 1** | `KRY001` | `karyawan123` | Rizki Pratama | Frontend Developer |
| **Karyawan 2** | `KRY002` | `karyawan123` | Siti Aminah | UI/UX Designer |
| **Karyawan 3** | `KRY003` | `karyawan123` | Budi Santoso | Marketing Specialist |
| **Karyawan 4** | `KRY004` | `karyawan123` | Dewi Lestari | Finance Staff |

> 💡 *Catatan: Anda dapat menambahkan karyawan baru langsung melalui sheet `Users` di Google Spreadsheet.*

---

## 🌐 Cara Menjalankan Aplikasi di HP & Laptop

### Opsi A: Jalankan Secara Lokal di Komputer
Anda dapat membuka file `index.html` langsung dengan double-click di browser (Chrome, Edge, Firefox), atau menggunakan ekstensi **Live Server** di VS Code.

### Opsi B: Akses dari HP (Satu Jaringan Wi-Fi)
1. Jalankan web server lokal sederhana di folder ini melalui terminal PowerShell:
   ```powershell
   python -m http.server 8080
   ```
2. Cek IP lokal laptop Anda (misal `192.168.1.15`).
3. Buka browser di HP Anda dan ketik: `http://192.168.1.15:8080`.

### Opsi C: Hosting Gratis Online (Rekomendasi Terbaik untuk HP)
Upload file `index.html`, `style.css`, dan `app.js` ke:
- **GitHub Pages** (Gratis & Aktif 24 Jam)
- **Vercel** / **Netlify** / **Cloudflare Pages** (Tinggal drag and drop folder)

Dengan hosting gratis ini, Anda dan seluruh karyawan bisa membuka link aplikasi dari HP di mana saja dan kapan saja dengan aman (HTTPS aktif, sehingga izin kamera & GPS berjalan sempurna).
