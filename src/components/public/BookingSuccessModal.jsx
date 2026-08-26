import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageSquare, 
  ArrowRight,
  User
} from 'lucide-react';
import { 
  formatIndonesianDate, 
  formatMeetingTimeRange, 
  downloadIcsFile, 
  generateGoogleCalendarUrl 
} from '../../utils/calendarUtils';

export const BookingSuccessModal = ({ 
  booking, 
  brandSettings, 
  onBookAnother 
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!booking) return null;

  const handleCopyLink = () => {
    if (booking.meetingLink) {
      navigator.clipboard.writeText(booking.meetingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const gcalUrl = generateGoogleCalendarUrl(booking, brandSettings.hostName);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px', padding: '2rem' }}>
        {/* Success Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Pertemuan Berhasil Dijadwalkan!
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Email konfirmasi dan undangan kalender telah dikirimkan ke <strong>{booking.inviteeEmail}</strong>.
          </p>
        </div>

        {/* Meeting Details Box */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            {booking.eventTitle}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <User size={16} style={{ color: 'var(--brand-600)' }} />
            <span>Host: <strong>{brandSettings.hostName}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <CalendarIcon size={16} style={{ color: 'var(--brand-600)' }} />
            <span>{formatIndonesianDate(booking.date)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Clock size={16} style={{ color: 'var(--brand-600)' }} />
            <span>{formatMeetingTimeRange(booking.time, booking.endTime, booking.timezone)} ({booking.duration} Menit)</span>
          </div>

          {booking.meetingLink && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.8rem',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              marginTop: '0.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <Video size={16} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {booking.meetingLink}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flexShrink: 0 }}
                title="Salin Tautan Rapat"
              >
                {copiedLink ? <Check size={14} style={{ color: 'var(--success-text)' }} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons: Add to Cal / Download */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.65rem', justifyContent: 'center' }}
          >
            <ExternalLink size={15} />
            <span>Google Calendar</span>
          </a>

          <button
            onClick={() => downloadIcsFile(booking, brandSettings.hostName)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.65rem', justifyContent: 'center' }}
          >
            <Download size={15} />
            <span>Unduh File .ICS</span>
          </button>
        </div>

        {/* WhatsApp Notification Action */}
        {booking.inviteePhone && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-lg)',
            color: '#065f46',
            fontSize: '0.825rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <strong>Pengingat WhatsApp:</strong>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{booking.inviteePhone}</div>
              </div>
            </div>
            <a
              href={`https://wa.me/${booking.inviteePhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Halo ${booking.inviteeName}, jadwal pertemuan "${booking.eventTitle}" Anda pada ${formatIndonesianDate(booking.date)} pukul ${booking.time} WIB telah terkonfirmasi. Tautan rapat: ${booking.meetingLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{ backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
            >
              <span>Kirim Pesan WA</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Bottom Done button */}
        <button
          onClick={onBookAnother}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
        >
          <span>Jadwalkan Pertemuan Lain</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
