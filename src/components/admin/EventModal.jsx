import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Video, 
  Clock, 
  Palette, 
  Layers, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

const colorOptions = [
  '#4F46E5', // Indigo
  '#0D9488', // Teal
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#0284C7', // Blue
  '#E11D48'  // Rose
];

export const EventModal = ({ isOpen, onClose, onSave, eventToEdit }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    duration: 30,
    color: '#4F46E5',
    locationType: 'google_meet',
    locationDetails: 'Google Meet',
    bufferBefore: 5,
    bufferAfter: 10,
    price: 0,
    customQuestions: []
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        title: eventToEdit.title || '',
        slug: eventToEdit.slug || '',
        description: eventToEdit.description || '',
        duration: Number(eventToEdit.duration) || 30,
        color: eventToEdit.color || '#4F46E5',
        locationType: eventToEdit.locationType || 'google_meet',
        locationDetails: eventToEdit.locationDetails || 'Google Meet',
        bufferBefore: Number(eventToEdit.bufferBefore) || 0,
        bufferAfter: Number(eventToEdit.bufferAfter) || 0,
        price: Number(eventToEdit.price) || 0,
        customQuestions: eventToEdit.customQuestions ? [...eventToEdit.customQuestions] : []
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        description: '',
        duration: 30,
        color: '#4F46E5',
        locationType: 'google_meet',
        locationDetails: 'Google Meet (Tautan otomatis)',
        bufferBefore: 5,
        bufferAfter: 10,
        price: 0,
        customQuestions: [
          { id: 'q1', label: 'Topik utama yang ingin dibahas', type: 'textarea', required: true }
        ]
      });
    }
  }, [eventToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTitleChange = (val) => {
    const slugGenerated = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug === '' || !eventToEdit ? slugGenerated : prev.slug
    }));
  };

  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      customQuestions: [
        ...prev.customQuestions,
        { id: `q-${Date.now()}`, label: '', type: 'text', required: false }
      ]
    }));
  };

  const handleRemoveQuestion = (idx) => {
    setFormData((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((_, i) => i !== idx)
    }));
  };

  const handleQuestionChange = (idx, field, val) => {
    setFormData((prev) => {
      const updated = [...prev.customQuestions];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, customQuestions: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '620px', padding: '1.75rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {eventToEdit ? 'Edit Jenis Acara' : 'Buat Jenis Acara Baru'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Atur durasi, lokasi rapat, dan formulir data untuk tamu Anda.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Judul Acara */}
          <div className="form-group">
            <label className="form-label">Nama / Judul Acara *</label>
            <input
              type="text"
              placeholder="Contoh: Konsultasi Teknis 1-on-1"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Slug URL */}
          <div className="form-group">
            <label className="form-label">Tautan Slug URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                calendarjet.me/
              </span>
              <input
                type="text"
                placeholder="konsultasi-teknis-30min"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="form-input"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="form-group">
            <label className="form-label">Deskripsi Acara</label>
            <textarea
              placeholder="Jelaskan apa yang akan dibahas pada sesi ini..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              rows={2}
            />
          </div>

          {/* Durasi & Lokasi (Grid 2 Kolom) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Durasi Pertemuan</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="form-select"
              >
                <option value={15}>15 Menit (Kilat)</option>
                <option value={30}>30 Menit (Standar)</option>
                <option value={45}>45 Menit (Demo / Presentasi)</option>
                <option value={60}>60 Menit (1 Jam Lengkap)</option>
                <option value={90}>90 Menit (Deep Dive)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Lokasi / Media Rapat</label>
              <select
                value={formData.locationType}
                onChange={(e) => {
                  const val = e.target.value;
                  let details = 'Google Meet';
                  if (val === 'zoom') details = 'Zoom Video Meeting';
                  if (val === 'phone') details = 'Telepon / WhatsApp Call';
                  if (val === 'in_person') details = 'Tatap Muka Langsung (Lokasi Kantor)';
                  setFormData({ ...formData, locationType: val, locationDetails: details });
                }}
                className="form-select"
              >
                <option value="google_meet">Google Meet (Otomatis)</option>
                <option value="zoom">Zoom Video Call</option>
                <option value="phone">Telepon / WhatsApp</option>
                <option value="in_person">Tatap Muka / Kantor</option>
              </select>
            </div>
          </div>

          {/* Buffer Time & Warna Badge */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Jeda Buffer Sebelum/Sesudah</label>
              <select
                value={formData.bufferAfter}
                onChange={(e) => setFormData({ ...formData, bufferBefore: Number(e.target.value) / 2, bufferAfter: Number(e.target.value) })}
                className="form-select"
              >
                <option value={0}>Tanpa Buffer (0 Menit)</option>
                <option value={5}>5 Menit</option>
                <option value={10}>10 Menit (Disarankan)</option>
                <option value={15}>15 Menit</option>
                <option value={30}>30 Menit</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Warna Aksen Brand</label>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: formData.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                      boxShadow: formData.color === c ? '0 0 0 2px var(--bg-surface)' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Custom Questions Section */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Pertanyaan Tambahan untuk Tamu
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Data spesifik yang perlu diisi klien sebelum rapat terkonfirmasi.
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} />
                <span>Tambah Pertanyaan</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {formData.customQuestions.map((q, idx) => (
                <div key={q.id || idx} style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <input
                    type="text"
                    placeholder="Pertanyaan..."
                    value={q.label}
                    onChange={(e) => handleQuestionChange(idx, 'label', e.target.value)}
                    className="form-input"
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                    className="form-select"
                    style={{ width: '110px', padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <option value="text">Teks Singkat</option>
                    <option value="textarea">Paragraf</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => handleQuestionChange(idx, 'required', e.target.checked)}
                    />
                    Wajib
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="btn btn-danger-ghost btn-sm"
                    style={{ padding: '4px' }}
                    title="Hapus Pertanyaan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              <span>{eventToEdit ? 'Simpan Perubahan' : 'Buat Jenis Acara'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
