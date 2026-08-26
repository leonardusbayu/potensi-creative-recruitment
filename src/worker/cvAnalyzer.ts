export type Criteria = {
  minAge?: number;
  maxAge?: number;
  requiresLiveExp?: boolean;
  skills?: string[];
  workHours?: { start: string; end: string };
};

export type ScoreBreakdown = {
  liveExp: number;
  komunikasi: number;
  availability: number;
  followersBonus: number;
  overall: number;
};

export type AnalyzerResult = {
  parsed: {
    name: string;
    email: string;
    skills: string[];
    experiences: string[];
    cvText: string;
  };
  score: ScoreBreakdown;
  missingSkills: string[];
  strengths: string[];
  decision: "verified" | "rejected" | "review";
  aiSummary: string;
};

function followersBonus(tiktok?: string, ig?: string, hint?: string): number {
  const text = `${tiktok ?? ""} ${ig ?? ""} ${hint ?? ""}`.toLowerCase();
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*k/i);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    if (v >= 10) return 15;
    if (v >= 1) return 7;
  }
  if (text.includes("10k") || text.includes("10.000")) return 15;
  if (text.includes("1k")) return 7;
  return 0;
}

function scoreLiveExp(cvText: string, criteria: Criteria): number {
  const t = cvText.toLowerCase();
  let s = 0;
  if (/(live|host|mc|presenter|streamer|siaran langsung|hosting)/i.test(t)) s += 20;
  if (/(pengalaman.*live|live.*\d+\s*(bulan|tahun|month|year))/i.test(t)) s += 15;
  if (/(tiktok live|shopee live|instagram live)/i.test(t)) s += 5;
  return Math.min(40, s);
}

function scoreKomunikasi(cvText: string): number {
  const t = cvText.toLowerCase();
  let s = 10;
  if (/(komunikasi|communication|public speaking|percaya diri|confident|presentasi)/i.test(t)) s += 10;
  if (/(bahasa.*inggris|english|bilingual)/i.test(t)) s += 5;
  return Math.min(25, s);
}

function scoreAvailability(cvText: string, criteria: Criteria): number {
  const t = cvText.toLowerCase();
  if (/(19:00|malam|evening|night shift|fleksibel|flexible)/i.test(t)) return 20;
  if (/(shift|available|tersedia)/i.test(t)) return 15;
  return 12;
}

export function analyzeCvText(cvText: string, opts: { criteria: Criteria; tiktok?: string; ig?: string }): AnalyzerResult {
  const criteria = opts.criteria ?? {};
  const liveExp = scoreLiveExp(cvText, criteria);
  const komunikasi = scoreKomunikasi(cvText);
  const availability = scoreAvailability(cvText, criteria);
  const bonus = followersBonus(opts.tiktok, opts.ig, cvText);
  const overall = Math.min(100, liveExp + komunikasi + availability + bonus);

  let decision: AnalyzerResult["decision"] = "rejected";
  if (overall >= 75) decision = "verified";
  else if (overall >= 60) decision = "review";

  const skills = criteria.skills ?? ["hosting", "komunikasi", "live streaming"];
  const missingSkills: string[] = [];
  for (const sk of skills) {
    if (!cvText.toLowerCase().includes(sk.toLowerCase())) missingSkills.push(sk);
  }

  const strengths: string[] = [];
  if (liveExp >= 20) strengths.push("Pengalaman live/hosting terdeteksi");
  if (komunikasi >= 15) strengths.push("Komunikasi & percaya diri baik");
  if (bonus > 0) strengths.push(`Followers bonus +${bonus}`);

  const aiSummary = `Skor ${overall} (Live ${liveExp}/40, Komunikasi ${komunikasi}/25, Availability ${availability}/20, Bonus ${bonus}/15) → ${decision}. ${strengths.join("; ")}`;

  return {
    parsed: {
      name: "Unknown",
      email: "unknown@example.com",
      skills: [...new Set(cvText.toLowerCase().match(/[a-z]+/g)?.slice(0, 20) ?? [])],
      experiences: cvText.split("\n").slice(0, 3),
      cvText: cvText.slice(0, 2000),
    },
    score: { liveExp, komunikasi, availability, followersBonus: bonus, overall },
    missingSkills,
    strengths,
    decision,
    aiSummary,
  };
}
