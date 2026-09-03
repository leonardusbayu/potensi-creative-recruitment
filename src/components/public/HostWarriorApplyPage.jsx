import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Check, Upload, Send } from "lucide-react";

const NICHE_OPTIONS = [
  { value: "Skincare", label: "💄 Skincare" },
  { value: "Make Up", label: "💅 Make Up" },
  { value: "Parfum", label: "🌸 Parfum" },
  { value: "Cat Food", label: "🐾 Cat Food" },
  { value: "Vitamin Anak", label: "👶 Vitamin Anak" },
];

const WA_NUMBER = "6283165128857";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo, saya tertarik mendaftar sebagai Host Live di Potensi Creative. Boleh saya tahu info lebih lanjut?")}`;

export const HostWarriorApplyPage = ({ jobSlug }) => {
  const { jobs, submitApplication } = useBooking();
  const demoJob = jobs.find((j) => j.slug === jobSlug) ?? jobs[0];
  const [job, setJob] = useState(demoJob ? { id: demoJob.id, slug: demoJob.slug, title: demoJob.title, description: demoJob.description } : null);
  const [jobStatus, setJobStatus] = useState(demoJob ? "ready" : "loading");
  const [form, setForm] = useState({
    name: "", usia: "", wa: "", email: "", domisili: "",
    pendidikan: "", pengalaman: "", niches: [],
    portofolio: "", cv: null, tema: "", alasan: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errorToast, setErrorToast] = useState(false);

  React.useEffect(() => {
    if (!jobSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/jobs/slug/${encodeURIComponent(jobSlug)}`);
        if (!r.ok) throw new Error("not found");
        const j = await r.json();
        if (!cancelled && j.job) {
          setJob({ id: j.job.id, slug: j.job.slug, title: j.job.title, description: j.job.description });
          setJobStatus("ready");
        }
      } catch {
        if (!cancelled) setJobStatus((prev) => (prev === "ready" ? prev : "notfound"));
      }
    })();
    return () => { cancelled = true; };
  }, [jobSlug]);

  const showToast = (msg, isError = false) => {
    if (isError) { setErrorToast(true); setToast(msg); }
    else { setErrorToast(false); setToast(msg); }
    setTimeout(() => setToast(""), 5000);
  };

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleNiche = (n) =>
    setForm((prev) => ({
      ...prev,
      niches: prev.niches.includes(n) ? prev.niches.filter((x) => x !== n) : [...prev.niches, n],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cv) return showToast("Upload CV PDF/DOCX terlebih dahulu", true);
    if (form.cv.size > 10 * 1024 * 1024) return showToast("Ukuran CV maksimal 10MB", true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return showToast("Email tidak valid", true);
    if (form.name.trim().length < 2) return showToast("Nama minimal 2 karakter", true);
    if (!form.usia || Number(form.usia) < 17 || Number(form.usia) > 40) return showToast("Usia harus antara 17-40 tahun", true);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("jobId", job.id);
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim().toLowerCase());
      fd.append("wa", form.wa.trim());
      fd.append("tiktok", form.portofolio.trim());
      fd.append("ig", "");
      fd.append("cv", form.cv);
      fd.append("usia", form.usia.trim());
      fd.append("domisili", form.domisili.trim());
      fd.append("pendidikan", form.pendidikan);
      fd.append("pengalaman", form.pengalaman);
      fd.append("portofolio", form.portofolio.trim());
      fd.append("tema", form.tema.trim());
      fd.append("alasan", form.alasan.trim());
      form.niches.forEach((n) => fd.append("niche", n));
      const res = await submitApplication(fd);
      if (res?.error?.includes?.("duplicate")) showToast("Email sudah pernah melamar untuk lowongan ini", true);
      else if (res?.rateLimited) showToast("Terlalu banyak permintaan — coba lagi dalam beberapa menit. CV Anda tidak terkirim.", true);
      else if (res?.offline) showToast("Pendaftaran tersimpan lokal — server sedang tidak terjangkau. Tim HR menerima lamaran Anda saat server pulih.", true);
      else if (res?.error) showToast(`Gagal mengirim: ${res.error}`, true);
      else {
        showToast("🎉 Pendaftaran terkirim! Tim HR akan menghubungi Anda dalam 2-3 hari kerja.");
        setForm({ name: "", usia: "", wa: "", email: "", domisili: "", pendidikan: "", pengalaman: "", niches: [], portofolio: "", cv: null, tema: "", alasan: "" });
        document.getElementById("pc-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      showToast(String(err), true);
    } finally {
      setLoading(false);
    }
  };

  if (jobStatus === "loading") {
    return (
      <div className="pc-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "rgba(250,246,240,.5)" }}>Memuat lowongan…</p>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="pc-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ color: "#E8B85A", fontWeight: 700 }}>Lowongan tidak ditemukan</p>
        <p style={{ color: "rgba(250,246,240,.6)", fontSize: 14 }}>Tautan tidak valid atau lowongan sudah ditutup. Hubungi HR via WhatsApp untuk info lowongan terbaru.</p>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="pc-btn-wa">Hubungi via WhatsApp</a>
      </div>
    );
  }

  return (
    <div className="pc-wrap">
      {/* HERO */}
      <div className="pc-hero">
        <div className="pc-hero-bg"></div>
        <div className="pc-hero-grid"></div>
        <div className="pc-hero-orb"></div>
        <div className="pc-hero-logo">
          <div className="pc-logo-mark">
            <img src="/pc-logo.jpg" alt="Potensi Creative" className="pc-logo-img" />
            <div className="pc-logo-text">
              <span className="pc-logo-name">Potensi Creative</span>
              <span className="pc-logo-sub">Agency — Yogyakarta</span>
            </div>
          </div>
        </div>
        <div className="pc-hero-content">
          <div className="pc-badge">
            <span className="pc-badge-dot"></span>
            Rekrutmen Terbuka — {job.title}
          </div>
          <h1>
            Kami Cari
            <span className="pc-gold">Host Live Warrior</span>
            yang Tangguh &amp; Progresif
          </h1>
          <div className="pc-hero-warrior">
            <span className="pc-warrior-icon">⚔️</span>
            <div className="pc-warrior-text">
              Bukan sekadar "bisa ngomong di kamera" — kami butuh host yang <span>tahan tekanan, konsisten perform, dan lapar akan hasil.</span> Studio kami adalah arena — siap bertarung?
            </div>
          </div>
          <p className="pc-hero-sub">
            {job.description || "Bergabung dengan agensi live streaming terdepan di Yogyakarta."}{" "}
            <strong>Durasi kerja mulai 6 jam/hari</strong>, studio VVIP 3 lokasi, gaji progresif naik seiring performa — sistem kerja yang menghargai hasil nyata.
          </p>
          <div className="pc-cta-group">
            <a href="#pc-daftar" className="pc-btn-primary">⚔️ Daftar Jadi Host Warrior</a>
            <a href="#pc-kenapa" className="pc-btn-secondary">Pelajari benefit lengkap ↓</a>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="pc-btn-wa">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-9.863-9.861 9.87 9.87 0 019.867-9.867 9.87 9.87 0 019.861 9.867 9.87 9.87 0 01-9.861 9.861m-2.026-4.844l4.66-2.72-4.66-2.72z"/></svg>
              Hubungi via WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="pc-stats">
        <div className="pc-stat pc-r">
          <div className="pc-stat-num">30</div>
          <div className="pc-stat-label">Posisi Tersedia</div>
        </div>
        <div className="pc-stat pc-r pc-r1">
          <div className="pc-stat-num">3</div>
          <div className="pc-stat-label">Lokasi Studio</div>
        </div>
        <div className="pc-stat pc-r pc-r2">
          <div className="pc-stat-num">6+ Jam</div>
          <div className="pc-stat-label">Durasi/Hari</div>
        </div>
        <div className="pc-stat pc-r pc-r3">
          <div className="pc-stat-num">10 Jt+</div>
          <div className="pc-stat-label">Potensi/Bulan</div>
        </div>
      </div>

      {/* WHY */}
      <section className="pc-section pc-why" id="pc-kenapa">
        <div className="pc-eyebrow pc-r">Kenapa Potensi Creative</div>
        <div className="pc-title pc-r">Beda dari Agensi <span>Biasa</span></div>
        <p className="pc-desc pc-r">Kami tahu para host terbaik kelelahan dengan sistem yang tidak menghargai kerja keras. Di sini, performa berbicara — dan dibayar sesuai hasilnya.</p>
        <div className="pc-warrior-banner pc-r">
          <span className="pc-warrior-banner-icon">⚔️</span>
          <div className="pc-warrior-banner-text">
            <h3>Kami Butuh Host Live Warrior</h3>
            <p>Potensi Creative bukan tempat untuk yang setengah hati. Kami mencari host yang <strong>bakoh (kuat mental &amp; fisik), tangguh menghadapi tekanan siaran, dan tidak mudah menyerah</strong> ketika GMV sedang di titik berat. Jika kamu adalah tipe itu — selamat datang di arena yang tepat.</p>
          </div>
        </div>
        <div className="pc-why-grid">
          {[
            { icon: "⏱️", t: "Durasi Mulai 6 Jam/Hari", d: "Sistem durasi kerja mulai dari 6 jam per hari dengan jadwal fleksibel yang bisa disesuaikan. Produktif, bukan sekedar mengisi jam tayang." },
            { icon: "📅", t: "Jadwal Kerja Fleksibel", d: "Jadwal disusun secara fleksibel dan dikonfirmasi H-3. Anda bisa merencanakan waktu dengan baik tanpa kejutan mendadak." },
            { icon: "🏢", t: "Studio VVIP", d: "Studio modern, full AC, koneksi internet ultra-cepat, dan peralatan live terlengkap. Cukup hadir dan perform — semua fasilitas sudah siap." },
            { icon: "📈", t: "Gaji Progresif", d: "Semakin tinggi performa dan jam terbang, semakin besar penghasilan. Sistem tiering transparan, naik berdasarkan data — bukan favoritisme." },
            { icon: "💎", t: "Klien Premium Beauty", d: "Kelola live untuk brand-brand ternama — FMCG besar, skincare premium, dan merek nasional. Portofolio Anda naik kelas secara signifikan." },
            { icon: "💵", t: "Gajian Tepat Waktu", d: "Pembayaran paling lambat tanggal 5 setiap bulan. Tidak ada drama telat gajian — kepastian finansial adalah hak setiap host." },
          ].map((c) => (
            <div className="pc-why-card pc-r" key={c.t}>
              <div className="pc-why-icon">{c.icon}</div>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SALARY */}
      <section className="pc-section pc-salary" id="pc-gaji">
        <div className="pc-eyebrow pc-r">Sistem Pendapatan</div>
        <div className="pc-title pc-r">Transparansi <span>Penghasilan</span></div>
        <p className="pc-desc pc-r">Tidak ada kebijakan tersembunyi. Kami percaya host terbaik datang ketika mereka tahu persis berapa yang bisa dihasilkan.</p>
        <div className="pc-salary-grid">
          <div>
            <div className="pc-tier-card pc-r">
              <div className="pc-tier-label">Tier Pemula</div>
              <h3>Host Starter</h3>
              <ul className="pc-tier-perks">
                <li>Tarif per jam kompetitif sesuai UMR Yogyakarta</li>
                <li>Review kenaikan tier setiap 3 bulan berdasarkan performa</li>
                <li>Training &amp; bootcamp 10 hari (dibayar Rp 50.000/hari)</li>
                <li>Didampingi trainer &amp; host senior selama masa orientasi</li>
              </ul>
            </div>
            <div className="pc-tier-card pc-featured pc-r" style={{ marginTop: 18 }}>
              <div className="pc-tier-label">Tier Unggulan</div>
              <h3>Host Elite &amp; Warrior</h3>
              <ul className="pc-tier-perks">
                <li>Tarif per jam 1.5-2x lipat dari tier starter</li>
                <li>Prioritas penempatan di klien premium &amp; brand VIP</li>
                <li>Akses pelatihan eksklusif &amp; program mentoring lanjutan</li>
                <li>Potensi Take-Home Pay hingga 7-10 juta/bulan</li>
                <li>Diakui sebagai Host Warrior — benchmark standar studio</li>
              </ul>
            </div>
            <div className="pc-salary-note pc-r">
              <p>⚠️ <strong>Info Penting:</strong> Kenaikan tier ditentukan oleh disiplin HRIS, konsistensi performa, dan evaluasi rutin SPV — bukan subjektivitas. Semua tercatat transparan di sistem.</p>
            </div>
          </div>
          <div className="pc-income-visual pc-r">
            <h3>Potensi Pendapatan Bulanan</h3>
            <div className="pc-income-bars">
              {[
                { n: "Host Starter (bulan ke-1)", v: "Rp 2.5-3.5 Jt", w: 30 },
                { n: "Host Berkembang (bulan ke-3)", v: "Rp 4-5.5 Jt", w: 50 },
                { n: "Host Established (bulan ke-6+)", v: "Rp 5.5-7.5 Jt", w: 68 },
                { n: "Host Warrior / Elite", v: "Rp 7.5-10 Jt+", w: 90 },
              ].map((b) => (
                <div className="pc-income-bar" key={b.n}>
                  <div className="pc-income-bar-label">
                    <span className="pc-income-bar-name">{b.n}</span>
                    <span className="pc-income-bar-val">{b.v}</span>
                  </div>
                  <div className="pc-income-bar-track"><div className="pc-income-bar-fill" style={{ width: `${b.w}%` }}></div></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize: 11, color: "rgba(250,246,240,.38)", lineHeight: 1.7 }}>*Estimasi berdasarkan data internal. Nominal final bergantung pada jumlah jam, konsistensi performa, dan tier aktif. Gajian paling lambat tanggal 5 setiap bulan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section className="pc-section pc-schedule">
        <div className="pc-eyebrow pc-r">Pola Jadwal Kerja</div>
        <div className="pc-title pc-r">Fleksibel, <span>Terstruktur</span></div>
        <p className="pc-desc pc-r">Jadwal kerja bersifat fleksibel dan dikonfirmasi H-3 setiap minggunya. Semua jadwal disusun bersama manajemen agar optimal untuk semua pihak.</p>
        <div className="pc-schedule-grid pc-r">
          {[
            { n: "Senin", cls: "work", icon: "🎥", d: <>Shift Live<br />Min 6 Jam</> },
            { n: "Selasa", cls: "work", icon: "🎥", d: <>Shift Live<br />Min 6 Jam</> },
            { n: "Rabu", cls: "work", icon: "🎥", d: <>Shift Live<br />Min 6 Jam</> },
            { n: "Kamis", cls: "flex", icon: "⏰", d: <>Fleksibel<br />Pilih Jam</> },
            { n: "Jumat", cls: "flex", icon: "⏰", d: <>Fleksibel<br />Pilih Jam</> },
            { n: "Sabtu", cls: "flex", icon: "⏰", d: <>Fleksibel<br />Pilih Jam</> },
            { n: "Minggu", cls: "off", icon: "🌴", d: <>Libur<br />Recharge!</> },
          ].map((d) => (
            <div className={`pc-day ${d.cls}`} key={d.n}>
              <div className="pc-day-name">{d.n}</div>
              <div className="pc-day-icon">{d.icon}</div>
              <div className="pc-day-desc">{d.d}</div>
            </div>
          ))}
        </div>
        <div className="pc-schedule-note pc-r">
          ℹ️ <strong>Catatan:</strong> Pola di atas adalah gambaran umum. Jadwal aktual bersifat fleksibel dan disusun setiap minggu sesuai kesepakatan bersama tim manajemen. Durasi kerja dimulai dari 6 jam per hari per shift.
        </div>
      </section>

      {/* STUDIOS */}
      <section className="pc-section pc-studio" id="pc-studio">
        <div className="pc-eyebrow pc-r">Lokasi Studio</div>
        <div className="pc-title pc-r">Studio <span>VVIP</span> Siap Pakai</div>
        <p className="pc-desc pc-r">Semua studio dilengkapi fasilitas premium — full AC, internet fiber, dan peralatan live terlengkap. Anda cukup hadir dan perform.</p>
        <div className="pc-studio-grid">
          {[
            { t: "🏠", h: "Studio Timoho", d: "Lokasi strategis pusat kota Yogyakarta, akses mudah dari segala penjuru", loc: "📍 Timoho, Yogyakarta" },
            { t: "🏛️", h: "Studio Berbah", d: "Wilayah timur Yogyakarta, dekat kawasan kampus dan hunian padat", loc: "📍 Berbah, Sleman" },
            { t: "🏆", h: "Studio Wiyoro", d: "Studio premium terbaru dengan equipment paling mutakhir", loc: "📍 Wiyoro, Bantul" },
          ].map((s) => (
            <div className="pc-studio-card pc-r" key={s.h}>
              <div className="pc-studio-thumb">{s.t}</div>
              <div className="pc-studio-body">
                <h3>{s.h}</h3>
                <p>{s.d}</p>
                <div className="pc-studio-loc">{s.loc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="pc-studio-clause pc-r">
          ⚠️ <strong>Klausa Penempatan:</strong> Seluruh kandidat yang diterima <strong>bersedia ditempatkan di lokasi studio Agency Potensi Creative Yogyakarta</strong> (Timoho / Berbah / Wiyoro) sesuai kebutuhan operasional dan jadwal yang ditetapkan manajemen. Penempatan studio bersifat dinamis dan dapat berubah berdasarkan kebutuhan klien.
        </div>
      </section>

      {/* REQUIREMENTS */}
      <section className="pc-section pc-req" id="pc-syarat">
        <div className="pc-eyebrow pc-r">Kualifikasi</div>
        <div className="pc-title pc-r">Siapa <span>Host Warrior</span> yang Kami Cari?</div>
        <p className="pc-desc pc-r">Kami tidak hanya butuh yang "bisa ngomong di kamera" — kami butuh yang siap tempur, tahan banting, dan konsisten.</p>
        <div className="pc-req-grid">
          <div className="pc-warrior-specs pc-r" style={{ gridColumn: "1/-1" }}>
            <h3>⚔️ Spesifikasi Host Live Warrior</h3>
            <p className="pc-ws-sub">Kami membutuhkan host dengan mental baja dan stamina siaran yang nyata. Ini bukan klaim kosong — ini standar kami.</p>
            <div className="pc-ws-grid">
              {[
                { icon: "🛡️", t: "Tahan Tekanan Siaran", d: "Mampu tetap energetik dan fokus meski kondisi live sedang sepi atau GMV belum bergerak." },
                { icon: "💪", t: "Stamina Mental & Fisik", d: "Kuat menjalani shift penuh tanpa kehilangan kualitas performa — dari menit pertama hingga terakhir." },
                { icon: "🎯", t: "Berorientasi Hasil", d: "Selalu mencari cara untuk meningkatkan interaksi dan konversi — bukan menunggu instruksi." },
                { icon: "📚", t: "Lapar Belajar", d: "Aktif mempelajari teknik baru, tren produk beauty, dan strategi engagement tanpa harus disuruh." },
                { icon: "⏱️", t: "Disiplin Sistem", d: "Patuh pada aturan HRIS, absensi, dan SOP studio — karena disiplin adalah fondasi kepercayaan." },
                { icon: "🔄", t: "Adaptif & Responsif", d: "Cepat beradaptasi dengan brand baru, brief mendadak, dan perubahan jadwal tanpa drama." },
              ].map((w) => (
                <div className="pc-ws-item" key={w.t}>
                  <span className="pc-ws-item-icon">{w.icon}</span>
                  <p><strong>{w.t}</strong>{w.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pc-req-card pc-r">
            <h3>✅ Syarat Utama</h3>
            <ul className="pc-req-list">
              {["Pria atau Wanita, usia 18-30 tahun", "Berpenampilan menarik dan rapi sesuai standar grooming studio", "Domisili Yogyakarta atau bersedia ditempatkan di studio Potensi Creative Yogyakarta", "Memiliki kendaraan pribadi", "Kemampuan komunikasi, persuasi, dan product knowledge yang kuat", "Bersedia bekerja dengan sistem jadwal fleksibel rolling shift 24 jam"].map((t) => (
                <li key={t}><span className="pc-req-check">✓</span> {t}</li>
              ))}
            </ul>
          </div>
          <div className="pc-req-card pc-r pc-r1">
            <h3>⭐ Nilai Tambah (Diutamakan)</h3>
            <ul className="pc-req-list">
              {["Portofolio atau pengalaman live streaming penjualan (TikTok / Shopee Live)", "Pernah mengelola live produk beauty, skincare, atau FMCG", "Familiar teknik AIDA, hook 3 detik, manajemen dead air", "Rekam jejak GMV yang bisa diverifikasi", "Pernah siaran di akun dengan jumlah viewers tinggi"].map((t) => (
                <li key={t}><span className="pc-req-check">★</span> {t}</li>
              ))}
            </ul>
          </div>
          <div className="pc-req-card pc-r pc-r2">
            <h3>📎 Dokumen yang Disiapkan</h3>
            <ul className="pc-req-list">
              {["CV / Resume terbaru (format PDF)", "Link portofolio akun TikTok / Shopee Live", "Video perkenalan diri + demo jualan singkat (≤1 menit)", "Foto terbaru atau link profil media sosial aktif"].map((t) => (
                <li key={t}><span className="pc-req-check">✓</span> {t}</li>
              ))}
            </ul>
          </div>
          <div className="pc-req-card pc-r pc-r3">
            <h3>🚫 Tidak Cocok Jika...</h3>
            <ul className="pc-req-list">
              {["Tidak bersedia hadir fisik di studio (posisi ini WFO)", "Mudah menyerah ketika GMV sedang di titik berat", "Mencari kerja santai tanpa komitmen performa", "Tidak bersedia mengikuti sistem absensi HRIS dan SOP studio"].map((t) => (
                <li key={t}><span className="pc-req-check no">✕</span> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="pc-section pc-process">
        <div className="pc-eyebrow pc-r" style={{ textAlign: "center" }}>Alur Pendaftaran</div>
        <div className="pc-title pc-r" style={{ textAlign: "center", margin: "0 auto 52px" }}>Dari Daftar <span>Sampai Kontrak</span></div>
        <div className="pc-process-grid">
          {[
            { t: "Isi Form", d: "Lengkapi formulir di bawah dengan data diri, portofolio, dan link video perkenalan" },
            { t: "Screening HR", d: "Tim HR review portofolio dan video dalam 2-3 hari kerja" },
            { t: "Casting Studio", d: "Kandidat terpilih diundang ke studio untuk sesi casting langsung" },
            { t: "Kontrak & Onboard", d: "Tanda tangan kontrak, bootcamp 10 hari, dan langsung bertugas" },
          ].map((s, i) => (
            <div className={`pc-step pc-r pc-r${i}`} key={s.t}>
              <div className="pc-step-num">{i + 1}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section className="pc-section pc-form-sec" id="pc-daftar">
        <div className="pc-form-wrap">
          <div className="pc-form-header">
            <div className="pc-eyebrow pc-r" style={{ textAlign: "center" }}>Formulir Pendaftaran</div>
            <div className="pc-title pc-r" style={{ textAlign: "center" }}>Daftar <span>Sekarang</span></div>
            <p className="pc-desc pc-r" style={{ margin: "0 auto", textAlign: "center" }}>Isi data dengan lengkap dan jujur. Tim HR akan menghubungi via WhatsApp dalam 2-3 hari kerja.</p>
          </div>
          <div className="pc-form-card pc-r">
            <form id="pc-form" onSubmit={handleSubmit}>
              <div className="pc-form-grid">
                <div className="pc-form-group">
                  <label>Nama Lengkap *</label>
                  <input type="text" required placeholder="Nama sesuai KTP" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="pc-form-group">
                  <label>Usia *</label>
                  <input type="number" required min="17" max="40" placeholder="Contoh: 22" value={form.usia} onChange={(e) => set("usia", e.target.value)} />
                </div>
                <div className="pc-form-group">
                  <label>Nomor WhatsApp Aktif *</label>
                  <input type="tel" required placeholder="08xx-xxxx-xxxx" value={form.wa} onChange={(e) => set("wa", e.target.value)} />
                </div>
                <div className="pc-form-group">
                  <label>Email *</label>
                  <input type="email" required placeholder="nama@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="pc-form-group full">
                  <label>Domisili Saat Ini *</label>
                  <input type="text" required placeholder="Kecamatan, Kota/Kabupaten" value={form.domisili} onChange={(e) => set("domisili", e.target.value)} />
                </div>
                <div className="pc-form-clause">
                  ⚠️ <strong>Klausa Penempatan:</strong> Dengan mendaftar, kandidat menyatakan <strong>bersedia ditempatkan di lokasi studio Agency Potensi Creative Yogyakarta</strong> (Timoho / Berbah / Wiyoro) sesuai kebutuhan operasional manajemen.
                </div>
                <hr className="pc-form-divider" />
                <div className="pc-form-group full">
                  <label>Pendidikan Terakhir</label>
                  <select value={form.pendidikan} onChange={(e) => set("pendidikan", e.target.value)}>
                    <option value="" disabled>Pilih pendidikan...</option>
                    <option>SMA / SMK</option>
                    <option>D3 / D4</option>
                    <option>S1</option>
                    <option>S2</option>
                  </select>
                </div>
                <div className="pc-form-group full">
                  <label>Pengalaman Host Live Streaming *</label>
                  <select required value={form.pengalaman} onChange={(e) => set("pengalaman", e.target.value)}>
                    <option value="" disabled>Pilih pengalaman...</option>
                    <option>Belum pernah (siap belajar dari awal)</option>
                    <option>Kurang dari 6 bulan</option>
                    <option>6 bulan - 1 tahun</option>
                    <option>1-2 tahun</option>
                    <option>Lebih dari 2 tahun</option>
                  </select>
                </div>
                <div className="pc-form-group full">
                  <label>Niche / Kategori Produk yang Dikuasai *</label>
                  <div className="pc-niche-grid">
                    {NICHE_OPTIONS.map((n) => (
                      <label className={`pc-niche-item${form.niches.includes(n.value) ? " pc-niche-checked" : ""}`} key={n.value}>
                        <input type="checkbox" checked={form.niches.includes(n.value)} onChange={() => toggleNiche(n.value)} />
                        <span>{n.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pc-form-group full">
                  <label>Link Portofolio / Akun Live Streaming</label>
                  <input type="url" placeholder="https://tiktok.com/@akunanda atau link Shopee Live" value={form.portofolio} onChange={(e) => set("portofolio", e.target.value)} />
                </div>
                <div className="pc-form-group full">
                  <label>Upload CV (PDF/DOCX) *</label>
                  <label className="pc-cv-drop">
                    <Upload size={18} />
                    <span>{form.cv ? `${form.cv.name} (${Math.round(form.cv.size / 1024)} KB)` : "Pilih file CV dari perangkat Anda (PDF/DOCX, max 10MB)"}</span>
                    <input type="file" accept=".pdf,.docx,.doc" onChange={(e) => set("cv", e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                  </label>
                  <span className="pc-form-hint">CV otomatis tersimpan ke sistem HR kami dan dianalisa AI — tidak perlu upload Google Drive.</span>
                </div>
                <div className="pc-form-group full">
                  <label>Produk / Tema yang Pernah Dibawakan</label>
                  <textarea placeholder="Contoh: skincare, beauty tools, fashion wanita, produk herbal, FMCG..." value={form.tema} onChange={(e) => set("tema", e.target.value)} />
                </div>
                <div className="pc-form-group full">
                  <label>Ceritakan Kenapa Kamu Layak Jadi Host Warrior Kami</label>
                  <textarea placeholder="Tunjukkan mental warrior kamu di sini — apa yang membuat kamu berbeda dari pelamar lain?" value={form.alasan} onChange={(e) => set("alasan", e.target.value)} />
                </div>
                <div className="pc-form-submit-row">
                  <button type="submit" className="pc-btn-submit" disabled={loading}>
                    {loading ? "⏳ Mengirim Data ke Sistem..." : "⚔️ Kirim Pendaftaran — Siap Bertarung!"}
                  </button>
                  <p className="pc-form-note">Dengan mendaftar, Anda menyetujui proses seleksi yang berlaku dan klausa penempatan di atas. Seluruh data dijaga kerahasiaannya.<br /><strong>dianaraihanum@gmail.com</strong> | <strong>0831 6512 8857</strong></p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pc-footer">
        <div className="pc-footer-brand">Potensi <span>Creative</span></div>
        <div className="pc-footer-links">
          <a href="https://potensicreative.com">potensicreative.com</a>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href="https://www.instagram.com/potensicreative.id/" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
        <div className="pc-footer-copy">© 2026 Potensi Creative. Yogyakarta.</div>
      </footer>

      {/* FLOATING WA */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="pc-wa-float" title="Chat WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-9.863-9.861 9.87 9.87 0 019.867-9.867 9.87 9.87 0 019.861 9.867 9.87 9.87 0 01-9.861 9.861m-2.026-4.844l4.66-2.72-4.66-2.72z"/></svg>
        <span className="pc-wa-float-label">Hubungi Kami</span>
      </a>

      {/* TOAST */}
      {toast && (
        <div className={`pc-toast${errorToast ? " pc-toast-error" : ""} pc-show`}>{toast}</div>
      )}
    </div>
  );
};