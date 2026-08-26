import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  X, 
  Copy, 
  Check, 
  Code, 
  ExternalLink, 
  Globe, 
  Layers, 
  Smartphone, 
  MessageCircle 
} from 'lucide-react';

export const ShareEmbedModal = ({ isOpen, onClose }) => {
  const { brandSettings, eventTypes, showToast } = useBooking();
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'iframe' | 'popup'
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [copiedType, setCopiedType] = useState(null);

  if (!isOpen) return null;

  const domain = brandSettings.domainCustom || 'calendarjet.me';
  const selectedEvent = eventTypes.find((e) => e.id === selectedEventId);
  const targetUrl = selectedEventId === 'all'
    ? `https://${domain}`
    : `https://${domain}/${selectedEvent?.slug || 'booking'}`;

  const iframeSnippet = `<iframe\n  src="${targetUrl}"\n  width="100%"\n  height="720"\n  frameborder="0"\n  style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"\n></iframe>`;

  const popupSnippet = `<!-- CalendarJet Floating Booking Widget -->\n<script src="https://assets.calendarjet.me/widget.js" async></script>\n<button\n  onclick="CalendarJet.open('${targetUrl}')"\n  style="background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 99px; font-weight: bold; border: none; cursor: pointer;"\n>\n  📅 Jadwalkan Pertemuan\n</button>`;

  const handleCopy = async (text, type) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedType(type);
      showToast('Teks / Kode berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      showToast('Gagal menyalin — silakan copy manual', 'error');
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Halo, silakan pilih jadwal pertemuan yang sesuai dengan Anda melalui tautan kalender resmi saya berikut ini:\n\n${targetUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Bagikan & Sematkan Kalender
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Bagikan tautan langsung ke klien atau pasang widget pemesanan pada website perusahaan Anda.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Event Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Pilih Halaman yang Ingin Dibagikan:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="all">Katalog Semua Jenis Acara (Halaman Utama Host)</option>
            {eventTypes.map((evt) => (
              <option key={evt.id} value={evt.id}>
                Acara: {evt.title} ({evt.duration} Menit)
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          border: '1px solid var(--border-default)'
        }}>
          {[
            { id: 'direct', label: 'Tautan Langsung' },
            { id: 'iframe', label: 'Kode Iframe Inline' },
            { id: 'popup', label: 'Widget Tombol Popup' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-sm"
              style={{
                flex: 1,
                backgroundColor: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Direct Link */}
        {activeTab === 'direct' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)'
            }}>
              <Globe size={16} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
              <span style={{
                flex: 1,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {targetUrl}
              </span>
              <button
                onClick={() => handleCopy(targetUrl, 'direct')}
                className="btn btn-primary btn-sm"
              >
                {copiedType === 'direct' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedType === 'direct' ? 'Tersalin' : 'Salin URL'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={shareWhatsApp}
                className="btn btn-secondary"
                style={{ flex: 1, color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
              >
                <MessageCircle size={16} />
                <span>Bagikan via WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Iframe Snippet */}
        {activeTab === 'iframe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tempelkan kode HTML berikut pada halaman landing page atau website Anda:
            </div>
            <pre style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              color: 'var(--text-primary)'
            }}>
              {iframeSnippet}
            </pre>
            <button
              onClick={() => handleCopy(iframeSnippet, 'iframe')}
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-end' }}
            >
              {copiedType === 'iframe' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedType === 'iframe' ? 'Kode Disalin' : 'Salin Kode Iframe'}</span>
            </button>
          </div>
        )}

        {/* Tab 3: Popup Widget */}
        {activeTab === 'popup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Pasang tombol floating interaktif yang membuka popup booking langsung:
            </div>
            <pre style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              color: 'var(--text-primary)'
            }}>
              {popupSnippet}
            </pre>
            <button
              onClick={() => handleCopy(popupSnippet, 'popup')}
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-end' }}
            >
              {copiedType === 'popup' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedType === 'popup' ? 'Kode Disalin' : 'Salin Kode Widget'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
