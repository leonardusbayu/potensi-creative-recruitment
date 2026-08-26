import React from 'react';
import { Clock, ArrowRight, Check } from 'lucide-react';
import { getAvailableSlotsForDate, formatIndonesianDate, minutesToTime, timeToMinutes } from '../../utils/calendarUtils';

export const TimeSlotPicker = ({ 
  selectedDate, 
  selectedTime, 
  onSelectTime, 
  onConfirmSlot,
  event, 
  availability, 
  bookings 
}) => {
  if (!selectedDate) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <Clock size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Pilih Tanggal Terlebih Dahulu
        </div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Pilih salah satu tanggal bertanda biru pada kalender untuk melihat jam yang tersedia.
        </div>
      </div>
    );
  }

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const availableSlots = getAvailableSlotsForDate(dateObj, event, availability, bookings);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1.25rem'
    }}>
      {/* Header Info */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Slot Waktu Tersedia
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
          {formatIndonesianDate(selectedDate)}
        </div>
      </div>

      {/* Slots List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        paddingRight: '4px',
        maxHeight: '340px'
      }}>
        {availableSlots.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}>
            Tidak ada slot jam tersedia pada tanggal ini. Silakan pilih tanggal lain.
          </div>
        ) : (
          availableSlots.map((slot) => {
            const isSelected = selectedTime === slot;
            const endMins = timeToMinutes(slot) + (event.duration || 30);
            const endTimeStr = minutesToTime(endMins);

            return (
              <div key={slot} style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onSelectTime(slot)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: isSelected ? '2px solid var(--brand-600)' : '1px solid var(--border-default)',
                    backgroundColor: isSelected ? 'var(--brand-50)' : 'var(--bg-surface)',
                    color: isSelected ? 'var(--brand-600)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span>{slot} - {endTimeStr}</span>
                  {isSelected && <Check size={16} />}
                </button>

                {isSelected && (
                  <button
                    onClick={onConfirmSlot}
                    className="btn btn-primary"
                    style={{
                      padding: '0.65rem 1rem',
                      animation: 'fadeIn 150ms ease-out'
                    }}
                  >
                    <span>Lanjut</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
