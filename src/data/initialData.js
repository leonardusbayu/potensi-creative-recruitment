export const initialEventTypes = [
  {
    id: 'evt-1',
    title: 'Konsultasi Strategis 1-on-1',
    slug: 'konsultasi-strategis-30min',
    description: 'Sesi diskusi mendalam 1-on-1 untuk membahas strategi bisnis, arsitektur teknis, dan solusi digital yang tepat.',
    duration: 30, // in minutes
    color: '#a8201a', // Brick red
    icon: 'video',
    locationType: 'google_meet', // google_meet, zoom, phone, in_person
    locationDetails: 'Google Meet (Tautan otomatis dibuat setelah booking)',
    isActive: true,
    bufferBefore: 5,
    bufferAfter: 10,
    price: 0, // Free
    customQuestions: [
      { id: 'q1', label: 'Apa topik utama atau tantangan yang ingin Anda diskusikan?', type: 'textarea', required: true },
      { id: 'q2', label: 'Nama Perusahaan / Organisasi', type: 'text', required: false }
    ]
  },
  {
    id: 'evt-2',
    title: 'Product Demo & Discovery Call',
    slug: 'product-demo-45min',
    description: 'Tur langsung fitur platform CalendarJet dan diskusi kebutuhan tim Anda untuk integrasi otomatisasi.',
    duration: 45,
    color: '#0D9488', // Teal
    icon: 'presentation',
    locationType: 'zoom',
    locationDetails: 'Zoom Meeting Video Call',
    isActive: true,
    bufferBefore: 10,
    bufferAfter: 15,
    price: 0,
    customQuestions: [
      { id: 'q1', label: 'Berapa perkiraan jumlah anggota tim yang akan menggunakan sistem ini?', type: 'select', options: ['1-5 Orang', '6-20 Orang', '21-50 Orang', '50+ Orang'], required: true },
      { id: 'q2', label: 'Kebutuhan integrasi spesifik (misal CRM, Kalender, WhatsApp)', type: 'textarea', required: false }
    ]
  },
  {
    id: 'evt-3',
    title: 'Quick Sync & Tanya Jawab Teknis',
    slug: 'quick-sync-15min',
    description: 'Sesi kilat 15 menit untuk klarifikasi cepat, status update proyek, atau tanya jawab teknis.',
    duration: 15,
    color: '#D97706', // Amber
    icon: 'zap',
    locationType: 'google_meet',
    locationDetails: 'Google Meet',
    isActive: true,
    bufferBefore: 5,
    bufferAfter: 5,
    price: 0,
    customQuestions: [
      { id: 'q1', label: 'Poin utama yang ingin ditanyakan', type: 'text', required: true }
    ]
  },
  {
    id: 'evt-4',
    title: 'Audit & Review Arsitektur Sistem',
    slug: 'system-architecture-audit-60min',
    description: 'Analisis komprehensif struktur codebase, pipeline deployment, database schema, dan optimasi performa sistem.',
    duration: 60,
    color: '#8a1a15', // Deep brand red
    icon: 'code',
    locationType: 'google_meet',
    locationDetails: 'Google Meet dengan Screen Sharing',
    isActive: true,
    bufferBefore: 15,
    bufferAfter: 15,
    price: 0,
    customQuestions: [
      { id: 'q1', label: 'Link repositori / dokumentasi arsitektur (opsional)', type: 'text', required: false },
      { id: 'q2', label: 'Teknologi utama yang digunakan (cth: React, Node, PostgreSQL)', type: 'text', required: true }
    ]
  },
  {
    id: 'evt-potensi-interview',
    title: 'Interview Live Streamer — Potensi Creative',
    slug: 'potensi-creative-interview-30min',
    description: 'Sesi interview 30 menit untuk calon live streamer Potensi Creative (HR + kandidat). Link Meet otomatis, verifikasi via CV AI.',
    duration: 30,
    color: '#b8352e',
    icon: 'video',
    locationType: 'google_meet',
    locationDetails: 'Google Meet — link otomatis setelah booking terverifikasi',
    isActive: true,
    bufferBefore: 10,
    bufferAfter: 10,
    price: 0,
    customQuestions: [
      { id: 'q1', label: 'Handle TikTok/IG & followers', type: 'text', required: true },
      { id: 'q2', label: 'Pengalaman live sebelumnya', type: 'textarea', required: true }
    ]
  }
];

export const initialAvailability = {
  timezone: 'Asia/Jakarta',
  slotInterval: 30, // 15, 30, 45, 60 minutes
  minNoticeHours: 4, // minimum 4 hours advance notice
  maxDaysInAdvance: 60, // allow booking up to 60 days ahead
  weeklySchedule: [
    { day: 'Senin', dayIndex: 1, active: true, slots: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    { day: 'Selasa', dayIndex: 2, active: true, slots: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    { day: 'Rabu', dayIndex: 3, active: true, slots: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    { day: 'Kamis', dayIndex: 4, active: true, slots: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    { day: 'Jumat', dayIndex: 5, active: true, slots: [{ start: '09:00', end: '11:30' }, { start: '13:30', end: '16:30' }] },
    { day: 'Sabtu', dayIndex: 6, active: false, slots: [{ start: '10:00', end: '14:00' }] },
    { day: 'Minggu', dayIndex: 0, active: false, slots: [] }
  ],
  dateOverrides: [] // specific dates marked unavailable or with custom hours
};

// Generate relative dates for realistic demo bookings
const now = new Date();
const formatDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return formatDateKey(d);
};

export const initialBookings = [
  {
    id: 'bkg-101',
    eventId: 'evt-1',
    eventTitle: 'Konsultasi Strategis 1-on-1',
    duration: 30,
    color: '#a8201a',
    date: getRelativeDate(1), // Tomorrow
    time: '10:00',
    endTime: '10:30',
    timezone: 'Asia/Jakarta',
    inviteeName: 'Budi Santoso',
    inviteeEmail: 'budi.santoso@techindo.co.id',
    inviteePhone: '+6281234567890',
    meetingType: 'google_meet',
    meetingLink: 'https://meet.google.com/abc-wxyz-jet',
    status: 'confirmed', // confirmed, cancelled, completed
    crmStage: 'booked', // booked, held, follow_up, won, lost
    notes: 'Diskusi arsitektur microservices dan integrasi payment gateway.',
    answers: {
      q1: 'Integrasi arsitektur microservices dan high-concurrency event queue.',
      q2: 'PT Teknologi Digital Nusantara'
    },
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'bkg-102',
    eventId: 'evt-2',
    eventTitle: 'Product Demo & Discovery Call',
    duration: 45,
    color: '#0D9488',
    date: getRelativeDate(2), // 2 days later
    time: '14:00',
    endTime: '14:45',
    timezone: 'Asia/Jakarta',
    inviteeName: 'Siti Rahmawati',
    inviteeEmail: 'siti.rahma@globalsoft.com',
    inviteePhone: '+6281898765432',
    meetingType: 'zoom',
    meetingLink: 'https://zoom.us/j/98765432101',
    status: 'confirmed',
    crmStage: 'booked',
    notes: 'Tertarik dengan fitur custom domain dan CRM pipeline bawaan.',
    answers: {
      q1: '21-50 Orang',
      q2: 'Sinkronisasi WhatsApp API dan Google Workspace'
    },
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'bkg-103',
    eventId: 'evt-3',
    eventTitle: 'Quick Sync & Tanya Jawab Teknis',
    duration: 15,
    color: '#D97706',
    date: getRelativeDate(-1), // Yesterday (Past)
    time: '11:15',
    endTime: '11:30',
    timezone: 'Asia/Jakarta',
    inviteeName: 'Reza Pratama',
    inviteeEmail: 'reza@startupkita.id',
    inviteePhone: '+6287766554433',
    meetingType: 'google_meet',
    meetingLink: 'https://meet.google.com/xyz-quick-jet',
    status: 'completed',
    crmStage: 'held',
    notes: 'Pertemuan berjalan lancar. Klien meminta penawaran harga lisensi tim.',
    answers: {
      q1: 'Estimasi waktu rollout tim internal 15 user'
    },
    createdAt: new Date(Date.now() - 345600000).toISOString()
  },
  {
    id: 'bkg-104',
    eventId: 'evt-4',
    eventTitle: 'Audit & Review Arsitektur Sistem',
    duration: 60,
    color: '#8a1a15',
    date: getRelativeDate(-3), // 3 days ago
    time: '15:00',
    endTime: '16:00',
    timezone: 'Asia/Jakarta',
    inviteeName: 'Dewi Lestari',
    inviteeEmail: 'dewi.lestari@fintechsolusi.com',
    inviteePhone: '+6281122334455',
    meetingType: 'google_meet',
    meetingLink: 'https://meet.google.com/fin-audit-jet',
    status: 'completed',
    crmStage: 'follow_up',
    notes: 'Draf proposal implementasi sudah dikirim, menunggu persetujuan manajemen.',
    answers: {
      q1: 'https://github.com/fintechsolusi/core-api',
      q2: 'Go, PostgreSQL, Redis, Kubernetes'
    },
    createdAt: new Date(Date.now() - 518400000).toISOString()
  },
  {
    id: 'bkg-105',
    eventId: 'evt-1',
    eventTitle: 'Konsultasi Strategis 1-on-1',
    duration: 30,
    color: '#a8201a',
    date: getRelativeDate(-5),
    time: '09:30',
    endTime: '10:00',
    timezone: 'Asia/Jakarta',
    inviteeName: 'Hendro Wijaya',
    inviteeEmail: 'hendro@wijayagroup.co.id',
    inviteePhone: '+6281987654321',
    meetingType: 'google_meet',
    meetingLink: 'https://meet.google.com/hen-strat-jet',
    status: 'completed',
    crmStage: 'won',
    notes: 'Deal closed! Paket lisensi enterprise tahunan disepakati.',
    answers: {
      q1: 'Strategi otomasi reservasi pelanggan.',
      q2: 'Wijaya Holding Group'
    },
    createdAt: new Date(Date.now() - 691200000).toISOString()
  }
];

export const initialBrandSettings = {
  hostName: 'HR Potensi Creative',
  hostTitle: 'Recruitment Lead — Live Streamer Hunt',
  hostBio: 'Merekrut talenta live streaming terbaik untuk brand Potensi Creative. Posting terpadu, seleksi CV AI, interview 1-klik.',
  hostAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
  companyName: 'Potensi Creative Recruitment',
  companyLogo: '',
  brandColor: '#a8201a',
  customSlug: 'potensi-creative',
  domainCustom: 'rekrut.potensi-creative.id',
  email: 'hr@potensi-creative.id',
  phone: '+62 812-0000-1234',
  whiteLabel: true,
  theme: 'light'
};

export const initialAIHistory = [
  {
    id: 'ai-1',
    sender: 'system',
    text: 'Halo Alex! Saya adalah Asisten AI CalendarJet Anda. Saya siap membantu memeriksa ketersediaan slot kosong, membuat draf pesan follow-up, menjadwalkan ulang janji temu, atau menganalisis konversi booking Anda.',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'ai-2',
    sender: 'user',
    text: 'Carikan saya 3 slot kosong terbaik untuk besok sore untuk sesi 30 menit.',
    timestamp: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'ai-3',
    sender: 'assistant',
    text: 'Berdasarkan kalender Anda besok, berikut 3 slot kosong optimal (bebas bentrok & jeda buffer aman):\n\n1. **13:00 - 13:30 WIB** (Awal sesi siang)\n2. **15:00 - 15:30 WIB** (Jeda produktif)\n3. **16:00 - 16:30 WIB** (Sebelum jam kerja berakhir)\n\nApakah Anda ingin saya buatkan tautan booking kilat langsung untuk slot ini?',
    timestamp: new Date(Date.now() - 1700000).toISOString()
  }
];
