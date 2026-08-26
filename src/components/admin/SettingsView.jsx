import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  User, 
  Building, 
  Globe, 
  Palette, 
  Save, 
  ShieldCheck, 
  Mail, 
  Phone,
  Sparkles
} from 'lucide-react';

export const SettingsView = () => {
  const { brandSettings, setBrandSettings, showToast } = useBooking();
  const [formData, setFormData] = useState({ ...brandSettings });

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setBrandSettings(formData);
    showToast('Pengaturan profil dan branding berhasil disimpan!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '840px' }}>
      {/* Header */}
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
            Pengaturan Profil & Branding CalendarJet
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Sesuaikan identitas host, foto profil, nama perusahaan, serta domain kustom (white-label).
          </p>
        </div>

        <button onClick={handleSave} className="btn btn-primary">
          <Save size={16} />
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Section 1: Profil Host */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--brand-600)' }} />
            <span>Identitas Host & Penyelenggara</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap Host *</label>
              <input
                type="text"
                value={formData.hostName}
                onChange={(e) => handleChange('hostName', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jabatan / Gelar Profesi</label>
              <input
                type="text"
                value={formData.hostTitle}
                onChange={(e) => handleChange('hostTitle', e.target.value)}
                className="form-input"
                placeholder="Senior Solutions Architect"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">URL Foto Profil (Avatar)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <img
                src={formData.hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt="Preview"
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--brand-500)' }}
              />
              <input
                type="url"
                value={formData.hostAvatar}
                onChange={(e) => handleChange('hostAvatar', e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bio Singkat Host</label>
            <textarea
              value={formData.hostBio}
              onChange={(e) => handleChange('hostBio', e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder="Deskripsi singkat mengenai pengalaman dan keahlian Anda..."
            />
          </div>
        </div>

        {/* Section 2: Kustomisasi Domain & Brand (White-Label) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={18} style={{ color: 'var(--brand-600)' }} />
            <span>Kustomisasi Brand & Custom Domain</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Perusahaan / Organisasi</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Domain Kustom (White-Label CNAME)</label>
              <input
                type="text"
                value={formData.domainCustom}
                onChange={(e) => handleChange('domainCustom', e.target.value)}
                className="form-input"
                placeholder="jadwal.perusahaan.com"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Tampilan booking akan menggunakan subdomain resmi brand Anda.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Notifikasi Admin</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nomor Kontak / WhatsApp</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Integrasi Webhook & Otomasi */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#d97706' }} />
            <span>Integrasi Webhook Otomasi (Zapier / Make / API)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Kirimkan data payload JSON secara real-time ke sistem internal atau otomasi pihak ketiga setiap kali ada janji temu baru masuk.
          </p>

          <div className="form-group">
            <label className="form-label">Outgoing Webhook Endpoint URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                value={formData.webhookUrl || ''}
                onChange={(e) => handleChange('webhookUrl', e.target.value)}
                className="form-input"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!formData.webhookUrl) {
                    showToast('Silakan masukkan Webhook URL terlebih dahulu!', 'info');
                    return;
                  }
                  showToast(`Ping webhook terkirim ke ${formData.webhookUrl}!`);
                }}
                className="btn btn-secondary btn-sm"
              >
                Uji Ping Webhook
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: White Label Active Notice */}
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <ShieldCheck size={28} style={{ color: 'var(--success-text)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Fitur White-Label CalendarJet Aktif
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Seluruh atribusi "Powered by" disembunyikan sehingga halaman booking tampak 100% seperti buatan tim in-house Anda.
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
