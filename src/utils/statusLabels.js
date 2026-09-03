export const STATUS_LABELS_ID = {
  pending: "Lamaran Masuk",
  analyzed: "CV Dianalisis",
  invited: "Diundang Interview",
  booked: "Jadwal Terkunci",
  interviewed: "Diwawancara",
  test_sent: "Psikotes Terkirim",
  tested: "Psikotes Selesai",
  hired: "Diterima",
  rejected: "Ditolak",
};

export function statusLabelId(status) {
  return STATUS_LABELS_ID[status] || status;
}