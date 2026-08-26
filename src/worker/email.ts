export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export function buildInviteEmail(appUrl: string, token: string, applicantName: string): EmailPayload {
  const link = `${appUrl}/?token=${token}#interview`;
  return {
    to: applicantName,
    subject: "Selamat — CV Anda Lolos Verifikasi! Silakan Pilih Jadwal Interview",
    html: `<div style="font-family:system-ui;padding:24px">
      <h2>Hai ${applicantName},</h2>
      <p>CV Anda telah diverifikasi untuk posisi <b>Live Streamer</b>.</p>
      <p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Pilih Jadwal Interview</a></p>
      <p>Link berlaku 7 hari. Jika ada kendala, balas email ini.</p>
      <p>— HR Team</p>
    </div>`,
  };
}

export function buildRejectionEmail(applicantName: string, missingSkills: string[]): EmailPayload {
  return {
    to: applicantName,
    subject: "Update Lamaran Live Streamer",
    html: `<div style="font-family:system-ui;padding:24px">
      <h2>Hai ${applicantName},</h2>
      <p>Terima kasih telah melamar. Saat ini profil belum sesuai kriteria${missingSkills.length ? ` (kekurangan: ${missingSkills.join(", ")})` : ""}.</p>
      <p>Kami simpan CV Anda untuk kesempatan berikutnya.</p>
      <p>— HR Team</p>
    </div>`,
  };
}
