export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInviteEmail(appUrl: string, token: string, applicantName: string): EmailPayload {
  const safeName = escapeHtml(applicantName);
  const link = `${appUrl}/?token=${token}#interview`;
  return {
    to: safeName,
    subject: "Selamat - CV Anda Lolos Verifikasi! Silakan Pilih Jadwal Interview",
    html: `<div style="font-family:system-ui;padding:24px">
      <h2>Hai ${safeName},</h2>
      <p>CV Anda telah diverifikasi untuk posisi <b>Live Streamer</b>.</p>
      <p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Pilih Jadwal Interview</a></p>
      <p>Link berlaku 7 hari. Jika ada kendala, balas email ini.</p>
      <p>- HR Team</p>
    </div>`,
  };
}

export function buildRejectionEmail(applicantName: string, missingSkills: string[]): EmailPayload {
  const safeName = escapeHtml(applicantName);
  const safeSkills = missingSkills.map(escapeHtml).join(", ");
  return {
    to: safeName,
    subject: "Update Lamaran Live Streamer",
    html: `<div style="font-family:system-ui;padding:24px">
      <h2>Hai ${safeName},</h2>
      <p>Terima kasih telah melamar. Saat ini profil belum sesuai kriteria${missingSkills.length ? ` (kekurangan: ${safeSkills})` : ""}.</p>
      <p>Kami simpan CV Anda untuk kesempatan berikutnya.</p>
      <p>- HR Team</p>
    </div>`,
  };
}
