/**
 * Helper utility for Calendar and Time Slot computations
 */

// Helper to convert "HH:mm" to total minutes from midnight
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// Helper to convert total minutes to "HH:mm"
export const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Generate available time slots for a given date based on host's availability schedule,
 * event duration, buffer times, and existing bookings.
 */
export const getAvailableSlotsForDate = (dateObj, event, availability, bookings = []) => {
  if (!dateObj || !event || !availability) return [];

  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  // Check if date is in the past (comparing with today's date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(dateObj);
  checkDate.setHours(0, 0, 0, 0);
  if (checkDate < today) {
    return [];
  }

  // Check date overrides / holidays
  const override = availability.dateOverrides?.find(o => o.date === dateStr);
  if (override) {
    if (override.unavailable || !override.slots || override.slots.length === 0) {
      return []; // Full day off / holiday
    }
  }

  // Find schedule for this day of week (or override slots if provided)
  const daySchedule = override 
    ? { active: true, slots: override.slots } 
    : availability.weeklySchedule?.find(s => s.dayIndex === dayOfWeek);

  if (!daySchedule || !daySchedule.active || !daySchedule.slots || daySchedule.slots.length === 0) {
    return [];
  }

  const duration = Number(event.duration) || 30;
  const bufferBefore = Number(event.bufferBefore) || 0;
  const bufferAfter = Number(event.bufferAfter) || 0;
  const totalSlotNeeded = bufferBefore + duration + bufferAfter;

  // Filter confirmed bookings on this specific date
  const dateBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');

  const availableSlots = [];
  const currentTotalMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = checkDate.getTime() === today.getTime();

  // Iterate over active time windows (e.g. 09:00 - 12:00, 13:00 - 17:00)
  for (const window of daySchedule.slots) {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);

    let candidateStart = windowStart;

    while (candidateStart + duration <= windowEnd) {
      const candidateEnd = candidateStart + duration;

      // If booking for today, enforce minimum advance notice (e.g., 2 hours ahead)
      if (isToday && candidateStart <= currentTotalMinutes + (availability.minNoticeHours || 2) * 60) {
        candidateStart += 15; // check next 15-min interval
        continue;
      }

      // Check conflict with existing bookings
      let hasConflict = false;
      for (const booking of dateBookings) {
        const bookingStart = timeToMinutes(booking.time);
        const bookingEnd = timeToMinutes(booking.endTime || minutesToTime(bookingStart + (booking.duration || 30)));
        
        // Conflict occurs if candidate slot overlaps with booked interval
        const paddedBookingStart = bookingStart - bufferBefore;
        const paddedBookingEnd = bookingEnd + bufferAfter;

        if (candidateStart < paddedBookingEnd && candidateEnd > paddedBookingStart) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        availableSlots.push(minutesToTime(candidateStart));
      }

      // Increment by slotInterval or 15/30 mins
      const step = event.duration >= 60 ? 30 : (availability.slotInterval || 15);
      candidateStart += step;
    }
  }

  return availableSlots;
};

/**
 * Generate standard RFC 5545 .ics Calendar file content for download
 */
export const generateIcsContent = (booking, hostName = 'Host CalendarJet') => {
  if (!booking) return '';

  const dateClean = booking.date.replace(/-/g, '');
  const startClean = booking.time.replace(':', '') + '00';
  const endClean = booking.endTime ? booking.endTime.replace(':', '') + '00' : '110000';

  const dtStart = `${dateClean}T${startClean}`;
  const dtEnd = `${dateClean}T${endClean}`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CalendarJet//ID//Booking Calendar//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@calendarjet.me
DTSTAMP:${nowStr}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${booking.eventTitle || 'Meeting'} with ${hostName}
DESCRIPTION:${(booking.notes || 'Meeting booked via CalendarJet')}\\nMeeting Link: ${booking.meetingLink || ''}\\nInvitee: ${booking.inviteeName} (${booking.inviteeEmail})
LOCATION:${booking.meetingLink || booking.meetingType || 'Online Video Call'}
STATUS:CONFIRMED
ORGANIZER;CN=${hostName}:mailto:noreply@calendarjet.me
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${booking.inviteeName}:mailto:${booking.inviteeEmail}
END:VEVENT
END:VCALENDAR`;
};

/**
 * Trigger download of .ics file in browser
 */
export const downloadIcsFile = (booking, hostName) => {
  const content = generateIcsContent(booking, hostName);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Meeting-${booking.inviteeName.replace(/\s+/g, '_')}-${booking.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generate Google Calendar Web URL
 */
export const generateGoogleCalendarUrl = (booking, hostName = 'Alex Pratama') => {
  if (!booking) return '#';
  const startDt = `${booking.date.replace(/-/g, '')}T${booking.time.replace(':', '')}00`;
  const endDt = `${booking.date.replace(/-/g, '')}T${(booking.endTime || booking.time).replace(':', '')}00`;
  
  const title = encodeURIComponent(`${booking.eventTitle} - ${hostName} & ${booking.inviteeName}`);
  const details = encodeURIComponent(`Pertemuan dijadwalkan melalui CalendarJet.\n\nTamu: ${booking.inviteeName} (${booking.inviteeEmail})\nNomor WhatsApp: ${booking.inviteePhone || '-'}\nCatatan: ${booking.notes || '-'}\n\nTautan Rapat: ${booking.meetingLink || 'Akan diupdate'}`);
  const location = encodeURIComponent(booking.meetingLink || 'Online Video Meeting (Google Meet / Zoom)');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&details=${details}&location=${location}`;
};

/**
 * Format Indonesian localized date string (e.g. "Kamis, 15 Mei 2026")
 */
export const formatIndonesianDate = (dateInput) => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Format Time display (e.g., "14:00 - 14:30 WIB")
 */
export const formatMeetingTimeRange = (time, endTime, timezone = 'WIB') => {
  return `${time} - ${endTime} ${timezone.includes('Jakarta') ? 'WIB' : timezone}`;
};

/**
 * Format phone number to clean WhatsApp international digits (e.g. "08123456789" -> "628123456789")
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
};

/**
 * Generate direct WhatsApp web/app link to send confirmation message
 */
export const generateWhatsAppBookingUrl = (booking, hostName = 'Alex Pratama') => {
  if (!booking || !booking.inviteePhone) return '#';
  const cleanPhone = formatWhatsAppNumber(booking.inviteePhone);
  
  const text = encodeURIComponent(
    `*Konfirmasi Jadwal Pertemuan - ${hostName}*\n\n` +
    `Halo *${booking.inviteeName}*,\n` +
    `Jadwal pertemuan Anda telah terkonfirmasi dengan rincian sebagai berikut:\n\n` +
    `📌 *Acara:* ${booking.eventTitle}\n` +
    `📅 *Tanggal:* ${formatIndonesianDate(booking.date)}\n` +
    `⏰ *Waktu:* ${booking.time} - ${booking.endTime} WIB (${booking.duration} Menit)\n` +
    `🎥 *Tautan Rapat:* ${booking.meetingLink || 'Online Video Meeting'}\n\n` +
    `Sampai jumpa di sesi pertemuan! Terima kasih.`
  );

  return `https://wa.me/${cleanPhone}?text=${text}`;
};
