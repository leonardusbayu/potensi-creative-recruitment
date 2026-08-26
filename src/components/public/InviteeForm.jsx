import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Send 
} from 'lucide-react';
import { formatIndonesianDate, minutesToTime, timeToMinutes } from '../../utils/calendarUtils';

export const InviteeForm = ({ 
  event, 
  selectedDate, 
  selectedTime, 
  selectedTimezone,
  onBack, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({
    inviteeName: '',
    inviteeEmail: '',
    inviteePhone: '',
    notes: '',
    answers: {}
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const duration = Number(event?.duration) || 30;
  const startMins = timeToMinutes(selectedTime);
  const endTimeStr = minutesToTime(startMins + duration);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setFormData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value }
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.inviteeName.trim()) {
      newErrors.inviteeName = 'Nama lengkap wajib diisi';
    }
    if (!formData.inviteeEmail.trim()) {
      newErrors.inviteeEmail = 'Alamat email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inviteeEmail)) {
      newErrors.inviteeEmail = 'Format email tidak valid';
    }

    // Check required custom questions
    if (event?.customQuestions) {
      event.customQuestions.forEach((q) => {
        if (q.required && !formData.answers[q.id]) {
          newErrors[`q_${q.id}`] = `${q.label} wajib diisi`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({
        eventId: event.id,
        date: selectedDate,
        time: selectedTime,
        timezone: selectedTimezone,
        ...formData
      });
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '640px', margin: '0 auto' }}>
      {/* Top back button */}
      <button
        onClick={onBack}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: '1.25rem', paddingLeft: 0 }}
      >
        <ArrowLeft size={16} />
        <span>Pilih Waktu Lain</span>
      </button>

      {/* Selected Slot Summary Card */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CalendarIcon size={16} style={{ color: 'var(--brand-600)' }} />
          <strong>{formatIndonesianDate(selectedDate)}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Clock size={16} style={{ color: 'var(--brand-600)' }} />
          <span>{selectedTime} - {endTimeStr} ({selectedTimezone.includes('Jakarta') ? 'WIB' : selectedTimezone})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Video size={16} style={{ color: 'var(--brand-600)' }} />
          <span>{event.locationDetails || 'Online Video Meeting'}</span>
        </div>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
        Masukkan Rincian Data Anda
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Undangan kalender dan tautan meeting akan otomatis dikirimkan ke email Anda.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Nama Lengkap */}
        <div className="form-group">
          <label className="form-label">
            Nama Lengkap <span style={{ color: 'var(--danger-text)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={formData.inviteeName}
              onChange={(e) => handleInputChange('inviteeName', e.target.value)}
              className="form-input"
            />
          </div>
          {errors.inviteeName && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>
              {errors.inviteeName}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">
            Alamat Email <span style={{ color: 'var(--danger-text)' }}>*</span>
          </label>
          <input
            type="email"
            placeholder="nama@email.com"
            value={formData.inviteeEmail}
            onChange={(e) => handleInputChange('inviteeEmail', e.target.value)}
            className="form-input"
          />
          {errors.inviteeEmail && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>
              {errors.inviteeEmail}
            </span>
          )}
        </div>

        {/* Nomor WhatsApp / Telepon */}
        <div className="form-group">
          <label className="form-label">
            Nomor WhatsApp / HP (Opsional untuk pengingat otomatis)
          </label>
          <input
            type="tel"
            placeholder="+62 812-3456-7890"
            value={formData.inviteePhone}
            onChange={(e) => handleInputChange('inviteePhone', e.target.value)}
            className="form-input"
          />
        </div>

        {/* Custom Questions */}
        {event?.customQuestions && event.customQuestions.map((q) => (
          <div key={q.id} className="form-group">
            <label className="form-label">
              {q.label} {q.required && <span style={{ color: 'var(--danger-text)' }}>*</span>}
            </label>
            {q.type === 'textarea' ? (
              <textarea
                placeholder="Tuliskan keterangan Anda di sini..."
                value={formData.answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                className="form-textarea"
                rows={3}
              />
            ) : q.type === 'select' ? (
              <select
                value={formData.answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                className="form-select"
              >
                <option value="">-- Pilih salah satu opsi --</option>
                {q.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                className="form-input"
              />
            )}
            {errors[`q_${q.id}`] && (
              <span style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>
                {errors[`q_${q.id}`]}
              </span>
            )}
          </div>
        ))}

        {/* Catatan Tambahan */}
        <div className="form-group">
          <label className="form-label">Catatan Tambahan untuk Host (Opsional)</label>
          <textarea
            placeholder="Ada hal khusus yang ingin Anda sampaikan sebelum rapat dimulai?"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="form-textarea"
            rows={3}
          />
        </div>

        {/* Submit */}
        <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Send size={18} />
            <span>{isSubmitting ? 'Memproses Jadwal...' : 'Konfirmasi & Jadwalkan Rapat'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
