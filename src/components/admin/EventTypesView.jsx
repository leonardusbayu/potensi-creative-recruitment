import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { EventModal } from './EventModal';
import { 
  Plus, 
  Clock, 
  Video, 
  Copy, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Check, 
  Layers, 
  HelpCircle,
  Share2,
  Calendar
} from 'lucide-react';

export const EventTypesView = ({ onOpenShareModal }) => {
  const { 
    eventTypes, 
    addEventType, 
    updateEventType, 
    deleteEventType, 
    toggleEventActive,
    setSelectedPublicEventId,
    setCurrentView,
    brandSettings,
    showToast 
  } = useBooking();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleOpenCreate = () => {
    setEventToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setEventToEdit(evt);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (data) => {
    if (eventToEdit) {
      updateEventType(eventToEdit.id, data);
    } else {
      addEventType(data);
    }
  };

  const handleCopyLink = (evt) => {
    const domain = brandSettings.domainCustom || 'calendarjet.me';
    const url = `https://${domain}/${evt.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(evt.id);
    showToast(`Tautan booking untuk "${evt.title}" disalin!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePreviewPublic = (evtId) => {
    setSelectedPublicEventId(evtId);
    setCurrentView('public_booking');
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* View Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Jenis Acara & Layanan Rapat
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Konfigurasikan jenis pertemuan, durasi, media video call, dan formulir pendaftaran tamu.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={16} />
            <span>Buat Jenis Acara</span>
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.25rem'
      }}>
        {eventTypes.map((evt) => {
          const isCopied = copiedId === evt.id;

          return (
            <div
              key={evt.id}
              className="card card-hover"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                opacity: evt.isActive ? 1 : 0.65,
                borderTop: `4px solid ${evt.color || 'var(--brand-600)'}`,
                position: 'relative'
              }}
            >
              {/* Top Row: Active switch & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span className={`badge ${evt.isActive ? 'badge-primary' : 'badge-neutral'}`}>
                  {evt.isActive ? 'Aktif Siap Dipesan' : 'Nonaktif'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    onClick={() => toggleEventActive(evt.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    title={evt.isActive ? 'Nonaktifkan Acara' : 'Aktifkan Acara'}
                  >
                    {evt.isActive ? 'Matikan' : 'Nyalakan'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(evt)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px' }}
                    title="Edit Acara"
                  >
                    <Edit size={15} />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Hapus jenis acara "${evt.title}"?`)) {
                        deleteEventType(evt.id);
                      }
                    }}
                    className="btn btn-danger-ghost btn-sm"
                    style={{ padding: '6px' }}
                    title="Hapus Acara"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div style={{ marginBottom: '1rem', flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {evt.title}
                </h3>
                <p style={{
                  fontSize: '0.825rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {evt.description || 'Tidak ada deskripsi rincian.'}
                </p>
              </div>

              {/* Badges / Specs */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <Clock size={14} style={{ color: 'var(--brand-600)' }} />
                  <span>{evt.duration} Menit</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <Video size={14} style={{ color: 'var(--brand-600)' }} />
                  <span>{evt.locationType === 'zoom' ? 'Zoom' : 'Google Meet'}</span>
                </div>

                {evt.bufferAfter > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    <span>Buffer {evt.bufferAfter}m</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div style={{
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => handleCopyLink(evt)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isCopied ? <Check size={14} style={{ color: 'var(--success-text)' }} /> : <Copy size={14} />}
                  <span>{isCopied ? 'Tersalin' : 'Salin Link'}</span>
                </button>

                <button
                  onClick={() => handlePreviewPublic(evt.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--brand-600)', fontWeight: 600 }}
                  title="Lihat Tampilan Booking Klien"
                >
                  <span>Buka Booking</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal CRUD */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        eventToEdit={eventToEdit}
      />
    </div>
  );
};
