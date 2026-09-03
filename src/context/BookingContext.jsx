import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  initialEventTypes, 
  initialAvailability, 
  initialBookings, 
  initialBrandSettings,
  initialAIHistory
} from '../data/initialData';
import { initialJobs, initialApplicants } from '../data/hrData';
import { minutesToTime, timeToMinutes } from '../utils/calendarUtils';
import { apiFetch } from '../utils/apiStatus';

const BookingContext = createContext();

function normalizePost(p) {
  return {
    id: p.id,
    caption: p.caption ?? "",
    platforms: JSON.parse(p.platforms || "[]"),
    accountIds: JSON.parse(p.account_ids || "[]"),
    jobSlug: p.job_slug ?? "",
    media: JSON.parse(p.media || "[]"),
    scheduledAt: p.scheduled_at,
    status: p.status,
    publishedAt: p.published_at,
    error: p.error,
    postIds: JSON.parse(p.post_ids || "{}"),
  };
}

function normalizeAccount(a) {
  return {
    id: a.id,
    platform: a.platform,
    username: a.username,
    displayName: a.display_name || a.username,
    accessToken: a.access_token || "",
    pageId: a.page_id || "",
    openId: a.open_id || "",
    status: a.status,
    connectedAt: a.created_at,
  };
}

function normalizeApplicant(a) {
  return {
    id: a.id,
    job_id: a.job_id,
    name: a.name,
    email: a.email,
    wa: a.wa,
    tiktok: a.tiktok,
    ig: a.ig,
    status: a.status,
    score: a.score,
    ai_summary: a.ai_summary,
    notes: a.notes,
    psychotestScore: a.psychotest_score,
    psychotestNotes: a.psychotest_notes,
    applied_at: a.applied_at,
  };
}

export const BookingProvider = ({ children }) => {
  // 1. Event Types State
  const [eventTypes, setEventTypes] = useState(() => {
    const saved = localStorage.getItem('calendarjet_event_types');
    return saved ? JSON.parse(saved) : initialEventTypes;
  });

  // 2. Availability State
  const [availability, setAvailability] = useState(() => {
    const saved = localStorage.getItem('calendarjet_availability');
    return saved ? JSON.parse(saved) : initialAvailability;
  });

  // 3. Bookings State
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('calendarjet_bookings');
    return saved ? JSON.parse(saved) : initialBookings;
  });

  // 4. Brand & Host Settings State
  const [brandSettings, setBrandSettings] = useState(() => {
    const saved = localStorage.getItem('calendarjet_brand_settings');
    return saved ? JSON.parse(saved) : initialBrandSettings;
  });

  // 5. AI Chat History State
  const [aiMessages, setAiMessages] = useState(() => {
    const saved = localStorage.getItem('calendarjet_ai_history');
    return saved ? JSON.parse(saved) : initialAIHistory;
  });

  // 6. Navigation & View State
  const [currentView, setCurrentView] = useState('admin'); // 'admin' | 'public_booking'
  const [activeAdminTab, setActiveAdminTab] = useState(() => {
    const saved = localStorage.getItem('calendarjet_admin_tab');
    try {
      return saved ? JSON.parse(saved) : 'potensi';
    } catch {
      return saved || 'potensi';
    }
  });
  const [activePotensiSub, setActivePotensiSub] = useState('overview');
  const [selectedPublicEventId, setSelectedPublicEventId] = useState('evt-1');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('calendarjet_theme');
    return saved || 'light';
  });

  // 7. Toast notification state
  const [toasts, setToasts] = useState([]);

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem('calendarjet_jobs');
    return saved ? JSON.parse(saved) : initialJobs;
  });
  const [applicants, setApplicants] = useState(() => {
    const saved = localStorage.getItem('calendarjet_applicants');
    return saved ? JSON.parse(saved) : initialApplicants;
  });
  const [socialPosts, setSocialPosts] = useState(() => {
    const saved = localStorage.getItem('calendarjet_social_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [socialAccounts, setSocialAccounts] = useState(() => {
    const saved = localStorage.getItem('calendarjet_social_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [d1Bookings, setD1Bookings] = useState([]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('calendarjet_event_types', JSON.stringify(eventTypes));
  }, [eventTypes]);

  useEffect(() => {
    localStorage.setItem('calendarjet_availability', JSON.stringify(availability));
  }, [availability]);

  useEffect(() => {
    localStorage.setItem('calendarjet_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('calendarjet_brand_settings', JSON.stringify(brandSettings));
  }, [brandSettings]);

  useEffect(() => {
    localStorage.setItem('calendarjet_ai_history', JSON.stringify(aiMessages));
  }, [aiMessages]);

  useEffect(() => {
    localStorage.setItem('calendarjet_jobs', JSON.stringify(jobs));
  }, [jobs]);
  useEffect(() => {
    localStorage.setItem('calendarjet_applicants', JSON.stringify(applicants));
  }, [applicants]);
  useEffect(() => {
    localStorage.setItem('calendarjet_social_posts', JSON.stringify(socialPosts));
  }, [socialPosts]);
  useEffect(() => {
    localStorage.setItem('calendarjet_social_accounts', JSON.stringify(socialAccounts));
  }, [socialAccounts]);

  useEffect(() => {
    localStorage.setItem('calendarjet_admin_tab', JSON.stringify(activeAdminTab));
  }, [activeAdminTab]);

  useEffect(() => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return;
    const headers = { authorization: `Bearer ${token}` };
    (async () => {
      try {
        const [postsR, acctsR, appsR, bksR] = await Promise.all([
          fetch("/api/social/posts", { headers }),
          fetch("/api/social/accounts", { headers }),
          fetch("/api/applicants", { headers }),
          fetch("/api/bookings", { headers }),
        ]);
        if (postsR.ok) { const j = await postsR.json(); if (j.posts?.length) setSocialPosts((prev) => { const ids = new Set(prev.map((p) => p.id)); return [...j.posts.map(normalizePost).filter((p) => !ids.has(p.id)), ...prev]; }); }
        if (acctsR.ok) { const j = await acctsR.json(); if (j.accounts?.length) setSocialAccounts((prev) => { const ids = new Set(prev.map((a) => a.id)); return [...j.accounts.map(normalizeAccount).filter((a) => !ids.has(a.id)), ...prev]; }); }
        if (appsR.ok) { const j = await appsR.json(); if (j.applicants?.length) setApplicants((prev) => { const ids = new Set(prev.map((a) => a.id)); return [...j.applicants.map(normalizeApplicant).filter((a) => !ids.has(a.id)), ...prev]; }); }
        if (bksR.ok) { const j = await bksR.json(); if (j.bookings?.length) setD1Bookings(j.bookings); }

        const unsynced = applicants.filter((a) => a.pendingSync);
        for (const app of unsynced) {
          try {
            const r = await fetch("/api/apply/sync", {
              method: "POST",
              headers,
              body: JSON.stringify({ jobId: app.job_id, name: app.name, email: app.email, wa: app.wa, tiktok: app.tiktok, ig: app.ig, appliedAt: app.applied_at }),
            });
            if (r.ok) {
              const j = await r.json().catch(() => ({}));
              const newId = j.applicantId || app.id;
              setApplicants((prev) => prev.map((a) => a.id === app.id ? { ...a, id: newId, pendingSync: false } : a));
            } else if (r.status === 404) {
              setApplicants((prev) => prev.filter((a) => a.id !== app.id));
            }
          } catch {}
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('calendarjet_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toast Helper
  const [toastHistory, setToastHistory] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setToastHistory((prev) => [{ id, message, type, at: new Date().toISOString() }, ...prev].slice(0, 50));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Theme Toggle
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Event Types Handlers
  const addEventType = (newEvent) => {
    const eventWithId = {
      ...newEvent,
      id: `evt-${Date.now()}`,
      isActive: true,
      customQuestions: newEvent.customQuestions || []
    };
    setEventTypes((prev) => [eventWithId, ...prev]);
    showToast('Jenis acara baru berhasil ditambahkan!');
    return eventWithId;
  };

  const updateEventType = (id, updatedFields) => {
    setEventTypes((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, ...updatedFields } : evt))
    );
    showToast('Jenis acara berhasil diperbarui!');
  };

  const deleteEventType = (id) => {
    setEventTypes((prev) => prev.filter((evt) => evt.id !== id));
    showToast('Jenis acara telah dihapus.', 'info');
  };

  const toggleEventActive = (id) => {
    setEventTypes((prev) =>
      prev.map((evt) => {
        if (evt.id === id) {
          const nextState = !evt.isActive;
          showToast(`Acara ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`, 'info');
          return { ...evt, isActive: nextState };
        }
        return evt;
      })
    );
  };

  // Booking Actions
  const createBooking = (bookingData) => {
    const event = eventTypes.find((e) => e.id === bookingData.eventId) || eventTypes[0];
    const duration = Number(event?.duration) || 30;
    const startMins = timeToMinutes(bookingData.time);
    const endMins = startMins + duration;
    const endTime = minutesToTime(endMins);

    // Dynamic video meeting link simulation
    const meetingCode = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    const meetingLink = bookingData.meetingType === 'zoom' 
      ? `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`
      : `https://meet.google.com/${meetingCode}`;

    const newBooking = {
      id: `bkg-${Date.now()}`,
      eventId: event.id,
      eventTitle: event.title,
      duration: duration,
      color: event.color || '#a8201a',
      date: bookingData.date,
      time: bookingData.time,
      endTime: endTime,
      timezone: bookingData.timezone || availability.timezone || 'Asia/Jakarta',
      inviteeName: bookingData.inviteeName,
      inviteeEmail: bookingData.inviteeEmail,
      inviteePhone: bookingData.inviteePhone || '',
      meetingType: event.locationType || 'google_meet',
      meetingLink: meetingLink,
      status: 'confirmed',
      crmStage: 'booked',
      notes: bookingData.notes || '',
      answers: bookingData.answers || {},
      createdAt: new Date().toISOString()
    };

    setBookings((prev) => [newBooking, ...prev]);
    showToast(`Jadwal berhasil dipesan untuk ${newBooking.inviteeName}!`);

    // Async Webhook trigger if configured
    if (brandSettings.webhookUrl) {
      try {
        fetch(brandSettings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'booking.created',
            booking: newBooking,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.log('Webhook ping failed (expected if local/test url):', err));
      } catch (e) {}
    }

    return newBooking;
  };

  const cancelBooking = (id, reason = '') => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: 'cancelled', cancelReason: reason, crmStage: 'lost' }
          : b
      )
    );
    showToast('Janji temu telah dibatalkan.', 'info');
  };

  const rescheduleBooking = (id, newDate, newTime) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const duration = b.duration || 30;
          const startMins = timeToMinutes(newTime);
          const endTime = minutesToTime(startMins + duration);
          return {
            ...b,
            date: newDate,
            time: newTime,
            endTime: endTime,
            status: 'confirmed'
          };
        }
        return b;
      })
    );
    showToast('Janji temu berhasil dijadwalkan ulang!');
  };

  const updateBookingCrmStage = (id, newStage) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, crmStage: newStage } : b))
    );
    showToast(`Status prospek diubah ke "${newStage}".`);
  };

  // Availability Actions
  const updateAvailabilitySchedule = (updatedWeeklySchedule) => {
    setAvailability((prev) => ({
      ...prev,
      weeklySchedule: updatedWeeklySchedule
    }));
    showToast('Jadwal jam kerja mingguan disimpan!');
  };

  const updateAvailabilitySettings = (fields) => {
    setAvailability((prev) => ({
      ...prev,
      ...fields
    }));
    showToast('Pengaturan ketersediaan diperbarui!');
  };

  const addDateOverride = (override) => {
    setAvailability((prev) => ({
      ...prev,
      dateOverrides: [...(prev.dateOverrides || []).filter(o => o.date !== override.date), override]
    }));
    showToast(`Tanggal libur/khusus ${override.date} berhasil ditambahkan!`);
  };

  const removeDateOverride = (dateStr) => {
    setAvailability((prev) => ({
      ...prev,
      dateOverrides: (prev.dateOverrides || []).filter(o => o.date !== dateStr)
    }));
    showToast(`Pengaturan khusus tanggal ${dateStr} dihapus.`, 'info');
  };

  const createJob = async (payload) => {
    const id = `job_${Date.now()}`;
    const slug = payload.slug ?? payload.title.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36).slice(2, 6);
    const job = { id, slug, title: payload.title, description: payload.description ?? "", criteria: payload.criteria ?? {}, status: "published", created_at: new Date().toISOString() };
    try {
      const r = await apiFetch("/api/jobs", { method: "POST", headers: adminHeaders(), body: JSON.stringify(payload) });
      if (r.ok) { const j = await r.json(); job.id = j.id; job.slug = j.slug; }
    } catch {}
    setJobs((prev) => [job, ...prev]);
    return job;
  };

  const submitApplication = async (formData) => {
    try {
      const r = await fetch("/api/apply", { method: "POST", body: formData });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const app = { id: j.applicantId, job_id: String(formData.get("jobId")), name: String(formData.get("name")), email: String(formData.get("email")), wa: String(formData.get("wa")), tiktok: String(formData.get("tiktok")), ig: String(formData.get("ig")), status: "pending", score: null, ai_summary: "", applied_at: new Date().toISOString() };
        setApplicants((prev) => prev.some((x) => x.email === app.email && x.job_id === app.job_id) ? prev : [app, ...prev]);
        return j;
      }
      if (r.status === 409) {
        return { error: j.error ?? "duplicate", existingId: j.existingId };
      }
      if (r.status === 429) {
        return { error: j.error ?? "too many applications", rateLimited: true };
      }
      if (r.status >= 400) {
        const email = String(formData.get("email")).toLowerCase();
        const jobId = String(formData.get("jobId"));
        if (!applicants.some((x) => x.email.toLowerCase() === email && x.job_id === jobId)) {
          const app = { id: `app_${Date.now()}`, job_id: jobId, name: String(formData.get("name")), email, wa: String(formData.get("wa")), tiktok: String(formData.get("tiktok")), ig: String(formData.get("ig")), status: "pending", score: null, ai_summary: "", applied_at: new Date().toISOString(), pendingSync: true };
          setApplicants((prev) => [app, ...prev]);
          return { applicantId: app.id, offline: true };
        }
        return { error: j.error ?? `apply failed ${r.status}` };
      }
    } catch {}
    const email = String(formData.get("email")).toLowerCase();
    const jobId = String(formData.get("jobId"));
    if (applicants.some((x) => x.email.toLowerCase() === email && x.job_id === jobId)) {
      return { error: "duplicate application for this job" };
    }
    if (applicants.some((x) => x.rateLimited)) {
      return { error: "too many applications", rateLimited: true };
    }
    const app = { id: `app_${Date.now()}`, job_id: jobId, name: String(formData.get("name")), email, wa: String(formData.get("wa")), tiktok: String(formData.get("tiktok")), ig: String(formData.get("ig")), status: "pending", score: null, ai_summary: "", applied_at: new Date().toISOString(), pendingSync: true };
    setApplicants((prev) => [app, ...prev]);
    return { applicantId: app.id, offline: true };
  };

  const analyzeApplicant = async (applicantId) => {
    try {
      const r = await apiFetch(`/api/cv/analyze/${applicantId}`, { method: "POST", headers: adminHeaders() });
      if (r.ok) {
        const j = await r.json();
        setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "analyzed", score: j.analysis.score.overall, ai_summary: j.analysis.aiSummary } : a));
        showToast(`AI score: ${j.analysis.score.overall} - HR tentukan undang/tolak`, "info");
        return j.analysis;
      }
    } catch {}
    const a = applicants.find((x) => x.id === applicantId);
    if (!a) return;
    const cvText = a.name + " " + a.tiktok + " " + a.ig;
    let liveExp = /live|host|mc/i.test(cvText) ? 25 : 10;
    let bonus = /10k/i.test(a.tiktok + a.ig) ? 15 : /1k/i.test(a.tiktok + a.ig) ? 7 : 0;
    const overall = Math.min(100, liveExp + 15 + 12 + bonus);
    setApplicants((prev) => prev.map((x) => x.id === applicantId ? { ...x, status: "analyzed", score: overall, ai_summary: `[ESTIMASI LOKAL - bukan LLM] Skor ${overall} (bonus ${bonus}). Server tidak terjangkau; jalankan Analisis ulang saat online.` } : x));
    showToast(`Skor lokal ${overall} (bukan LLM) - jalankan Analisis ulang saat online`, "warning");
  };

  const d1BookingsNormalized = d1Bookings.map((b) => ({
    id: b.id,
    eventId: b.event_id || "evt-potensi-interview",
    eventTitle: b.event_title || "Interview Live Streamer",
    date: b.date,
    time: b.time,
    endTime: b.end_time,
    timezone: b.timezone || "Asia/Jakarta",
    inviteeName: b.invitee_name || "",
    inviteeEmail: b.invitee_email || "",
    inviteePhone: "",
    meetingType: b.meeting_type || "google_meet",
    meetingLink: b.meeting_link || "",
    status: b.status || "confirmed",
    crmStage: "booked",
    notes: "",
    answers: {},
    createdAt: b.created_at,
    source: "d1",
  }));

  const allBookings = [...d1BookingsNormalized, ...bookings];

  const adminHeaders = () => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    return token ? { "content-type": "application/json", authorization: `Bearer ${token}` } : { "content-type": "application/json" };
  };

  const inviteToInterview = async (applicantId) => {
    let sent = false;
    try {
      const r = await apiFetch(`/api/email/invite/${applicantId}`, { method: "POST", headers: adminHeaders() });
      const j = await r.json().catch(() => ({}));
      sent = !!j.sent;
    } catch {}
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "invited" } : a));
    showToast(sent ? "Email undangan interview terkirim ke pelamar" : "Pelamar diundang (email belum terkirim - cek RESEND_API_KEY)", sent ? "success" : "info");
    return sent;
  };

  const rejectApplication = async (applicantId) => {
    let sent = false;
    try {
      const r = await apiFetch(`/api/email/reject/${applicantId}`, { method: "POST", headers: adminHeaders() });
      const j = await r.json().catch(() => ({}));
      sent = !!j.sent;
    } catch {}
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "rejected" } : a));
    showToast(sent ? "Email penolakan terkirim" : "Lamaran ditolak (email belum terkirim - cek RESEND_API_KEY)", sent ? "success" : "info");
  };

  const markApplicantBooked = (applicantId) => {
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "booked", bookedAt: new Date().toISOString() } : a));
  };

  const addD1Booking = (booking) => {
    setD1Bookings((prev) => [booking, ...prev]);
  };

  const markApplicantInterviewed = (applicantId) => {
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "interviewed", interviewedAt: new Date().toISOString() } : a));
    try { apiFetch(`/api/applicants/${applicantId}/status`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ status: "interviewed" }) }); } catch {}
  };

  const moveApplicantStatus = async (applicantId, newStatus) => {
    setApplicants((prev) => prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a)));
    try { apiFetch(`/api/applicants/${applicantId}/status`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ status: newStatus }) }); } catch {}
    if (newStatus === "invited") await inviteToInterview(applicantId);
    if (newStatus === "test_sent") await sendPsychotest(applicantId);
    if (newStatus === "hired") await hireApplicant(applicantId);
    if (newStatus === "rejected") await rejectApplication(applicantId);
  };

  const hireApplicant = async (applicantId) => {
    let sent = false;
    try {
      const r = await apiFetch(`/api/email/offer/${applicantId}`, { method: "POST", headers: adminHeaders() });
      const j = await r.json().catch(() => ({}));
      sent = !!j.sent;
    } catch {}
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "hired", hiredAt: new Date().toISOString() } : a));
    showToast(sent ? "Offer email terkirim - kandidat diterima" : "Kandidat ditandai hired (offer email belum terkirim)", sent ? "success" : "info");
  };

  const sendPsychotest = async (applicantId) => {
    let sent = false;
    try {
      const r = await apiFetch(`/api/psychotest/send/${applicantId}`, { method: "POST", headers: adminHeaders() });
      const j = await r.json().catch(() => ({}));
      sent = !!j.sent;
    } catch {}
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "test_sent", psychotestSentAt: new Date().toISOString() } : a));
    showToast(sent ? "Email psikotes terkirim" : "Psikotes ditandai terkirim (email belum terkirim - cek RESEND_API_KEY / URL)", sent ? "success" : "info");
  };

  const recordPsychotestResult = async (applicantId, score, notes) => {
    try {
      await apiFetch(`/api/psychotest/result/${applicantId}`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ score, notes }) });
    } catch {}
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, status: "tested", psychotestScore: score, psychotestNotes: notes } : a));
    showToast("Hasil psikotes dicatat", "success");
  };

  const saveApplicantNotes = async (applicantId, notes) => {
    setApplicants((prev) => prev.map((a) => a.id === applicantId ? { ...a, notes } : a));
    try { await apiFetch(`/api/applicants/${applicantId}/notes`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ notes }) }); } catch {}
  };

  const getWhatsAppLink = async (applicantId) => {
    try {
      const r = await fetch(`/api/wa/${applicantId}`, { headers: adminHeaders() });
      if (r.ok) { const j = await r.json(); return j.link; }
    } catch {}
    return null;
  };

  const updateJob = async (jobId, fields) => {
    try { await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(fields) }); } catch {}
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...fields } : j)));
  };

  const saveTemplate = async (type, subject, body) => {
    try { await apiFetch(`/api/templates/${type}`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ subject, body }) }); } catch {}
    showToast("Template email disimpan", "success");
  };

  const saveSetting = async (key, value) => {
    try {
      const r = await apiFetch("/api/settings", { method: "POST", headers: adminHeaders(), body: JSON.stringify({ key, value }) });
      return r.ok;
    } catch { return false; }
  };

  const schedulePost = async (payload) => {
    const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const post = {
      id,
      caption: payload.caption ?? "",
      platforms: payload.platforms ?? ["tiktok", "instagram"],
      accountIds: payload.accountIds ?? [],
      jobSlug: payload.jobSlug ?? jobs[0]?.slug ?? "",
      media: payload.media ?? [],
      scheduledAt: payload.scheduledAt ?? new Date().toISOString(),
      status: "scheduled",
      publishedAt: null,
      error: null,
    };
    let viaPostiz = false;
    const hasAdmin = !!localStorage.getItem("calendarjet_admin_token");
    if (!hasAdmin) {
      showToast("Post disimpan lokal - set Admin Token dulu agar tersimpan di server & auto-publish", "warning");
    }
    try {
      const r = await fetch("/api/social/posts", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ caption: post.caption, platforms: post.platforms, accountIds: post.accountIds, scheduledAt: post.scheduledAt, media: post.media, jobSlug: post.jobSlug }),
      });
      viaPostiz = r.ok;
      if (r.ok) {
        const j = await r.json();
        post.id = j.id || post.id;
      } else if (r.status === 401) {
        showToast("Admin Token salah/tidak terdaftar - post hanya lokal", "error");
      }
    } catch {}
    if (viaPostiz) post.status = "queued_postiz";
    setSocialPosts((prev) => [post, ...prev]);
    return { ...post, viaPostiz };
  };

  const cancelPost = (id) => {
    setSocialPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)));
    try { fetch(`/api/social/posts/${id}/cancel`, { method: "POST", headers: adminHeaders() }); } catch {}
    showToast("Post dibatalkan", "info");
  };

  const refreshPosts = async () => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return false;
    try {
      const r = await fetch("/api/social/posts", { headers: { authorization: `Bearer ${token}` } });
      if (r.ok) {
        const j = await r.json();
        if (j.posts?.length) setSocialPosts(j.posts.map(normalizePost));
        return true;
      }
    } catch {}
    return false;
  };

  const refreshAll = async () => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return false;
    try {
      const headers = { authorization: `Bearer ${token}` };
      const [postsR, appsR, bksR] = await Promise.all([
        fetch("/api/social/posts", { headers }),
        fetch("/api/applicants", { headers }),
        fetch("/api/bookings", { headers }),
      ]);
      let ok = false;
      if (postsR.ok) { const j = await postsR.json(); if (j.posts) { setSocialPosts(j.posts.map(normalizePost)); ok = true; } }
      if (appsR.ok) { const j = await appsR.json(); if (j.applicants) { setApplicants(j.applicants.map(normalizeApplicant)); ok = true; } }
      if (bksR.ok) { const j = await bksR.json(); if (j.bookings) { setD1Bookings(j.bookings); ok = true; } }
      return ok;
    } catch { return false; }
  };

  const repostNow = async (id) => {
    setSocialPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "publishing" } : p)));
    try {
      const r = await fetch(`/api/social/posts/${id}/publish`, { method: "POST", headers: adminHeaders() });
      const j = await r.json();
      if (j.ok) {
        setSocialPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "published", publishedAt: new Date().toISOString(), postIds: j.postIds || {} } : p)));
        showToast("Post dipublikasikan sekarang", "success");
      } else {
        setSocialPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: j.error } : p)));
        showToast(`Gagal publish: ${j.error || "unknown"}`, "error");
      }
    } catch {
      setSocialPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: "network error" } : p)));
      showToast("Gagal publish - cek koneksi", "error");
    }
  };

  const addSocialAccount = async (account) => {
    const acc = {
      id: `acct_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      platform: account.platform,
      username: account.username,
      displayName: account.displayName || account.username,
      accessToken: account.accessToken || "",
      pageId: account.pageId || "",
      openId: account.openId || "",
      connectedAt: new Date().toISOString(),
      status: account.accessToken ? "connected" : "manual",
    };
    setSocialAccounts((prev) => [...prev, acc]);
    try {
      const r = await apiFetch("/api/social/accounts", { method: "POST", headers: adminHeaders(),
        body: JSON.stringify({ platform: acc.platform, username: acc.username, displayName: acc.displayName, accessToken: acc.accessToken, pageId: acc.pageId, openId: acc.openId }),
      });
      if (r.ok) { const j = await r.json(); acc.id = j.id; }
    } catch {}
    showToast(`Akun ${account.platform} ${account.username} ditambahkan`, "success");
    return acc;
  };

  const removeSocialAccount = (id) => {
    setSocialAccounts((prev) => prev.filter((a) => a.id !== id));
    try { fetch(`/api/social/accounts/${id}`, { method: "DELETE", headers: adminHeaders() }); } catch {}
    showToast("Akun sosial media dihapus", "info");
  };

  // AI Chat Assistant
  const sendAIMessage = (promptText) => {
    const userMsg = {
      id: `ai-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toISOString()
    };

    setAiMessages((prev) => [...prev, userMsg]);

    // Simulated Smart CalendarJet AI Responses based on prompt keywords
    setTimeout(() => {
      let reply = '';
      const lower = promptText.toLowerCase();

      if (lower.includes('slot') || lower.includes('jadwal') || lower.includes('kosong') || lower.includes('besok')) {
        const upcomingEvent = eventTypes[0];
                reply = `Berdasarkan kalender kerja Anda untuk minggu ini, berikut analisis ketersediaan terbaik:\n\n` +
          `- **Besok Pagi (10:00 - 11:30 WIB)**: 3 slot kosong tersedia.\n` +
          `- **Besok Siang (14:30 - 16:30 WIB)**: 4 slot bebas bentrok untuk ${upcomingEvent.title}.\n\n` +
          `Tips AI: Anda memiliki 1 booking besok di jam 10:00. Saya menyarankan slot jam **14:00 WIB** sebagai prioritas tamu berikutnya.`;
      } else if (lower.includes('follow up') || lower.includes('email') || lower.includes('draf') || lower.includes('pesan')) {
        reply = `Berikut draf email tindak lanjut (Follow-up) profesional yang siap dikirim:\n\n` +
          `---\n` +
          `**Subject:** Terima kasih atas sesi diskusi - Rangkuman & Langkah Selanjutnya\n\n` +
          `Halo [Nama Tamu],\n\n` +
          `Terima kasih banyak telah meluangkan waktu berdiskusi dalam sesi kita hari ini. Senang sekali dapat bertukar pandangan mengenai kebutuhan arsitektur dan sistem bisnis Anda.\n\n` +
          `Sesuai pembahasan kita, saya lampirkan ringkasan solusi serta tautan kalender jika Anda ingin mengatur sesi diskusi lanjutan: https://${brandSettings.domainCustom || 'jadwal.alexpratama.id'}\n\n` +
          `Salam hangat,\n${brandSettings.hostName}\n${brandSettings.companyName}\n---`;
      } else if (lower.includes('analisis') || lower.includes('statistik') || lower.includes('konversi')) {
        const total = bookings.length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const won = bookings.filter(b => b.crmStage === 'won').length;
        reply = `Laporan Performa Kalender & CRM:\n\n` +
          `- Total Booking Masuk: **${total} Pertemuan**\n` +
          `- Pertemuan Terjadwal Aktif: **${confirmed} Janji Temu**\n` +
          `- Deals Won / Selesai: **${won} Klien** (Tingkat Konversi: **${Math.round((won/Math.max(total, 1))*100)}%**)\n\n` +
          `Tren menunjukkan jenis acara **"${eventTypes[0]?.title || 'Konsultasi'}"** adalah yang paling diminati.`;
      } else {
        reply = `Saya mengerti permintaan Anda: "${promptText}". Saya dapat membantu Anda mengatur otomatisasi jadwal, memeriksa konflik antrean, membuat draf komunikasi tamu, atau mengoptimalkan konfigurasi slot kalender. Silakan tanyakan hal spesifik!`;
      }

      const botMsg = {
        id: `ai-${Date.now() + 1}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toISOString()
      };

      setAiMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const clearAIHistory = () => {
    setAiMessages([initialAIHistory[0]]);
    showToast('Riwayat AI dibersihkan.', 'info');
  };

  // Reset to Demo Data
  const resetToDemoData = () => {
    setEventTypes(initialEventTypes);
    setAvailability(initialAvailability);
    setBookings(initialBookings);
    setBrandSettings(initialBrandSettings);
    setAiMessages(initialAIHistory);
    showToast('Data demo berhasil dipulihkan!');
  };

  return (
    <BookingContext.Provider
      value={{
        // State
        eventTypes,
        availability,
        bookings,
        allBookings,
        d1Bookings,
        brandSettings,
        aiMessages,
        currentView,
        activeAdminTab,
        activePotensiSub,
        setActivePotensiSub,
        selectedPublicEventId,
        theme,
        toasts,
        toastHistory,

        // Setters & Actions
        setCurrentView,
        setActiveAdminTab,
        setSelectedPublicEventId,
        setBrandSettings,
        toggleTheme,
        showToast,
        removeToast,

        // CRUD Event Types
        addEventType,
        updateEventType,
        deleteEventType,
        toggleEventActive,

        // Bookings
        createBooking,
        cancelBooking,
        rescheduleBooking,
        updateBookingCrmStage,

        // Availability
        updateAvailabilitySchedule,
        updateAvailabilitySettings,
        addDateOverride,
        removeDateOverride,

        jobs,
        applicants,
        socialPosts,
        socialAccounts,
        createJob,
        submitApplication,
        analyzeApplicant,
        inviteToInterview,
        rejectApplication,
        markApplicantBooked,
        markApplicantInterviewed,
        moveApplicantStatus,
        hireApplicant,
        sendPsychotest,
        recordPsychotestResult,
        saveApplicantNotes,
        getWhatsAppLink,
        updateJob,
        saveTemplate,
        saveSetting,
        addD1Booking,
        schedulePost,
        cancelPost,
        refreshPosts,
        refreshAll,
        repostNow,
        addSocialAccount,
        removeSocialAccount,

        sendAIMessage,
        clearAIHistory,

        // Reset
        resetToDemoData
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
