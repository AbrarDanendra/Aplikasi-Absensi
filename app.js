/**
 * ==============================================================================
 * GREENY ABSEN - JAVASCRIPT APPLICATION CORE (CLIENT-SIDE)
 * Sistem Presensi Selfie, GPS Geolocation & Google Apps Script Sync
 * ==============================================================================
 */

// Storage Keys
const STORAGE_USER = "greeny_current_user";
const STORAGE_GAS_URL = "greeny_gas_api_url";
const STORAGE_ABSENSI = "greeny_data_absensi";
const STORAGE_CUTI = "greeny_data_cuti";
const STORAGE_SETTINGS = "greeny_settings";

// State Management
let currentUser = null;
let currentGps = { latitude: null, longitude: null, accuracy: null, distanceMeter: null, isWithinRadius: false };
let cameraStream = null;
let currentFacingMode = "user"; // 'user' (selfie) atau 'environment' (belakang)
let currentAbsenType = "masuk"; // 'masuk' atau 'pulang'
let capturedImageDataUrl = null;
let suratDokterDataUrl = null;

// Default Settings
const defaultSettings = {
  NAMA_KANTOR: "Kantor Pusat Greeny HQ",
  LATITUDE_KANTOR: -6.200000,
  LONGITUDE_KANTOR: 106.816666,
  RADIUS_MAX_METER: 150,
  JAM_MASUK_MAKSIMAL: "08:30",
  JAM_PULANG_MINIMAL: "17:00"
};

// Default Users (Demo / Mock)
const defaultUsers = [
  { userId: "ADM001", password: "admin123", nama: "Administrator Greeny", role: "Admin", jabatan: "HR & IT Manager" },
  { userId: "KRY001", password: "karyawan123", nama: "Rizki Pratama", role: "Karyawan", jabatan: "Frontend Developer" },
  { userId: "KRY002", password: "karyawan123", nama: "Siti Aminah", role: "Karyawan", jabatan: "UI/UX Designer" },
  { userId: "KRY003", password: "karyawan123", nama: "Budi Santoso", role: "Karyawan", jabatan: "Marketing Specialist" }
];

// Sample Initial Attendance Records (Realistic Initial Data)
const sampleAbsensiRecords = [
  {
    idAbsen: "ABS-20261012-101",
    userId: "KRY001",
    nama: "Rizki Pratama",
    tanggal: getFormattedDate(1), // Kemarin
    jamMasuk: "08:14:22",
    jamPulang: "17:05:10",
    status: "Hadir Tepat Waktu",
    jarak: 42,
    koordinat: "-6.200120, 106.816720",
    fotoMasuk: createPlaceholderAvatar("Rizki", "08:14"),
    fotoPulang: createPlaceholderAvatar("Rizki", "17:05"),
    keterangan: "Presensi Harian Normal"
  },
  {
    idAbsen: "ABS-20261012-102",
    userId: "KRY002",
    nama: "Siti Aminah",
    tanggal: getFormattedDate(1),
    jamMasuk: "08:42:15",
    jamPulang: "17:15:00",
    status: "Terlambat",
    jarak: 68,
    koordinat: "-6.200250, 106.816800",
    fotoMasuk: createPlaceholderAvatar("Siti", "08:42"),
    fotoPulang: "",
    keterangan: "Macet di jalan"
  },
  {
    idAbsen: "ABS-20261012-103",
    userId: "KRY003",
    nama: "Budi Santoso",
    tanggal: getFormattedDate(1),
    jamMasuk: "08:20:00",
    jamPulang: "17:00:00",
    status: "Hadir Tepat Waktu",
    jarak: 55,
    koordinat: "-6.200100, 106.816690",
    fotoMasuk: createPlaceholderAvatar("Budi", "08:20"),
    fotoPulang: "",
    keterangan: "Tepat Waktu"
  }
];

// Sample Initial Leave Requests
const sampleCutiRecords = [
  {
    idPengajuan: "REQ-20261010-001",
    userId: "KRY002",
    nama: "Siti Aminah",
    jenis: "Cuti Tahunan",
    tglMulai: getFormattedDate(-2),
    tglSelesai: getFormattedDate(-1),
    jumlahHari: 2,
    alasan: "Keperluan keluarga di luar kota",
    linkBukti: "",
    status: "Approved",
    tglPengajuan: getFormattedDate(3) + " 09:00:00",
    catatanAdmin: "Disetujui, selamat berlibur"
  },
  {
    idPengajuan: "REQ-20261013-002",
    userId: "KRY003",
    nama: "Budi Santoso",
    jenis: "Sakit",
    tglMulai: getFormattedDate(0),
    tglSelesai: getFormattedDate(-1),
    jumlahHari: 2,
    alasan: "Demam tinggi & flu, disarankan istirahat oleh dokter",
    linkBukti: createPlaceholderDoctorNote("Budi Santoso"),
    status: "Pending",
    tglPengajuan: getFormattedDate(0) + " 07:30:00",
    catatanAdmin: ""
  }
];

/* ==============================================================================
   INITIALIZATION
   ============================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initLocalStorage();
  checkAuth();
  startLiveClock();
  fetchUserLocation();
  renderDashboardUI();
  setupEventListeners();
});

function initLocalStorage() {
  if (!localStorage.getItem(STORAGE_SETTINGS)) {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(defaultSettings));
  }
  if (!localStorage.getItem(STORAGE_ABSENSI)) {
    localStorage.setItem(STORAGE_ABSENSI, JSON.stringify(sampleAbsensiRecords));
  }
  if (!localStorage.getItem(STORAGE_CUTI)) {
    localStorage.setItem(STORAGE_CUTI, JSON.stringify(sampleCutiRecords));
  }
  const gasUrl = localStorage.getItem(STORAGE_GAS_URL);
  if (gasUrl) {
    document.getElementById("badgeConnStatus").innerText = "Sheets Online 🟢";
    document.getElementById("inputGasUrl").value = gasUrl;
  }
}

function checkAuth() {
  const savedUser = localStorage.getItem(STORAGE_USER);
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  } else {
    // Default demo login sebagai Rizki Pratama (Karyawan)
    currentUser = defaultUsers[1];
    localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser));
  }
  updateUserDisplay();
}

function updateUserDisplay() {
  if (!currentUser) return;
  const initials = currentUser.nama.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  document.getElementById("userAvatarText").innerText = initials;
  document.getElementById("topGreetingName").innerText = `Halo ${currentUser.nama.split(" ")[0]},`;
  document.getElementById("topUserRole").innerText = `${currentUser.jabatan} • Greeny HQ`;
  document.getElementById("activeUserBadgeRole").innerText = currentUser.role;

  // Profil modal
  document.getElementById("profModalAvatar").innerText = initials;
  document.getElementById("profModalName").innerText = currentUser.nama;
  document.getElementById("profModalRole").innerText = `${currentUser.jabatan} • ID: ${currentUser.userId}`;
  document.getElementById("profModalRoleBadge").innerText = currentUser.role;
  const settings = getSettings();
  document.getElementById("profModalKantor").innerText = settings.NAMA_KANTOR;

  // Toggle admin features
  const pendingCuti = getCutiList().filter(c => c.status === "Pending");
  const badgePending = document.getElementById("pendingLeaveBadge");
  if (currentUser.role === "Admin" && pendingCuti.length > 0) {
    badgePending.style.display = "block";
    badgePending.innerText = pendingCuti.length;
  } else {
    badgePending.style.display = "none";
  }
}

/* ==============================================================================
   LIVE CLOCK & DATE
   ============================================================================== */
function startLiveClock() {
  const dateDisplay = document.getElementById("currentDateDisplay");
  const options = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  const today = new Date();
  dateDisplay.innerText = today.toLocaleDateString("id-ID", options);

  setInterval(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID");
    const serverTimeEl = document.getElementById("profServerTime");
    if (serverTimeEl) serverTimeEl.innerText = `${timeStr} WIB`;
  }, 1000);
}

/* ==============================================================================
   GPS GEOLOCATION & RADIUS CALCULATION
   ============================================================================== */
function fetchUserLocation(onComplete) {
  const heroGpsBadge = document.getElementById("heroGpsBadge");
  const heroGpsText = document.getElementById("heroGpsText");

  if (!navigator.geolocation) {
    heroGpsText.innerText = "GPS tidak didukung browser";
    heroGpsBadge.className = "hero-gps-tag danger";
    if (onComplete) onComplete(false);
    return;
  }

  heroGpsText.innerText = "Mencari GPS...";
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentGps.latitude = pos.coords.latitude;
      currentGps.longitude = pos.coords.longitude;
      currentGps.accuracy = Math.round(pos.coords.accuracy);

      const settings = getSettings();
      const distance = calculateHaversine(
        currentGps.latitude,
        currentGps.longitude,
        settings.LATITUDE_KANTOR,
        settings.LONGITUDE_KANTOR
      );
      currentGps.distanceMeter = Math.round(distance);
      currentGps.isWithinRadius = currentGps.distanceMeter <= settings.RADIUS_MAX_METER;

      // Update Hero GPS Tag
      if (currentGps.isWithinRadius) {
        heroGpsBadge.className = "hero-gps-tag safe";
        heroGpsText.innerText = `Dalam Radius (${currentGps.distanceMeter}m / ${settings.RADIUS_MAX_METER}m)`;
      } else {
        heroGpsBadge.className = "hero-gps-tag danger";
        heroGpsText.innerText = `Di Luar Radius (${currentGps.distanceMeter}m)`;
      }

      // Update Modal Camera GPS Box
      updateModalGpsDisplay();

      if (onComplete) onComplete(true);
    },
    (err) => {
      console.warn("Geolocation warning:", err.message);
      // Fallback: Jika di emulator / izin lokasi belum aktif, gunakan simulasi dekat kantor
      const settings = getSettings();
      currentGps.latitude = settings.LATITUDE_KANTOR + 0.00015;
      currentGps.longitude = settings.LONGITUDE_KANTOR + 0.00010;
      currentGps.distanceMeter = 25;
      currentGps.isWithinRadius = true;

      heroGpsBadge.className = "hero-gps-tag safe";
      heroGpsText.innerText = `Radius Terpenuhi (~${currentGps.distanceMeter}m)`;
      updateModalGpsDisplay();

      if (onComplete) onComplete(true);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

function updateModalGpsDisplay() {
  const header = document.getElementById("gpsStatusHeader");
  const coords = document.getElementById("gpsCoordsText");
  const badge = document.getElementById("gpsRadiusBadge");
  const settings = getSettings();

  if (currentGps.latitude && currentGps.longitude) {
    coords.innerText = `Lat: ${currentGps.latitude.toFixed(6)} | Lng: ${currentGps.longitude.toFixed(6)}`;
    if (currentGps.isWithinRadius) {
      header.innerText = `Lokasi Valid di Radius Kantor`;
      badge.className = "gps-badge-status valid";
      badge.innerText = `✅ Jarak ${currentGps.distanceMeter}m (Batas ${settings.RADIUS_MAX_METER}m)`;
    } else {
      header.innerText = `Perhatian: Di Luar Jangkauan Kantor`;
      badge.className = "gps-badge-status invalid";
      badge.innerText = `⚠️ Jarak ${currentGps.distanceMeter}m (Lebih dari ${settings.RADIUS_MAX_METER}m)`;
    }
  }
}

function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // radius bumi dalam meter
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

/* ==============================================================================
   DASHBOARD UI RENDERING
   ============================================================================== */
function renderDashboardUI() {
  if (!currentUser) return;
  const todayStr = getFormattedDate(0);
  const allAbsensi = getAbsensiList();
  const myTodayRecord = allAbsensi.find(
    (a) => a.userId === currentUser.userId && a.tanggal === todayStr
  );

  const heroTitle = document.getElementById("heroStatusTitle");
  const heroBtn = document.getElementById("btnHeroAbsen");
  const heroBtnText = document.getElementById("btnHeroText");
  const heroLinearBar = document.getElementById("heroLinearBar");
  const heroCircleFill = document.getElementById("heroCircleFill");
  const heroPercentText = document.getElementById("heroProgressPercent");
  const statusPill = document.getElementById("statusPillDisplay");
  const pillText = document.getElementById("pillText");

  if (!myTodayRecord) {
    // Belum absen masuk
    heroTitle.innerHTML = `Belum <span>Absen Masuk</span>`;
    heroBtnText.innerText = "Absen Masuk ➔";
    heroBtn.style.display = "flex";
    heroBtn.onclick = () => openCameraAbsen("masuk");
    heroLinearBar.style.width = "0%";
    heroCircleFill.style.strokeDashoffset = "220";
    heroPercentText.innerText = "0%";
    statusPill.classList.remove("active");
    pillText.innerText = "OFF";
  } else if (myTodayRecord && !myTodayRecord.jamPulang) {
    // Sudah absen masuk, belum absen pulang
    heroTitle.innerHTML = `Sudah <span>Hadir (${myTodayRecord.jamMasuk.substring(0, 5)})</span>`;
    heroBtnText.innerText = "Absen Pulang ➔";
    heroBtn.style.display = "flex";
    heroBtn.onclick = () => openCameraAbsen("pulang");
    heroLinearBar.style.width = "60%";
    heroCircleFill.style.strokeDashoffset = "90";
    heroPercentText.innerText = "60%";
    statusPill.classList.add("active");
    pillText.innerText = "HADIR";
  } else {
    // Selesai (sudah pulang)
    heroTitle.innerHTML = `Presensi Hari Ini <span>Selesai</span>`;
    heroBtnText.innerText = "Sudah Absen Pulang";
    heroBtn.style.display = "flex";
    heroBtn.onclick = () => showToast("Anda sudah menyelesaikan absensi hari ini!", "info");
    heroLinearBar.style.width = "100%";
    heroCircleFill.style.strokeDashoffset = "0";
    heroPercentText.innerText = "100%";
    statusPill.classList.add("active");
    pillText.innerText = "SELESAI";
  }

  // Render Statistik Bulan Ini
  renderStatistikSummary();

  // Render Aktivitas Terkini
  renderRecentActivity();
}

function renderStatistikSummary() {
  const allAbsensi = getAbsensiList();
  const myRecords = allAbsensi.filter(a => a.userId === currentUser.userId);
  const hadirCount = myRecords.filter(a => a.status.includes("Hadir")).length;
  const lateCount = myRecords.filter(a => a.status.includes("Terlambat")).length;
  const allCuti = getCutiList().filter(c => c.userId === currentUser.userId && c.status === "Approved");
  const cutiCount = allCuti.length;

  document.getElementById("statHadirText").innerText = `${hadirCount} Hari Hadir`;
  document.getElementById("statLateText").innerText = `${lateCount} Kali Terlambat`;
  document.getElementById("statLeaveText").innerText = `${cutiCount} Hari Izin/Cuti`;
}

function renderRecentActivity() {
  const container = document.getElementById("recentActivityList");
  const allAbsensi = getAbsensiList();
  const myRecords = allAbsensi.filter(a => a.userId === currentUser.userId).slice(0, 5);

  if (myRecords.length === 0) {
    container.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon icon-sage">📄</div>
        <div class="activity-info">
          <div class="activity-title">Belum ada riwayat aktivitas</div>
          <div class="activity-meta">Lakukan absen selfie untuk memulai pencatatan</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = myRecords.map(item => {
    let badgeClass = "badge-hadir";
    if (item.status.includes("Terlambat")) badgeClass = "badge-terlambat";
    if (item.status.includes("Luar")) badgeClass = "badge-luar";

    return `
      <div class="activity-item" onclick="viewPhotoDetail('${item.fotoMasuk || item.fotoPulang}', '${item.nama}', '${item.tanggal}', '${item.jamMasuk}', '${item.koordinat}')" style="cursor:pointer;">
        <div class="activity-icon icon-emerald">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <div class="activity-info">
          <div class="activity-title">Presensi ${item.tanggal}</div>
          <div class="activity-meta">Masuk: ${item.jamMasuk} ${item.jamPulang ? `• Pulang: ${item.jamPulang}` : ''} • Jarak: ${item.jarak}m</div>
        </div>
        <span class="activity-badge ${badgeClass}">${item.status.split(" ")[0]}</span>
      </div>
    `;
  }).join("");
}

/* ==============================================================================
   CAMERA SELFIE ENGINE (ANTI-BLOKIR SYSTEM)
   ============================================================================== */
function triggerAbsenFlow() {
  const todayStr = getFormattedDate(0);
  const myTodayRecord = getAbsensiList().find(a => a.userId === currentUser.userId && a.tanggal === todayStr);

  if (!myTodayRecord) {
    openCameraAbsen("masuk");
  } else if (!myTodayRecord.jamPulang) {
    openCameraAbsen("pulang");
  } else {
    showToast("Anda sudah menyelesaikan presensi masuk dan pulang hari ini!", "success");
  }
}

function openCameraAbsen(tipe) {
  currentAbsenType = tipe;
  document.getElementById("cameraModalTitle").innerText = tipe === "masuk" ? "📸 Kamera Absen Masuk" : "📸 Kamera Absen Pulang";
  capturedImageDataUrl = null;

  // Reset tampilan modal
  document.getElementById("cameraVideo").style.display = "block";
  document.getElementById("capturedPreview").style.display = "none";
  document.getElementById("faceFrameGuide").style.display = "block";
  document.getElementById("btnSnapPhoto").style.display = "flex";
  document.getElementById("btnRetakePhoto").style.display = "none";
  document.getElementById("btnSubmitAbsen").disabled = true;
  document.getElementById("absenCatatanInput").value = "";

  openModal("modalCameraAbsen");
  fetchUserLocation();
  startCameraStream();
}

async function startCameraStream() {
  const video = document.getElementById("cameraVideo");
  const fallbackBox = document.getElementById("fallbackBox");

  stopCameraStream();

  const constraints = {
    audio: false,
    video: {
      facingMode: currentFacingMode,
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  };

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia tidak didukung pada browser ini");
    }
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = cameraStream;
    video.play();
    fallbackBox.style.display = "none";
  } catch (err) {
    console.warn("Kamera WebRTC gagal:", err.message);
    // Tampilkan tombol fallback kamera HP langsung
    fallbackBox.style.display = "block";
    showToast("Gunakan tombol 'Buka Kamera HP Langsung' di bawah jika kamera terblokir", "warning");
  }
}

function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function switchCameraFacing() {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  const video = document.getElementById("cameraVideo");
  video.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "none";
  startCameraStream();
}

function closeCameraModal() {
  stopCameraStream();
  closeModal("modalCameraAbsen");
}

function captureSelfiePhoto() {
  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("photoCanvas");
  const preview = document.getElementById("capturedPreview");

  if (!video.videoWidth) {
    showToast("Tunggu kamera memuat gambar terlebih dahulu", "warning");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  // Mirror jika mode selfie
  if (currentFacingMode === "user") {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Kembalikan scale untuk watermark
  if (currentFacingMode === "user") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Bubuhkan Watermark Resmi Greeny Absen
  applyWatermarkToCanvas(ctx, canvas.width, canvas.height);

  capturedImageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

  // Tampilkan preview hasil foto
  preview.src = capturedImageDataUrl;
  preview.style.display = "block";
  video.style.display = "none";
  document.getElementById("faceFrameGuide").style.display = "none";
  document.getElementById("btnSnapPhoto").style.display = "none";
  document.getElementById("btnRetakePhoto").style.display = "flex";
  document.getElementById("btnSubmitAbsen").disabled = false;

  stopCameraStream();
  showToast("Foto selfie berhasil diambil!", "success");
}

function retakePhoto() {
  capturedImageDataUrl = null;
  document.getElementById("cameraVideo").style.display = "block";
  document.getElementById("capturedPreview").style.display = "none";
  document.getElementById("faceFrameGuide").style.display = "block";
  document.getElementById("btnSnapPhoto").style.display = "flex";
  document.getElementById("btnRetakePhoto").style.display = "none";
  document.getElementById("btnSubmitAbsen").disabled = true;
  startCameraStream();
}

// Fallback: Menggunakan Input Native File / Kamera Bawaan HP
function handleNativeCameraCapture(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById("photoCanvas");
      canvas.width = img.width > 800 ? 800 : img.width;
      canvas.height = (img.height / img.width) * canvas.width;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      applyWatermarkToCanvas(ctx, canvas.width, canvas.height);

      capturedImageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const preview = document.getElementById("capturedPreview");
      preview.src = capturedImageDataUrl;
      preview.style.display = "block";
      document.getElementById("cameraVideo").style.display = "none";
      document.getElementById("faceFrameGuide").style.display = "none";
      document.getElementById("btnSnapPhoto").style.display = "none";
      document.getElementById("btnRetakePhoto").style.display = "flex";
      document.getElementById("btnSubmitAbsen").disabled = false;

      stopCameraStream();
      showToast("Foto kamera HP berhasil diproses!", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Watermark Generator: Cap Waktu & GPS Anti-Pemalsuan
function applyWatermarkToCanvas(ctx, width, height) {
  const now = new Date();
  const timeStr = `${now.toLocaleDateString("id-ID")} ${now.toLocaleTimeString("id-ID")} WIB`;
  const coordsStr = currentGps.latitude ? `GPS: ${currentGps.latitude.toFixed(5)}, ${currentGps.longitude.toFixed(5)} (${currentGps.distanceMeter}m)` : "GPS: Lokasi Terdeteksi";
  const userStr = `${currentUser.nama} (${currentUser.userId})`;

  // Banner background bawah
  const bannerH = 50;
  ctx.fillStyle = "rgba(6, 78, 59, 0.75)"; // Greeny dark overlay
  ctx.fillRect(0, height - bannerH, width, bannerH);

  // Border aksen hijau terang
  ctx.fillStyle = "#34d399";
  ctx.fillRect(0, height - bannerH, width, 3);

  // Teks Watermark
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`🌿 GREENY ABSEN • ${userStr}`, 12, height - bannerH + 20);

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`${timeStr} • ${coordsStr}`, 12, height - bannerH + 38);
}

/* ==============================================================================
   SUBMISSION KE DATABASE (LOCAL & GOOGLE APPS SCRIPT)
   ============================================================================== */
async function submitAbsensiRecord() {
  if (!capturedImageDataUrl) {
    showToast("Silakan ambil foto selfie terlebih dahulu!", "warning");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitAbsen");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span class="spinner"></span> Menyimpan Absensi...`;

  const settings = getSettings();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID");
  const todayStr = getFormattedDate(0);
  const catatan = document.getElementById("absenCatatanInput").value;

  // Hitung Status
  let status = "Hadir Tepat Waktu";
  if (!currentGps.isWithinRadius) {
    status = `Di Luar Radius (${currentGps.distanceMeter}m)`;
  } else {
    const batasTime = parseTimeToMinutes(settings.JAM_MASUK_MAKSIMAL);
    const currentTime = parseTimeToMinutes(timeStr);
    if (currentTime > batasTime) {
      status = "Terlambat";
    }
  }

  const payload = {
    action: "absen",
    userId: currentUser.userId,
    userName: currentUser.nama,
    tipe: currentAbsenType,
    latitude: currentGps.latitude,
    longitude: currentGps.longitude,
    fotoBase64: capturedImageDataUrl,
    catatan: catatan
  };

  const gasUrl = localStorage.getItem(STORAGE_GAS_URL);

  // Jika terhubung ke Google Apps Script, kirim ke backend
  if (gasUrl) {
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!result.success) {
        showToast(result.message || "Gagal menyimpan ke Google Sheets", "error");
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Konfirmasi & Kirim Absensi";
        return;
      }
    } catch (e) {
      console.warn("GAS Post error:", e);
      showToast("Koneksi Google Sheet gagal, menyimpan secara lokal", "warning");
    }
  }

  // Simpan secara lokal ke LocalStorage
  saveAbsensiLocal(todayStr, timeStr, status, catatan);

  btnSubmit.disabled = false;
  btnSubmit.innerText = "Konfirmasi & Kirim Absensi";
  closeCameraModal();
  renderDashboardUI();
  showToast(`Absen ${currentAbsenType === 'masuk' ? 'Masuk' : 'Pulang'} Berhasil! Status: ${status}`, "success");
}

function saveAbsensiLocal(todayStr, timeStr, status, catatan) {
  const list = getAbsensiList();
  const existingIndex = list.findIndex(a => a.userId === currentUser.userId && a.tanggal === todayStr);

  if (currentAbsenType === "masuk") {
    const newRecord = {
      idAbsen: "ABS-" + todayStr.replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
      userId: currentUser.userId,
      nama: currentUser.nama,
      tanggal: todayStr,
      jamMasuk: timeStr,
      jamPulang: "",
      status: status,
      jarak: currentGps.distanceMeter || 25,
      koordinat: `${currentGps.latitude || -6.200}, ${currentGps.longitude || 106.816}`,
      fotoMasuk: capturedImageDataUrl,
      fotoPulang: "",
      keterangan: catatan
    };
    list.unshift(newRecord);
  } else {
    if (existingIndex !== -1) {
      list[existingIndex].jamPulang = timeStr;
      list[existingIndex].fotoPulang = capturedImageDataUrl;
      if (catatan) {
        list[existingIndex].keterangan = (list[existingIndex].keterangan ? list[existingIndex].keterangan + " | Pulang: " : "") + catatan;
      }
    }
  }

  localStorage.setItem(STORAGE_ABSENSI, JSON.stringify(list));
}

/* ==============================================================================
   PENGAJUAN IZIN / CUTI / SAKIT (WITH SURAT DOKTER UPLOAD)
   ============================================================================== */
function toggleDokterUpload() {
  const jenis = document.getElementById("cutiJenis").value;
  const label = document.getElementById("labelSuratDokter");
  if (jenis === "Sakit") {
    label.innerText = "Foto Surat Dokter (Wajib Untuk Sakit) *";
  } else {
    label.innerText = "Foto Bukti / Surat Pendukung (Opsional)";
  }
}

function previewSuratDokter(event) {
  const file = event.target.files[0];
  if (!file) return;

  const nameEl = document.getElementById("suratDokterName");
  nameEl.innerText = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    suratDokterDataUrl = e.target.result;
    const preview = document.getElementById("suratDokterPreview");
    preview.src = suratDokterDataUrl;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

async function submitCutiRequest() {
  const jenis = document.getElementById("cutiJenis").value;
  const tglMulai = document.getElementById("cutiTglMulai").value;
  const tglSelesai = document.getElementById("cutiTglSelesai").value;
  const alasan = document.getElementById("cutiAlasan").value;

  if (!tglMulai || !tglSelesai || !alasan) {
    showToast("Lengkapi semua field pengajuan!", "warning");
    return;
  }

  if (jenis === "Sakit" && !suratDokterDataUrl) {
    showToast("Pengajuan Sakit wajib melampirkan foto Surat Dokter!", "error");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitCuti");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span class="spinner"></span> Mengirim Permohonan...`;

  const payload = {
    action: "ajukan_cuti",
    userId: currentUser.userId,
    userName: currentUser.nama,
    jenis: jenis,
    tglMulai: tglMulai,
    tglSelesai: tglSelesai,
    alasan: alasan,
    fotoSuratBase64: suratDokterDataUrl
  };

  const gasUrl = localStorage.getItem(STORAGE_GAS_URL);
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("GAS Leave error:", e);
    }
  }

  // Hitung jumlah hari
  const diffDays = Math.ceil(Math.abs(new Date(tglSelesai) - new Date(tglMulai)) / (1000 * 60 * 60 * 24)) + 1;

  const newCuti = {
    idPengajuan: "REQ-" + getFormattedDate(0).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900),
    userId: currentUser.userId,
    nama: currentUser.nama,
    jenis: jenis,
    tglMulai: tglMulai,
    tglSelesai: tglSelesai,
    jumlahHari: diffDays,
    alasan: alasan,
    linkBukti: suratDokterDataUrl || "",
    status: "Pending",
    tglPengajuan: `${getFormattedDate(0)} ${new Date().toLocaleTimeString("id-ID")}`,
    catatanAdmin: ""
  };

  const cutiList = getCutiList();
  cutiList.unshift(newCuti);
  localStorage.setItem(STORAGE_CUTI, JSON.stringify(cutiList));

  btnSubmit.disabled = false;
  btnSubmit.innerText = "Kirim Pengajuan";
  closeModal("modalCuti");
  document.getElementById("formCuti").reset();
  document.getElementById("suratDokterPreview").style.display = "none";
  suratDokterDataUrl = null;

  showToast("Pengajuan berhasil dikirim! Menunggu persetujuan Admin/HR.", "success");
  updateUserDisplay();
}

/* ==============================================================================
   RIWAYAT KEHADIRAN (EMPLOYEE HISTORY)
   ============================================================================== */
function renderUserHistoryTables() {
  const allAbsen = getAbsensiList();
  const myAbsen = allAbsen.filter(a => a.userId === currentUser.userId);
  const tbodyAbsen = document.getElementById("userHistoryTableBody");

  if (myAbsen.length === 0) {
    tbodyAbsen.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px;">Belum ada riwayat presensi</td></tr>`;
  } else {
    tbodyAbsen.innerHTML = myAbsen.map(item => `
      <tr>
        <td><strong>${item.tanggal}</strong></td>
        <td><span class="activity-badge badge-hadir">${item.jamMasuk || '-'}</span></td>
        <td>${item.jamPulang ? `<span class="activity-badge badge-hadir">${item.jamPulang}</span>` : '-'}</td>
        <td><span class="activity-badge ${item.status.includes('Terlambat') ? 'badge-terlambat' : item.status.includes('Luar') ? 'badge-luar' : 'badge-hadir'}">${item.status}</span></td>
        <td>
          ${item.fotoMasuk ? `<img src="${item.fotoMasuk}" class="table-img-thumb" onclick="viewPhotoDetail('${item.fotoMasuk}', '${item.nama}', '${item.tanggal}', '${item.jamMasuk}', '${item.koordinat}')" alt="Foto">` : '-'}
        </td>
        <td>${item.jarak} meter (${item.koordinat})</td>
      </tr>
    `).join("");
  }

  // Riwayat Cuti
  const allCuti = getCutiList();
  const myCuti = allCuti.filter(c => c.userId === currentUser.userId);
  const tbodyCuti = document.getElementById("userLeaveTableBody");

  if (myCuti.length === 0) {
    tbodyCuti.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px;">Belum ada riwayat permohonan</td></tr>`;
  } else {
    tbodyCuti.innerHTML = myCuti.map(item => `
      <tr>
        <td>${item.tglPengajuan}</td>
        <td><strong>${item.jenis}</strong></td>
        <td>${item.tglMulai} s/d ${item.tglSelesai} (${item.jumlahHari} hari)</td>
        <td>${item.alasan}</td>
        <td>
          ${item.linkBukti ? `<img src="${item.linkBukti}" class="table-img-thumb" onclick="viewPhotoDetail('${item.linkBukti}', '${item.nama}', '${item.tglPengajuan}', 'Surat Bukti', '')" alt="Surat">` : '-'}
        </td>
        <td>
          <span class="activity-badge ${item.status === 'Approved' ? 'badge-hadir' : item.status === 'Rejected' ? 'badge-luar' : 'badge-pending'}">${item.status}</span>
        </td>
      </tr>
    `).join("");
  }
}

/* ==============================================================================
   ADMIN PORTAL & REKAP REAL-TIME
   ============================================================================== */
function openAdminPortal() {
  if (currentUser.role !== "Admin") {
    showToast("Akses Terbatas: Hanya Administrator/HR yang dapat membuka panel ini. Beralih ke Akun Admin via Logout.", "warning");
    openModal("modalProfileMenu");
    return;
  }
  openModal("modalAdmin");
  renderAdminAttendanceTable();
  renderAdminLeaveTable();
  loadOfficeSettingsForm();
}

function switchAdminTab(tab) {
  document.getElementById("tabBtnRekap").classList.remove("active");
  document.getElementById("tabBtnApproval").classList.remove("active");
  document.getElementById("tabBtnKantor").classList.remove("active");
  document.getElementById("adminTabRekap").style.display = "none";
  document.getElementById("adminTabApproval").style.display = "none";
  document.getElementById("adminTabKantor").style.display = "none";

  if (tab === "rekap") {
    document.getElementById("tabBtnRekap").classList.add("active");
    document.getElementById("adminTabRekap").style.display = "block";
    renderAdminAttendanceTable();
  } else if (tab === "approval") {
    document.getElementById("tabBtnApproval").classList.add("active");
    document.getElementById("adminTabApproval").style.display = "block";
    renderAdminLeaveTable();
  } else if (tab === "kantor") {
    document.getElementById("tabBtnKantor").classList.add("active");
    document.getElementById("adminTabKantor").style.display = "block";
  }
}

function renderAdminAttendanceTable() {
  const filterDate = document.getElementById("adminFilterDate").value;
  const filterSearch = document.getElementById("adminFilterSearch").value.toLowerCase();
  const filterStatus = document.getElementById("adminFilterStatus").value;

  let records = getAbsensiList();

  if (filterDate) {
    records = records.filter(r => r.tanggal === filterDate);
  }
  if (filterSearch) {
    records = records.filter(r => r.nama.toLowerCase().includes(filterSearch) || r.userId.toLowerCase().includes(filterSearch));
  }
  if (filterStatus) {
    records = records.filter(r => r.status.includes(filterStatus));
  }

  const tbody = document.getElementById("adminAttendanceTableBody");
  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:18px;">Tidak ada data presensi yang sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${r.userId}</strong></td>
      <td>${r.nama}</td>
      <td>${r.tanggal}</td>
      <td><span class="activity-badge badge-hadir">${r.jamMasuk || '-'}</span></td>
      <td>${r.jamPulang ? `<span class="activity-badge badge-hadir">${r.jamPulang}</span>` : '-'}</td>
      <td><span class="activity-badge ${r.status.includes('Terlambat') ? 'badge-terlambat' : r.status.includes('Luar') ? 'badge-luar' : 'badge-hadir'}">${r.status}</span></td>
      <td>${r.jarak} m</td>
      <td>
        ${r.fotoMasuk ? `<img src="${r.fotoMasuk}" class="table-img-thumb" onclick="viewPhotoDetail('${r.fotoMasuk}', '${r.nama}', '${r.tanggal}', '${r.jamMasuk}', '${r.koordinat}')" alt="Foto">` : '-'}
      </td>
      <td>
        <a href="https://maps.google.com/?q=${r.koordinat}" target="_blank" style="color:var(--primary-600); font-weight:600; text-decoration:none;">
          📍 Peta
        </a>
      </td>
    </tr>
  `).join("");
}

function renderAdminLeaveTable() {
  const list = getCutiList();
  const tbody = document.getElementById("adminLeaveTableBody");

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px;">Belum ada pengajuan cuti atau izin.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>${item.idPengajuan}</strong></td>
      <td>${item.nama} (${item.userId})</td>
      <td>${item.jenis}</td>
      <td>${item.tglMulai} s/d ${item.tglSelesai} (${item.jumlahHari} hari)</td>
      <td>${item.alasan}</td>
      <td>
        ${item.linkBukti ? `<img src="${item.linkBukti}" class="table-img-thumb" onclick="viewPhotoDetail('${item.linkBukti}', '${item.nama}', '${item.tglPengajuan}', 'Surat Dokter / Bukti', '')" alt="Surat">` : '-'}
      </td>
      <td>
        <span class="activity-badge ${item.status === 'Approved' ? 'badge-hadir' : item.status === 'Rejected' ? 'badge-luar' : 'badge-pending'}">${item.status}</span>
      </td>
      <td>
        ${item.status === 'Pending' ? `
          <div style="display:flex; gap:4px;">
            <button class="btn-primary-action" style="padding:4px 8px; font-size:0.75rem; background:#10b981;" onclick="processApproval('${item.idPengajuan}', 'Approved')">
              ✓ Setujui
            </button>
            <button class="btn-primary-action" style="padding:4px 8px; font-size:0.75rem; background:#ef4444;" onclick="processApproval('${item.idPengajuan}', 'Rejected')">
              ✕ Tolak
            </button>
          </div>
        ` : `
          <span style="font-size:0.75rem; color:#64748b;">Selesai Diproses</span>
        `}
      </td>
    </tr>
  `).join("");
}

async function processApproval(idPengajuan, statusBaru) {
  const catatan = prompt(`Masukkan catatan admin untuk pengajuan ${idPengajuan} (${statusBaru}):`, statusBaru === "Approved" ? "Disetujui" : "Ditolak karena alasan operasional");
  if (catatan === null) return;

  const gasUrl = localStorage.getItem(STORAGE_GAS_URL);
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "approve_cuti",
          idPengajuan: idPengajuan,
          status: statusBaru,
          catatanAdmin: catatan
        })
      });
    } catch (e) {
      console.warn("GAS approve error:", e);
    }
  }

  // Update secara lokal
  const list = getCutiList();
  const target = list.find(c => c.idPengajuan === idPengajuan);
  if (target) {
    target.status = statusBaru;
    target.catatanAdmin = catatan;
    localStorage.setItem(STORAGE_CUTI, JSON.stringify(list));
  }

  renderAdminLeaveTable();
  updateUserDisplay();
  showToast(`Pengajuan ${idPengajuan} berhasil diubah menjadi ${statusBaru}!`, "success");
}

function loadOfficeSettingsForm() {
  const s = getSettings();
  document.getElementById("settingNamaKantor").value = s.NAMA_KANTOR;
  document.getElementById("settingOfficeLat").value = s.LATITUDE_KANTOR;
  document.getElementById("settingOfficeLng").value = s.LONGITUDE_KANTOR;
  document.getElementById("settingRadius").value = s.RADIUS_MAX_METER;
  document.getElementById("settingJamMasuk").value = s.JAM_MASUK_MAKSIMAL;
}

function saveOfficeSettings() {
  const s = {
    NAMA_KANTOR: document.getElementById("settingNamaKantor").value,
    LATITUDE_KANTOR: parseFloat(document.getElementById("settingOfficeLat").value),
    LONGITUDE_KANTOR: parseFloat(document.getElementById("settingOfficeLng").value),
    RADIUS_MAX_METER: parseInt(document.getElementById("settingRadius").value, 10),
    JAM_MASUK_MAKSIMAL: document.getElementById("settingJamMasuk").value,
    JAM_PULANG_MINIMAL: "17:00"
  };

  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s));
  showToast("Pengaturan kantor berhasil disimpan!", "success");
  fetchUserLocation();
}

function useCurrentGpsAsOffice() {
  if (!currentGps.latitude) {
    showToast("Tunggu GPS selesai mendeteksi posisi Anda saat ini", "warning");
    fetchUserLocation();
    return;
  }
  document.getElementById("settingOfficeLat").value = currentGps.latitude;
  document.getElementById("settingOfficeLng").value = currentGps.longitude;
  showToast("Titik kantor berhasil disesuaikan dengan posisi GPS Anda saat ini!", "success");
}

/* ==============================================================================
   EKSPOR DATA CSV (EXCEL FRIENDLY)
   ============================================================================== */
function exportDataCSV() {
  const records = getAbsensiList();
  if (records.length === 0) {
    showToast("Belum ada data presensi untuk diekspor", "warning");
    return;
  }

  let csvContent = "\uFEFF"; // Byte Order Mark untuk Excel agar UTF-8 rapi
  csvContent += "ID Absen,ID Karyawan,Nama Karyawan,Tanggal,Jam Masuk,Jam Pulang,Status,Jarak (m),Koordinat,Link Foto,Keterangan\n";

  records.forEach(r => {
    const row = [
      `"${r.idAbsen}"`,
      `"${r.userId}"`,
      `"${r.nama}"`,
      `"${r.tanggal}"`,
      `"${r.jamMasuk || ''}"`,
      `"${r.jamPulang || ''}"`,
      `"${r.status}"`,
      `"${r.jarak}"`,
      `"${r.koordinat}"`,
      `"${r.fotoMasuk ? 'Foto Tersedia' : ''}"`,
      `"${r.keterangan || ''}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Presensi_Greeny_${getFormattedDate(0)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("File rekap CSV berhasil diunduh!", "success");
}

/* ==============================================================================
   GOOGLE APPS SCRIPT API CONNECTION
   ============================================================================== */
async function testAndSaveGasUrl() {
  const url = document.getElementById("inputGasUrl").value.trim();
  if (!url) {
    showToast("Masukkan URL Web App Apps Script terlebih dahulu!", "warning");
    return;
  }

  showToast("Menguji koneksi ke Google Apps Script...", "info");

  try {
    const res = await fetch(`${url}?action=ping`);
    const data = await res.json();

    if (data.success) {
      localStorage.setItem(STORAGE_GAS_URL, url);
      document.getElementById("badgeConnStatus").innerText = "Sheets Online 🟢";
      showToast("Berhasil terhubung ke Google Sheets & Drive!", "success");
      closeModal("modalSettingsGAS");
      fetchLiveData();
    } else {
      showToast("Server merespon, namun terjadi kesalahan pada skrip", "warning");
    }
  } catch (err) {
    console.error(err);
    // Masih simpan jika CORS mencegah GET langsung namun POST berfungsi
    localStorage.setItem(STORAGE_GAS_URL, url);
    document.getElementById("badgeConnStatus").innerText = "Sheets Mode (Saved)";
    showToast("URL disimpan! Pastikan izin deployment diatur ke 'Anyone'", "info");
    closeModal("modalSettingsGAS");
  }
}

function resetToLocalDemo() {
  localStorage.removeItem(STORAGE_GAS_URL);
  document.getElementById("inputGasUrl").value = "";
  document.getElementById("badgeConnStatus").innerText = "Google Sheets (Local Demo)";
  showToast("Beralih ke mode offline / demo lokal", "info");
  closeModal("modalSettingsGAS");
}

async function fetchLiveData() {
  const gasUrl = localStorage.getItem(STORAGE_GAS_URL);
  if (!gasUrl) {
    showToast("Memuat ulang data lokal...", "info");
    renderDashboardUI();
    return;
  }

  try {
    showToast("Sinkronisasi data dengan Google Sheets...", "info");
    const res = await fetch(`${gasUrl}?action=get_data`);
    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.absensi) localStorage.setItem(STORAGE_ABSENSI, JSON.stringify(json.data.absensi));
      if (json.data.cuti) localStorage.setItem(STORAGE_CUTI, JSON.stringify(json.data.cuti));
      if (json.data.settings) localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(json.data.settings));
      renderDashboardUI();
      showToast("Sinkronisasi Google Sheets Berhasil!", "success");
    }
  } catch (err) {
    console.warn("Gagal fetch data GAS:", err);
    showToast("Gagal menyinkronkan dengan server Google", "warning");
  }
}

/* ==============================================================================
   AUTHENTICATION & PROFILE MODAL
   ============================================================================== */
function submitLogin() {
  const uId = document.getElementById("loginUserId").value.trim();
  const pwd = document.getElementById("loginPassword").value.trim();

  const found = defaultUsers.find(u => u.userId.toLowerCase() === uId.toLowerCase() && u.password === pwd);

  if (found) {
    currentUser = found;
    localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser));
    closeModal("modalLogin");
    updateUserDisplay();
    renderDashboardUI();
    showToast(`Selamat datang kembali, ${currentUser.nama}!`, "success");
  } else {
    showToast("ID atau Password salah! Gunakan akun demo di bawah.", "error");
  }
}

function fillLoginCreds(uId, pwd) {
  document.getElementById("loginUserId").value = uId;
  document.getElementById("loginPassword").value = pwd;
}

function logoutUser() {
  closeModal("modalProfileMenu");
  openModal("modalLogin");
  showToast("Anda telah keluar dari akun.", "info");
}

function openProfileMenu() {
  openModal("modalProfileMenu");
}

function openInfoKantorModal() {
  const s = getSettings();
  showToast(`Jam Masuk: ${s.JAM_MASUK_MAKSIMAL} • Radius: ${s.RADIUS_MAX_METER}m • ${s.NAMA_KANTOR}`, "info");
}

function openModalLokasiKantor() {
  const s = getSettings();
  showToast(`Lokasi: ${s.NAMA_KANTOR} (Lat: ${s.LATITUDE_KANTOR}, Lng: ${s.LONGITUDE_KANTOR}). Batas radius ${s.RADIUS_MAX_METER}m.`, "info");
  fetchUserLocation();
}

function viewPhotoDetail(photoUrl, nama, tgl, waktu, koordinat) {
  if (!photoUrl) {
    showToast("Tidak ada foto tersimpan untuk entri ini.", "warning");
    return;
  }
  document.getElementById("largePhotoPreview").src = photoUrl;
  document.getElementById("photoMetaInfo").innerHTML = `
    <strong>${nama}</strong><br>
    Waktu: ${tgl} • ${waktu}<br>
    Koordinat: ${koordinat || 'Tersimpan'}
  `;
  const mapLink = document.getElementById("linkGmapsTarget");
  if (koordinat && koordinat.includes(",")) {
    mapLink.href = `https://maps.google.com/?q=${koordinat}`;
    mapLink.style.display = "inline-flex";
  } else {
    mapLink.style.display = "none";
  }
  openModal("modalPhotoView");
}

/* ==============================================================================
   MODAL UTILITIES & NAVIGATION
   ============================================================================== */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
  if (id === "modalRiwayat") renderUserHistoryTables();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
}

function navigateTab(tabName) {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const clicked = event.currentTarget;
  if (clicked) clicked.classList.add("active");

  if (tabName === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast-msg ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function setupEventListeners() {
  // Desktop wide layout toggle
  const btnToggle = document.getElementById("btnToggleWidth");
  const container = document.getElementById("appContainer");
  const label = document.getElementById("labelModeScreen");

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      container.classList.toggle("desktop-wide");
      const isWide = container.classList.contains("desktop-wide");
      label.innerText = isWide ? "Tampilan Mobile (HP)" : "Tampilan Lebar (Laptop)";
    });
  }

  // Close modals when clicking overlay background
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        if (overlay.id === "modalCameraAbsen") {
          closeCameraModal();
        } else {
          overlay.classList.remove("show");
        }
      }
    });
  });
}

/* ==============================================================================
   HELPERS & DATA GENERATORS
   ============================================================================== */
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SETTINGS)) || defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

function getAbsensiList() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ABSENSI)) || [];
  } catch (e) {
    return [];
  }
}

function getCutiList() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CUTI)) || [];
  } catch (e) {
    return [];
  }
}

function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(str) {
  if (!str) return 0;
  const parts = String(str).split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

// Placeholder SVG for Demo Thumbnails
function createPlaceholderAvatar(name, time) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#065f46"/>
    <circle cx="100" cy="75" r="35" fill="#34d399"/>
    <path d="M40 165 C40 120, 160 120, 160 165 Z" fill="#34d399"/>
    <rect y="160" width="200" height="40" fill="#047857"/>
    <text x="100" y="185" font-family="Arial" font-size="14" fill="#ffffff" font-weight="bold" text-anchor="middle">${name} (${time})</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createPlaceholderDoctorNote(patient) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="200" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="20" y="20" width="260" height="35" fill="#e2e8f0" rx="4"/>
    <text x="150" y="42" font-family="Arial" font-size="14" fill="#065f46" font-weight="bold" text-anchor="middle">KLINIK MEDIKA SEHAT</text>
    <text x="30" y="85" font-family="Arial" font-size="12" fill="#334155">Surat Keterangan Sakit: ${patient}</text>
    <text x="30" y="115" font-family="Arial" font-size="11" fill="#64748b">Diagnosa: Febris / Observasi Demam</text>
    <text x="30" y="145" font-family="Arial" font-size="11" fill="#64748b">Dianjurkan istirahat selama 2 hari.</text>
    <circle cx="230" cy="140" r="25" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/>
    <text x="230" y="144" font-family="Arial" font-size="9" fill="#ef4444" font-weight="bold" text-anchor="middle">VALID DR</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
