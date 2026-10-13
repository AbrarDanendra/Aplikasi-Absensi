/**
 * ==============================================================================
 * GREENY ABSEN - BACKEND GOOGLE APPS SCRIPT & DATABASE GOOGLE SHEETS
 * Sistem Absensi Selfie & Pengajuan Izin/Cuti
 * ==============================================================================
 * Petunjuk Instalasi:
 * 1. Buka Google Spreadsheet baru di https://sheets.new
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Hapus semua kode default di Apps Script, lalu paste seluruh isi file ini.
 * 4. Jalankan fungsi 'setupDatabase()' satu kali untuk membuat tab sheet, header,
 *    dan data akun awal secara otomatis.
 * 5. Klik 'Terapkan' (Deploy) -> 'Penerapan baru' (New deployment).
 * 6. Pilih jenis 'Aplikasi web' (Web app).
 * 7. Deskripsi: 'Greeny Absen Web API v1'.
 * 8. Jalankan sebagai: 'Saya' (Me).
 * 9. Siapa yang memiliki akses: 'Siapa saja' (Anyone) - PENTING agar web bisa akses.
 * 10. Klik 'Terapkan' (Deploy), berikan izin akses (Authorize access).
 * 11. Salin 'URL Aplikasi Web' yang didapat, lalu masukkan ke file config frontend (app.js).
 * ==============================================================================
 */

// Nama Folder Google Drive untuk menyimpan foto selfie dan surat dokter
const DRIVE_FOLDER_NAME = "Greeny_Absen_Selfie";

// Nama-nama Sheet Database
const SHEET_USERS = "Users";
const SHEET_ABSENSI = "Absensi";
const SHEET_CUTI = "Cuti";
const SHEET_SETTINGS = "Settings";

/**
 * Fungsi Setup Awal: Otomatis membuat tabel, header dengan warna hijau,
 * data pengguna awal, dan folder Google Drive.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Setup Sheet Users
  let sheetUsers = ss.getSheetByName(SHEET_USERS);
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet(SHEET_USERS);
  }
  const headersUsers = [
    "ID Karyawan", "Password", "Nama Lengkap", "Role", "Jabatan", "Email", "No HP", "Status"
  ];
  sheetUsers.getRange(1, 1, 1, headersUsers.length).setValues([headersUsers]);
  formatHeaderRow(sheetUsers, headersUsers.length);

  // Tambahkan user dummy jika sheet masih kosong
  if (sheetUsers.getLastRow() <= 1) {
    sheetUsers.appendRow(["ADM001", "admin123", "Administrator Greeny", "Admin", "HR & IT Manager", "admin@greeny.id", "081234567890", "Aktif"]);
    sheetUsers.appendRow(["KRY001", "karyawan123", "Rizki Pratama", "Karyawan", "Frontend Developer", "rizki@greeny.id", "081298765432", "Aktif"]);
    sheetUsers.appendRow(["KRY002", "karyawan123", "Siti Aminah", "Karyawan", "UI/UX Designer", "siti@greeny.id", "081311223344", "Aktif"]);
    sheetUsers.appendRow(["KRY003", "karyawan123", "Budi Santoso", "Karyawan", "Marketing Specialist", "budi@greeny.id", "081555667788", "Aktif"]);
    sheetUsers.appendRow(["KRY004", "karyawan123", "Dewi Lestari", "Karyawan", "Finance Staff", "dewi@greeny.id", "081777889900", "Aktif"]);
  }

  // 2. Setup Sheet Absensi
  let sheetAbsen = ss.getSheetByName(SHEET_ABSENSI);
  if (!sheetAbsen) {
    sheetAbsen = ss.insertSheet(SHEET_ABSENSI);
  }
  const headersAbsen = [
    "ID Absen", "ID Karyawan", "Nama Karyawan", "Tanggal", "Jam Masuk", "Jam Pulang",
    "Status Kehadiran", "Jarak (Meter)", "Koordinat GPS", "Link Foto Masuk", "Link Foto Pulang", "Keterangan"
  ];
  sheetAbsen.getRange(1, 1, 1, headersAbsen.length).setValues([headersAbsen]);
  formatHeaderRow(sheetAbsen, headersAbsen.length);

  // 3. Setup Sheet Cuti / Izin / Sakit
  let sheetCuti = ss.getSheetByName(SHEET_CUTI);
  if (!sheetCuti) {
    sheetCuti = ss.insertSheet(SHEET_CUTI);
  }
  const headersCuti = [
    "ID Pengajuan", "ID Karyawan", "Nama Karyawan", "Jenis", "Tanggal Mulai", "Tanggal Selesai",
    "Jumlah Hari", "Alasan", "Link Surat Dokter/Bukti", "Status Approval", "Tanggal Pengajuan", "Catatan Admin"
  ];
  sheetCuti.getRange(1, 1, 1, headersCuti.length).setValues([headersCuti]);
  formatHeaderRow(sheetCuti, headersCuti.length);

  // 4. Setup Sheet Settings
  let sheetSettings = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet(SHEET_SETTINGS);
  }
  const headersSettings = ["Setting Key", "Setting Value", "Deskripsi"];
  sheetSettings.getRange(1, 1, 1, headersSettings.length).setValues([headersSettings]);
  formatHeaderRow(sheetSettings, headersSettings.length);

  if (sheetSettings.getLastRow() <= 1) {
    sheetSettings.appendRow(["NAMA_KANTOR", "Kantor Pusat Greeny HQ", "Nama lokasi kantor"]);
    sheetSettings.appendRow(["LATITUDE_KANTOR", "-6.200000", "Garis lintang kantor"]);
    sheetSettings.appendRow(["LONGITUDE_KANTOR", "106.816666", "Garis bujur kantor"]);
    sheetSettings.appendRow(["RADIUS_MAX_METER", "150", "Radius absensi yang diizinkan (dalam meter)"]);
    sheetSettings.appendRow(["JAM_MASUK_MAKSIMAL", "08:30", "Batas waktu masuk sebelum dihitung terlambat"]);
    sheetSettings.appendRow(["JAM_PULANG_MINIMAL", "17:00", "Waktu minimal absensi kepulangan"]);
    sheetSettings.appendRow(["DRIVE_FOLDER_NAME", DRIVE_FOLDER_NAME, "Nama folder penyimpanan foto"]);
  }

  // 5. Buat Folder Google Drive jika belum ada
  getOrCreateDriveFolder(DRIVE_FOLDER_NAME);

  Logger.log("✅ Inisialisasi Database Greeny Absen Berhasil Selesai!");
}

/**
 * Format baris header tabel dengan warna hijau Greeny
 */
function formatHeaderRow(sheet, colCount) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground("#059669"); // Emerald Green
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Poppins");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  for (let c = 1; c <= colCount; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * Ambil atau buat folder Google Drive
 */
function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = DriveApp.createFolder(folderName);
  // Buat folder dapat diakses siapa saja yang punya link (agar foto bisa ditampilkan di aplikasi)
  try {
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    Logger.log("Warning sharing folder: " + err.message);
  }
  return newFolder;
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "ping";

    if (action === "ping") {
      return jsonResponse({
        success: true,
        message: "API Greeny Absen Online & Ready",
        serverTime: new Date().toISOString()
      });
    }

    if (action === "get_settings") {
      const settings = getSettingsMap();
      return jsonResponse({ success: true, data: settings });
    }

    if (action === "get_data") {
      // Ambil seluruh data untuk dashboard
      const data = {
        users: getSheetData(SHEET_USERS),
        absensi: getSheetData(SHEET_ABSENSI),
        cuti: getSheetData(SHEET_CUTI),
        settings: getSettingsMap()
      };
      return jsonResponse({ success: true, data: data });
    }

    if (action === "get_history") {
      const userId = params.userId;
      if (!userId) {
        return jsonResponse({ success: false, message: "Parameter userId wajib disertakan" });
      }
      const allAbsensi = getSheetData(SHEET_ABSENSI);
      const allCuti = getSheetData(SHEET_CUTI);
      const userAbsensi = allAbsensi.filter(r => String(r["ID Karyawan"]).trim().toLowerCase() === String(userId).trim().toLowerCase());
      const userCuti = allCuti.filter(r => String(r["ID Karyawan"]).trim().toLowerCase() === String(userId).trim().toLowerCase());

      return jsonResponse({
        success: true,
        data: {
          absensi: userAbsensi,
          cuti: userCuti
        }
      });
    }

    return jsonResponse({ success: false, message: "Aksi tidak dikenali: " + action });

  } catch (error) {
    return jsonResponse({ success: false, message: "Error pada server: " + error.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action;

    // 1. Action: Login
    if (action === "login") {
      return handleLogin(payload.userId, payload.password);
    }

    // 2. Action: Absensi (Masuk / Pulang)
    if (action === "absen") {
      return handleAbsensi(payload);
    }

    // 3. Action: Pengajuan Izin / Cuti / Sakit
    if (action === "ajukan_cuti") {
      return handleAjukanCuti(payload);
    }

    // 4. Action: Approval Cuti (Admin)
    if (action === "approve_cuti") {
      return handleApproveCuti(payload);
    }

    // 5. Action: Update Settings Kantor
    if (action === "update_settings") {
      return handleUpdateSettings(payload);
    }

    return jsonResponse({ success: false, message: "Action tidak didukung: " + action });

  } catch (err) {
    return jsonResponse({ success: false, message: "Error proses: " + err.toString() });
  }
}

/**
 * Handler Autentikasi Pengguna
 */
function handleLogin(userId, password) {
  if (!userId || !password) {
    return jsonResponse({ success: false, message: "ID Karyawan dan Password wajib diisi!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();

  // Header baris 1
  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0]).trim();
    const rowPassword = String(data[i][1]).trim();
    const rowStatus = String(data[i][7] || "Aktif").trim();

    if (rowUserId.toLowerCase() === String(userId).trim().toLowerCase()) {
      if (rowPassword === String(password).trim()) {
        if (rowStatus.toLowerCase() !== "aktif") {
          return jsonResponse({ success: false, message: "Akun Anda berstatus non-aktif. Hubungi Admin." });
        }

        const user = {
          userId: rowUserId,
          nama: data[i][2],
          role: data[i][3],
          jabatan: data[i][4],
          email: data[i][5],
          noHp: data[i][6]
        };

        return jsonResponse({
          success: true,
          message: "Login berhasil! Selamat datang, " + user.nama,
          user: user
        });
      } else {
        return jsonResponse({ success: false, message: "Password yang Anda masukkan salah!" });
      }
    }
  }

  return jsonResponse({ success: false, message: "ID Karyawan tidak ditemukan dalam sistem!" });
}

/**
 * Handler Perekaman Absensi Masuk & Pulang
 */
function handleAbsensi(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ABSENSI);
  const settings = getSettingsMap();

  const userId = data.userId;
  const userName = data.userName || "";
  const tipeAbsen = data.tipe; // 'masuk' atau 'pulang'
  const userLat = parseFloat(data.latitude);
  const userLng = parseFloat(data.longitude);
  const fotoBase64 = data.fotoBase64; // Data URL Base64
  const catatan = data.catatan || "";

  if (!userId || !tipeAbsen) {
    return jsonResponse({ success: false, message: "Data absensi tidak lengkap!" });
  }

  // Hitung Jarak ke Kantor
  const officeLat = parseFloat(settings.LATITUDE_KANTOR || -6.200000);
  const officeLng = parseFloat(settings.LONGITUDE_KANTOR || 106.816666);
  const maxRadius = parseFloat(settings.RADIUS_MAX_METER || 150);

  let jarakMeter = 0;
  if (!isNaN(userLat) && !isNaN(userLng)) {
    jarakMeter = Math.round(calculateDistance(userLat, userLng, officeLat, officeLng));
  }

  const isWithinRadius = jarakMeter <= maxRadius;

  // Unggah Foto ke Google Drive
  let fotoUrl = "";
  if (fotoBase64 && fotoBase64.indexOf("data:image") !== -1) {
    const fileName = "Absen_" + userId + "_" + tipeAbsen.toUpperCase() + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss") + ".jpg";
    fotoUrl = uploadBase64ToDrive(fotoBase64, fileName);
  }

  const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm:ss");

  const absensiData = sheet.getDataRange().getValues();
  let existingRowIndex = -1;

  // Cek apakah sudah pernah absen masuk hari ini
  for (let i = 1; i < absensiData.length; i++) {
    const rowUserId = String(absensiData[i][1]).trim();
    const rowDate = formatDateCell(absensiData[i][3]);

    if (rowUserId.toLowerCase() === String(userId).toLowerCase() && rowDate === todayStr) {
      existingRowIndex = i + 1; // 1-based index di Sheets
      break;
    }
  }

  if (tipeAbsen === "masuk") {
    if (existingRowIndex !== -1) {
      return jsonResponse({
        success: false,
        message: "Anda sudah melakukan Absen Masuk untuk hari ini pada jam " + absensiData[existingRowIndex - 1][4]
      });
    }

    // Tentukan status kehadiran
    const jamMasukBatas = settings.JAM_MASUK_MAKSIMAL || "08:30";
    let statusKehadiran = "Hadir Tepat Waktu";

    if (!isWithinRadius) {
      statusKehadiran = "Di Luar Radius (" + jarakMeter + "m)";
    } else {
      const batasTime = parseTimeToMinutes(jamMasukBatas);
      const currentTime = parseTimeToMinutes(timeStr);
      if (currentTime > batasTime) {
        statusKehadiran = "Terlambat";
      }
    }

    const idAbsen = "ABS-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
    const koordinatStr = userLat + ", " + userLng;

    // Append baris baru
    sheet.appendRow([
      idAbsen,
      userId,
      userName,
      todayStr,
      timeStr,
      "", // Jam Pulang masih kosong
      statusKehadiran,
      jarakMeter,
      koordinatStr,
      fotoUrl,
      "", // Foto Pulang
      catatan
    ]);

    return jsonResponse({
      success: true,
      message: "Absen Masuk Berhasil dicatat! Status: " + statusKehadiran,
      data: {
        idAbsen: idAbsen,
        status: statusKehadiran,
        jamMasuk: timeStr,
        jarak: jarakMeter,
        fotoUrl: fotoUrl
      }
    });

  } else if (tipeAbsen === "pulang") {
    if (existingRowIndex === -1) {
      return jsonResponse({
        success: false,
        message: "Anda belum melakukan Absen Masuk hari ini. Silakan absen masuk terlebih dahulu!"
      });
    }

    // Update baris yang sudah ada
    // Kolom 6: Jam Pulang, Kolom 11: Link Foto Pulang
    sheet.getRange(existingRowIndex, 6).setValue(timeStr);
    if (fotoUrl) {
      sheet.getRange(existingRowIndex, 11).setValue(fotoUrl);
    }
    if (catatan) {
      const prevNotes = sheet.getRange(existingRowIndex, 12).getValue() || "";
      sheet.getRange(existingRowIndex, 12).setValue((prevNotes ? prevNotes + " | Pulang: " : "") + catatan);
    }

    return jsonResponse({
      success: true,
      message: "Absen Pulang Berhasil dicatat pada jam " + timeStr + ". Selamat beristirahat!",
      data: {
        jamPulang: timeStr,
        fotoUrl: fotoUrl
      }
    });
  }

  return jsonResponse({ success: false, message: "Tipe absensi tidak valid!" });
}

/**
 * Handler Pengajuan Izin / Cuti / Sakit
 */
function handleAjukanCuti(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CUTI);

  const userId = data.userId;
  const userName = data.userName || "";
  const jenis = data.jenis || "Izin"; // Izin, Cuti, Sakit
  const tglMulai = data.tglMulai;
  const tglSelesai = data.tglSelesai;
  const alasan = data.alasan || "";
  const fotoSuratBase64 = data.fotoSuratBase64;

  if (!userId || !tglMulai || !tglSelesai || !alasan) {
    return jsonResponse({ success: false, message: "Mohon lengkapi semua kolom pengajuan cuti/izin!" });
  }

  // Hitung durasi hari
  const start = new Date(tglMulai);
  const end = new Date(tglSelesai);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Simpan foto surat dokter jika ada
  let linkBukti = "";
  if (fotoSuratBase64 && fotoSuratBase64.indexOf("data:image") !== -1) {
    const fileName = "Surat_" + jenis + "_" + userId + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss") + ".jpg";
    linkBukti = uploadBase64ToDrive(fotoSuratBase64, fileName);
  }

  const idPengajuan = "REQ-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd") + "-" + Math.floor(100 + Math.random() * 900);
  const tglPengajuan = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    idPengajuan,
    userId,
    userName,
    jenis,
    tglMulai,
    tglSelesai,
    diffDays,
    alasan,
    linkBukti,
    "Pending",
    tglPengajuan,
    "" // Catatan Admin
  ]);

  return jsonResponse({
    success: true,
    message: "Pengajuan " + jenis + " berhasil dikirim! Menunggu persetujuan Admin/HR.",
    data: {
      idPengajuan: idPengajuan,
      status: "Pending",
      jumlahHari: diffDays,
      linkBukti: linkBukti
    }
  });
}

/**
 * Handler Persetujuan Pengajuan Cuti oleh Admin
 */
function handleApproveCuti(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CUTI);

  const idPengajuan = data.idPengajuan;
  const statusBaru = data.status; // 'Approved' atau 'Rejected'
  const catatanAdmin = data.catatanAdmin || "";

  if (!idPengajuan || !statusBaru) {
    return jsonResponse({ success: false, message: "ID Pengajuan dan Status baru harus ditentukan!" });
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(idPengajuan).trim()) {
      sheet.getRange(i + 1, 10).setValue(statusBaru); // Kolom 10: Status Approval
      sheet.getRange(i + 1, 12).setValue(catatanAdmin); // Kolom 12: Catatan Admin

      return jsonResponse({
        success: true,
        message: "Status pengajuan " + idPengajuan + " berhasil diubah menjadi: " + statusBaru
      });
    }
  }

  return jsonResponse({ success: false, message: "Data pengajuan tidak ditemukan!" });
}

/**
 * Handler Pembaruan Pengaturan Kantor
 */
function handleUpdateSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const rows = sheet.getDataRange().getValues();

  const updates = data.settings || {};

  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0]).trim();
    if (updates[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(updates[key]);
    }
  }

  return jsonResponse({
    success: true,
    message: "Pengaturan kantor berhasil disimpan!"
  });
}

/**
 * Helper: Upload Base64 image to Google Drive
 */
function uploadBase64ToDrive(base64Data, fileName) {
  try {
    const folder = getOrCreateDriveFolder(DRIVE_FOLDER_NAME);
    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const base64Bytes = base64Data.substring(base64Data.indexOf(",") + 1);
    const decodedBytes = Utilities.base64Decode(base64Bytes);
    const blob = Utilities.newBlob(decodedBytes, contentType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Dapatkan URL tampilan langsung
    return file.getUrl();
  } catch (e) {
    Logger.log("Error upload file ke Drive: " + e.message);
    return "";
  }
}

/**
 * Helper: Hitung Jarak GPS dengan Haversine Formula (Meter)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Helper: Ambil data Sheet dalam bentuk array of objects
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      }
      item[headers[j]] = val;
    }
    list.push(item);
  }
  return list;
}

/**
 * Helper: Ambil settings dalam bentuk Key-Value Object
 */
function getSettingsMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const map = {
    NAMA_KANTOR: "Kantor Pusat Greeny Indonesia",
    LATITUDE_KANTOR: -6.200000,
    LONGITUDE_KANTOR: 106.816666,
    RADIUS_MAX_METER: 150,
    JAM_MASUK_MAKSIMAL: "08:30",
    JAM_PULANG_MINIMAL: "17:00",
    DRIVE_FOLDER_NAME: DRIVE_FOLDER_NAME
  };

  if (!sheet) return map;

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0]).trim();
    const val = values[i][1];
    if (key) {
      map[key] = val;
    }
  }
  return map;
}

/**
 * Helper: Format Tanggal Cell
 */
function formatDateCell(cellValue) {
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, "Asia/Jakarta", "yyyy-MM-dd");
  }
  return String(cellValue).trim();
}

/**
 * Helper: Parse 'HH:mm' atau 'HH:mm:ss' ke menit untuk komparasi waktu
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Helper: Buat HTTP JSON Response dengan CORS Header
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
