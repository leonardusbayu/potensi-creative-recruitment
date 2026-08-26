export const initialJobs = [
  {
    id: "job_live_2026",
    slug: "live-streamer-tiktok-2026",
    title: "Live Streamer TikTok / Instagram",
    description: "Host live shopping & entertainment, jam 19:00-23:00 WIB, percaya diri di kamera.",
    criteria: {
      minAge: 18,
      maxAge: 28,
      requiresLiveExp: false,
      skills: ["hosting", "komunikasi", "live streaming", "percaya diri"],
      workHours: { start: "19:00", end: "23:00" },
    },
    status: "published",
    created_at: new Date().toISOString(),
  },
];

export const initialApplicants = [];

export const initialCvAnalyses = [];
