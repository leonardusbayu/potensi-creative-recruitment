import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Globe, 
  Save, 
  Check, 
  AlertCircle,
  CalendarCheck
} from 'lucide-react';

export const AvailabilityView = () => {
  const { availability, updateAvailabilitySchedule, updateAvailabilitySettings, showToast } = useBooking();

  const [schedule, setSchedule] = useState(() => JSON.parse(JSON.stringify(availability.weeklySchedule)));
  const [settings, setSettings] = useState({
    timezone: availability.timezone || 'Asia/Jakarta',
    slotInterval: availability.slotInterval || 30,
    minNoticeHours: availability.minNoticeHours || 4,
    maxDaysInAdvance: availability.maxDaysInAdvance || 60
  });

  const handleToggleDay = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayIndex === dayIndex) {
          const nextActive = !day.active;
          const slots = nextActive && day.slots.length === 0 ? [{ start: '09:00', end: '17:00' }] : day.slots;
          return { ...day, active: nextActive, slots };
        }
        return day;
      })
    );
  };

  const handleSlotChange = (dayIndex, slotIdx, field, val) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayIndex === dayIndex) {
          const updatedSlots = [...day.slots];
          updatedSlots[slotIdx] = { ...updatedSlots[slotIdx], [field]: val };
          return { ...day, slots: updatedSlots };
        }
        return day;
      })
    );
  };

  const handleAddSlot = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayIndex === dayIndex) {
          return {
            ...day,
            slots: [...day.slots, { start: '13:00', end: '17:00' }]
          };
        }
        return day;
      })
    );
  };

  const handleRemoveSlot = (dayIndex, slotIdx) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayIndex === dayIndex) {
          const filtered = day.slots.filter((_, i) => i !== slotIdx);
          return {
            ...day,
            slots: filtered,
            active: filtered.length > 0
          };
        }
        return day;
      })
    );
  };

  const handleSave = () => {
    updateAvailabilitySchedule(schedule);
    updateAvailabilitySettings(settings);
    showToast('Seluruh konfigurasi jam ketersediaan berhasil disimpan!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
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
            Ketersediaan & Jam Kerja
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Atur hari dan rentang jam kerja rutin mingguan saat Anda bersedia menerima booking rapat.
          </p>
        </div>

        <button onClick={handleSave} className="btn btn-primary">
          <Save size={16} />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Weekly Schedule Editor */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Jadwal Rutin Mingguan
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {schedule.map((day) => (
              <div
                key={day.day}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: day.active ? 'var(--bg-surface)' : 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {/* Day Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={day.active}
                      onChange={() => handleToggleDay(day.dayIndex)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--brand-600)' }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: day.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {day.day}
                    </span>
                  </label>

                  {day.active ? (
                    <button
                      onClick={() => handleAddSlot(day.dayIndex)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', color: 'var(--brand-600)' }}
                    >
                      <Plus size={14} />
                      <span>Tambah Sesi Jam</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Libur / Tidak Aktif
                    </span>
                  )}
                </div>

                {/* Slots List */}
                {day.active && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.75rem' }}>
                    {day.slots.map((slot, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleSlotChange(day.dayIndex, sIdx, 'start', e.target.value)}
                          className="form-input"
                          style={{ width: '120px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>sampai</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleSlotChange(day.dayIndex, sIdx, 'end', e.target.value)}
                          className="form-input"
                          style={{ width: '120px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        />

                        {day.slots.length > 1 && (
                          <button
                            onClick={() => handleRemoveSlot(day.dayIndex, sIdx)}
                            className="btn btn-danger-ghost btn-sm"
                            style={{ padding: '4px' }}
                            title="Hapus Jam Ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Constraints & Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Aturan & Batasan Booking
            </h3>

            {/* Timezone */}
            <div className="form-group">
              <label className="form-label">Zona Waktu Default</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="form-select"
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA, UTC+8)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT, UTC+9)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
                <option value="UTC">UTC (Universal)</option>
              </select>
            </div>

            {/* Minimum Notice */}
            <div className="form-group">
              <label className="form-label">Batas Minimal Pemberitahuan (Notice)</label>
              <select
                value={settings.minNoticeHours}
                onChange={(e) => setSettings({ ...settings, minNoticeHours: Number(e.target.value) })}
                className="form-select"
              >
                <option value={1}>1 Jam Sebelumnya</option>
                <option value={2}>2 Jam Sebelumnya</option>
                <option value={4}>4 Jam Sebelumnya (Standar)</option>
                <option value={12}>12 Jam Sebelumnya</option>
                <option value={24}>24 Jam (1 Hari Sebelumnya)</option>
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Mencegah tamu memesan slot mendadak tanpa persiapan.
              </span>
            </div>

            {/* Max Days in advance */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Batas Maksimal Pemesanan ke Depan</label>
              <select
                value={settings.maxDaysInAdvance}
                onChange={(e) => setSettings({ ...settings, maxDaysInAdvance: Number(e.target.value) })}
                className="form-select"
              >
                <option value={14}>14 Hari ke Depan</option>
                <option value={30}>30 Hari (1 Bulan)</option>
                <option value={60}>60 Hari (2 Bulan)</option>
                <option value={90}>90 Hari (3 Bulan)</option>
              </select>
            </div>
          </div>

          {/* Date Overrides / Blackout Dates Panel */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Tanggal Libur / Cuti Khusus
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Tandai tanggal spesifik di mana Anda tidak menerima booking sama sekali.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = e.target.overrideDate.value;
                const note = e.target.overrideNote.value;
                if (!d) return;
                addDateOverride({ date: d, title: note || 'Libur / Cuti', unavailable: true, slots: [] });
                e.target.reset();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}
            >
              <input
                name="overrideDate"
                type="date"
                className="form-input"
                style={{ fontSize: '0.825rem' }}
                required
              />
              <input
                name="overrideNote"
                type="text"
                placeholder="Keterangan (cth: Libur Cuti Bersama)"
                className="form-input"
                style={{ fontSize: '0.825rem' }}
              />
              <button type="submit" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }}>
                <Plus size={14} />
                <span>Tambah Hari Libur</span>
              </button>
            </form>

            {/* List of active overrides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
              {(!availability.dateOverrides || availability.dateOverrides.length === 0) ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  Belum ada tanggal libur khusus.
                </div>
              ) : (
                availability.dateOverrides.map((ov) => (
                  <div
                    key={ov.date}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ov.date}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ov.title}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDateOverride(ov.date)}
                      className="btn btn-danger-ghost btn-sm"
                      style={{ padding: '2px 4px' }}
                      title="Hapus Tanggal Ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--brand-50)',
            border: '1px solid var(--brand-200)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.8rem',
            color: 'var(--brand-700)',
            lineHeight: 1.5
          }}>
            <strong>💡 Sinkronisasi Otomatis:</strong> Setiap perubahan jam kerja di atas langsung dihitung secara real-time pada kalender publik klien.
          </div>
        </div>

      </div>
    </div>
  );
};
