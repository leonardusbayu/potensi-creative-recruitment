import { analyzeCvText, type AnalyzerResult, type Criteria } from "./cvAnalyzer";

const DEFAULT_MODEL = "deepseek/deepseek-chat";

export type LlmOptions = {
  apiKey?: string;
  model?: string;
  cvText: string;
  criteria: Criteria;
  tiktok?: string;
  ig?: string;
};

function parseLlmJson(text: string): any | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampScore(v: number, max: number): number {
  if (typeof v !== "number" || isNaN(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v)));
}

export async function analyzeWithLlm(opts: LlmOptions): Promise<AnalyzerResult | null> {
  if (!opts.apiKey) return null;
  const model = opts.model || DEFAULT_MODEL;
  const criteria = opts.criteria ?? {};
  const cvText = opts.cvText.slice(0, 20000);

  const system = `You are an expert HR recruiter for a Live Streamer position at Potensi Creative.
Analyze the candidate's CV and return STRICT JSON (no markdown) with this exact shape:
{
  "parsed": { "name": string, "email": string, "skills": string[], "experiences": string[] },
  "score": { "liveExp": number(0-40), "komunikasi": number(0-25), "availability": number(0-20), "followersBonus": number(0-15), "overall": number(0-100) },
  "missingSkills": string[],
  "strengths": string[],
  "decision": "verified" | "review" | "rejected",
  "aiSummary": string
}
Scoring rubric:
- liveExp (0-40): live streaming / hosting / MC / presenter experience, TikTok/Shopee/IG live
- komunikasi (0-25): communication, public speaking, confidence, language skills
- availability (0-20): matches evening/night shift 19:00-23:00 WIB, flexibility
- followersBonus (0-15): TikTok/IG followers >=10k = 15, 1k-10k = 7, else 0 (BONUS, never penalize)
- overall = liveExp + komunikasi + availability + followersBonus (max 100)
- decision: overall >= 75 = verified, 60-74 = review, < 60 = rejected
Job criteria: ${JSON.stringify(criteria)}
Candidate handles: TikTok=${opts.tiktok || "none"}, IG=${opts.ig || "none"}`;

  const user = `CV text:\n${cvText}`;

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = parseLlmJson(content);
    if (!parsed) return null;

    const score = parsed.score || {};
    const liveExp = clampScore(score.liveExp, 40);
    const komunikasi = clampScore(score.komunikasi, 25);
    const availability = clampScore(score.availability, 20);
    const followersBonus = clampScore(score.followersBonus, 15);
    const overall = clampScore(score.overall ?? (liveExp + komunikasi + availability + followersBonus), 100);

    let decision: AnalyzerResult["decision"] = "rejected";
    if (overall >= 75) decision = "verified";
    else if (overall >= 60) decision = "review";

    return {
      parsed: {
        name: parsed.parsed?.name || "Unknown",
        email: parsed.parsed?.email || "unknown@example.com",
        skills: Array.isArray(parsed.parsed?.skills) ? parsed.parsed.skills : [],
        experiences: Array.isArray(parsed.parsed?.experiences) ? parsed.parsed.experiences : [],
        cvText: cvText.slice(0, 2000),
      },
      score: { liveExp, komunikasi, availability, followersBonus, overall },
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      decision,
      aiSummary: parsed.aiSummary || `Skor ${overall} — ${decision}`,
    };
  } catch {
    return null;
  }
}

export function analyzeWithFallback(cvText: string, opts: { criteria: Criteria; tiktok?: string; ig?: string }): AnalyzerResult {
  return analyzeCvText(cvText, opts);
}
