import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe 
} from 'lucide-react';
import { getAvailableSlotsForDate } from '../../utils/calendarUtils';

const timezones = [
  { value: 'Asia/Jakarta', label: 'Waktu Indonesia Barat (WIB, UTC+7)' },
  { value: 'Asia/Makassar', label: 'Waktu Indonesia Tengah (WITA, UTC+8)' },
  { value: 'Asia/Jayapura', label: 'Waktu Indonesia Timur (WIT, UTC+9)' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT, UTC+8)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC+0)' }
];

export const CalendarWidget = ({ 
  selectedDate, 
  onSelectDate, 
  event, 
  availability, 
  bookings,
  selectedTimezone,
  onChangeTimezone 
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Today for past date comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar day cells
  const calendarCells = [];

  // Blank filler days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ isBlank: true, key: `blank-${i}` });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    cellDate.setHours(0, 0, 0, 0);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isPast = cellDate < today;
    const isToday = cellDate.getTime() === today.getTime();
    const isSelected = selectedDate === dateStr;

    // Check if slots are available
    let hasSlots = false;
    if (!isPast) {
      const slots = getAvailableSlotsForDate(cellDate, event, availability, bookings);
      hasSlots = slots.length > 0;
    }

    calendarCells.push({
      isBlank: false,
      dayNumber: day,
      dateStr: dateStr,
      isPast: isPast,
      isToday: isToday,
      isSelected: isSelected,
      hasSlots: hasSlots,
      key: `day-${day}`
    });
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1.25rem'
    }}>
      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem'
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
          {monthNames[month]} {year}
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={prevMonth}
            className="btn btn-ghost btn-sm"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-full)' }}
            title="Bulan Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={nextMonth}
            className="btn btn-ghost btn-sm"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-full)' }}
            title="Bulan Berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        textAlign: 'center',
        marginBottom: '0.5rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)'
      }}>
        {daysOfWeek.map((dw) => (
          <div key={dw} style={{ padding: '4px 0' }}>{dw}</div>
        ))}
      </div>

      {/* Date Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        flex: 1
      }}>
        {calendarCells.map((cell) => {
          if (cell.isBlank) {
            return <div key={cell.key} style={{ minHeight: '38px' }} />;
          }

          const canClick = !cell.isPast && cell.hasSlots;

          return (
            <button
              key={cell.key}
              disabled={!canClick}
              onClick={() => onSelectDate(cell.dateStr)}
              style={{
                minHeight: '38px',
                height: '38px',
                width: '100%',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: cell.isSelected ? 700 : (cell.hasSlots ? 600 : 400),
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cell.isSelected
                  ? 'var(--brand-600)'
                  : (cell.hasSlots ? 'var(--brand-50)' : 'transparent'),
                color: cell.isSelected
                  ? '#ffffff'
                  : (cell.hasSlots ? 'var(--brand-600)' : (cell.isPast ? 'var(--text-muted)' : 'var(--text-secondary)')),
                opacity: cell.isPast || !cell.hasSlots ? 0.45 : 1,
                cursor: canClick ? 'pointer' : 'not-allowed',
                border: cell.isToday && !cell.isSelected ? '1px dashed var(--brand-500)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <span>{cell.dayNumber}</span>
              {cell.hasSlots && !cell.isSelected && (
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-600)'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Timezone Selector */}
      <div style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Globe size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <select
          value={selectedTimezone}
          onChange={(e) => onChangeTimezone(e.target.value)}
          className="form-select"
          style={{
            fontSize: '0.78rem',
            padding: '0.35rem 0.6rem',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
