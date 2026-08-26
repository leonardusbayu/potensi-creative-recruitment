-- CalendarJet HR — D1 Schema
-- Run: npx wrangler d1 execute calendarjet_hr --file=./schema.sql --local

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS social_posts;
DROP TABLE IF EXISTS social_accounts;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS cv_analyses;
DROP TABLE IF EXISTS applicants;
DROP TABLE IF EXISTS jobs;

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  criteria TEXT, -- JSON: {minAge,maxAge, requiresLiveExp, skills[], workHours}
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | published | closed
  created_at TEXT NOT NULL
);

CREATE TABLE applicants (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  wa TEXT,
  tiktok TEXT,
  ig TEXT,
  cv_r2_key TEXT,
  cv_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  ai_summary TEXT,
  applied_at TEXT NOT NULL,
  UNIQUE(job_id, email)
);

CREATE TABLE cv_analyses (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicants(id),
  parsed TEXT, -- JSON
  score TEXT,  -- JSON {overall, liveExp, komunikasi, availability, followersBonus, breakdown}
  missing_skills TEXT, -- JSON array
  strengths TEXT, -- JSON array
  decision TEXT, -- verified | rejected | review
  model TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  applicant_id TEXT REFERENCES applicants(id),
  type TEXT NOT NULL, -- invite | rejection | hr_notif | interview_confirm
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed | bounced
  sent_at TEXT
);

CREATE INDEX idx_applicants_job ON applicants(job_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_cv_applicant ON cv_analyses(applicant_id);
CREATE INDEX idx_email_applicant ON email_logs(applicant_id);

CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT,
  page_id TEXT,
  open_id TEXT,
  status TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);

CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  caption TEXT NOT NULL,
  platforms TEXT NOT NULL, -- JSON array
  account_ids TEXT NOT NULL, -- JSON array
  job_slug TEXT,
  media TEXT NOT NULL, -- JSON array
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  published_at TEXT,
  error TEXT,
  post_ids TEXT, -- JSON map platform->postId
  created_at TEXT NOT NULL
);
CREATE INDEX idx_social_status ON social_posts(status);
CREATE INDEX idx_social_scheduled ON social_posts(scheduled_at);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  applicant_id TEXT REFERENCES applicants(id),
  job_id TEXT REFERENCES jobs(id),
  event_id TEXT,
  event_title TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  timezone TEXT,
  invitee_name TEXT,
  invitee_email TEXT,
  meeting_type TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  crm_stage TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_bookings_applicant ON bookings(applicant_id);
CREATE INDEX idx_bookings_date ON bookings(date);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  type TEXT UNIQUE NOT NULL, -- invite | reject | offer
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE applicants ADD COLUMN notes TEXT;
ALTER TABLE applicants ADD COLUMN hired_at TEXT;
ALTER TABLE applicants ADD COLUMN psychotest_sent_at TEXT;
ALTER TABLE applicants ADD COLUMN psychotest_score INTEGER;
ALTER TABLE applicants ADD COLUMN psychotest_notes TEXT;
ALTER TABLE applicants ADD COLUMN psychotest_link TEXT;
