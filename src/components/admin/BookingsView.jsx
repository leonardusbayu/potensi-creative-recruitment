import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Mail, 
  Phone, 
  ExternalLink, 
  XCircle, 
  RotateCw, 
  Download, 
  Eye, 
  Check, 
  Copy,
  AlertCircle
} from 'lucide-react';
import { formatIndonesianDate, formatMeetingTimeRange } from '../../utils/calendarUtils';

export const BookingsView = () => {
  const { bookings, cancelBooking, rescheduleBooking, showToast } = useBooking();

  const [activeFilter, setActiveFilter] = useState('upcoming'); // 'all' | 'upcoming' | 'past' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Categorize bookings
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredBookings = bookings.filter((b) => {
    // Search query filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      b.inviteeName.toLowerCase().includes(q) ||
      b.inviteeEmail.toLowerCase().includes(q) ||
      b.eventTitle.toLowerCase().includes(q) ||
      (b.notes && b.notes.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const bDate = new Date(b.date + 'T00:00:00');

    if (activeFilter === 'upcoming') {
      return b.status === 'confirmed' && bDate >= now;
    }
    if (activeFilter === 'past') {
      return b.status === 'completed' || (b.status === 'confirmed' && bDate < now);
    }
    if (activeFilter === 'cancelled') {
      return b.status === 'cancelled';
    }

    return true; // 'all'
  });

  const handleCancelClick = (b) => {
    const reason = window.prompt(`Alasan pembatalan janji temu dengan ${b.inviteeName}:`, 'Perubahan jadwal mendesak');
    if (reason !== null) {
      cancelBooking(b.id, reason);
      if (selectedBooking?.id === b.id) {
        setSelectedBooking((prev) => ({ ...prev, status: 'cancelled', cancelReason: reason }));
      }
    }
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!newDate || !newTime || !selectedBooking) return;

    rescheduleBooking(selectedBooking.id, newDate, newTime);
    setIsRescheduling(false);
    setSelectedBooking((prev) => ({
      ...prev,
      date: newDate,
      time: newTime,
      status: 'confirmed'
    }));
  };

  const handleExportCSV = () => {
    const headers = ['ID,Acara,Tanggal,Jam,Tamu,Email,Telepon,Status,CRM Stage,Link Rapat\n'];
    const rows = bookings.map(b => 
      `"${b.id}","${b.eventTitle}","${b.date}","${b.time}","${b.inviteeName}","${b.inviteeEmail}","${b.inviteePhone || '-'}","${b.status}","${b.crmStage}","${b.meetingLink || '-'}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalendarJet-Bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Data janji temu diekspor ke CSV!');
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Janji Temu & Riwayat Pertemuan
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Pantau dan kelola seluruh jadwal rapat yang masuk dari klien atau rekanan bisnis Anda.
          </p>
        </div>

        <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
          <Download size={15} />
          <span>Ekspor Data (CSV)</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)'
        }}>
          {[
            { id: 'upcoming', label: 'Mendatang' },
            { id: 'past', label: 'Riwayat Selesai' },
            { id: 'cancelled', label: 'Dibatalkan' },
            { id: 'all', label: 'Semua Janji' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className="btn btn-sm"
              style={{
                backgroundColor: activeFilter === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeFilter === tab.id ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: activeFilter === tab.id ? 700 : 500,
                boxShadow: activeFilter === tab.id ? 'var(--shadow-xs)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari nama, email, acara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.2rem', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Bookings Table / List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filteredBookings.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Tidak ada data janji temu pada kategori ini.
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Pesan baru dari tamu pada halaman booking akan otomatis muncul di sini.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Tamu / Invitee</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Jenis Acara</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Lokasi Rapat</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  let statusBadge = <span className="badge badge-primary">Terkonfirmasi</span>;
                  if (b.status === 'completed') statusBadge = <span className="badge badge-success">Selesai</span>;
                  if (b.status === 'cancelled') statusBadge = <span className="badge badge-danger">Dibatalkan</span>;

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      className="table-row-hover"
                    >
                      {/* Invitee */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.inviteeName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={12} /> {b.inviteeEmail}
                        </div>
                      </td>

                      {/* Event */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: b.color || 'var(--brand-600)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.eventTitle}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.duration} Menit</div>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatIndonesianDate(b.date)}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {formatMeetingTimeRange(b.time, b.endTime, b.timezone)}
                        </div>
                      </td>

                      {/* Location Link */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {b.meetingLink ? (
                          <a
                            href={b.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: 'var(--brand-600)',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              textDecoration: 'none'
                            }}
                          >
                            <Video size={14} />
                            <span>Buka Rapat</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {statusBadge}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          {b.inviteePhone && (
                            <a
                              href={`https://wa.me/${b.inviteePhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Halo ${b.inviteeName}, jadwal pertemuan "${b.eventTitle}" Anda pada ${formatIndonesianDate(b.date)} pukul ${b.time} WIB telah terkonfirmasi. Tautan rapat: ${b.meetingLink}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', color: '#059669', borderColor: '#a7f3d0' }}
                              title="Kirim Pesan WhatsApp"
                            >
                              <span>WA</span>
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setIsRescheduling(false);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Lihat Detail & Jawaban Formulir"
                          >
                            <Eye size={14} />
                            <span>Rincian</span>
                          </button>

                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleCancelClick(b)}
                              className="btn btn-danger-ghost btn-sm"
                              title="Batalkan Rapat"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details / Reschedule Modal */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Rincian Janji Temu
                </h3>
                <span className="badge badge-primary" style={{ marginTop: '0.25rem' }}>
                  ID: {selectedBooking.id}
                </span>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-ghost btn-sm">
                Tutup
              </button>
            </div>

            {/* Content Details */}
            {!isRescheduling ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {selectedBooking.eventTitle} ({selectedBooking.duration} Menit)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    📅 {formatIndonesianDate(selectedBooking.date)} pukul {selectedBooking.time} - {selectedBooking.endTime} WIB
                  </div>
                  {selectedBooking.meetingLink && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                      <Video size={15} style={{ color: 'var(--brand-600)' }} />
                      <a href={selectedBooking.meetingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-600)', fontWeight: 600 }}>
                        {selectedBooking.meetingLink}
                      </a>
                    </div>
                  )}
                </div>

                {/* Invitee Info */}
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Informasi Tamu
                  </h4>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div><strong>Nama:</strong> {selectedBooking.inviteeName}</div>
                    <div><strong>Email:</strong> {selectedBooking.inviteeEmail}</div>
                    <div><strong>WhatsApp / Telepon:</strong> {selectedBooking.inviteePhone || '-'}</div>
                    {selectedBooking.notes && <div><strong>Catatan:</strong> {selectedBooking.notes}</div>}
                  </div>
                </div>

                {/* Custom Answers */}
                {selectedBooking.answers && Object.keys(selectedBooking.answers).length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Jawaban Kuesioner Tamu
                    </h4>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem' }}>
                      {Object.entries(selectedBooking.answers).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: '0.4rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-default)',
                  marginTop: '0.5rem'
                }}>
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => {
                          setNewDate(selectedBooking.date);
                          setNewTime(selectedBooking.time);
                          setIsRescheduling(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <RotateCw size={14} />
                        <span>Jadwalkan Ulang</span>
                      </button>

                      <button
                        onClick={() => handleCancelClick(selectedBooking)}
                        className="btn btn-danger-ghost btn-sm"
                      >
                        <XCircle size={14} />
                        <span>Batalkan Rapat</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Reschedule Form */
              <form onSubmit={handleRescheduleSubmit}>
                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Pilih tanggal dan jam baru untuk <strong>{selectedBooking.inviteeName}</strong>:
                </div>

                <div className="form-group">
                  <label className="form-label">Tanggal Baru</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jam Mulai Baru (WIB)</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setIsRescheduling(false)} className="btn btn-secondary">
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Simpan Jadwal Baru
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
