import React, { useEffect, useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { CalendarWidget } from './CalendarWidget';
import { TimeSlotPicker } from './TimeSlotPicker';
import { InviteeForm } from './InviteeForm';
import { BookingSuccessModal } from './BookingSuccessModal';
import { ApplyForm } from './ApplyForm';
import { ApplicantStatusView } from './ApplicantStatusView';
import { 
  Clock, 
  Video, 
  MapPin, 
  Phone, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export const PublicBookingView = () => {
  const {
    eventTypes,
    availability,
    bookings,
    brandSettings,
    createBooking,
    selectedPublicEventId,
    setSelectedPublicEventId,
    jobs,
    markApplicantBooked,
    addD1Booking,
    showToast
  } = useBooking();

  useEffect(() => {
    const saved = localStorage.getItem('calendarjet_theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
  }, []);

  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const jobSlug = search.get("job");
  const token = search.get("token");
  const statusToken = search.get("status");
  if (statusToken) {
    return <ApplicantStatusView token={statusToken} />;
  }
  if (jobSlug) {
    return <ApplyForm jobSlug={jobSlug} />;
  }
  const isInterview = !!token;

  const activeEvents = eventTypes.filter((e) => e.isActive);
  const selectedEvent = eventTypes.find((e) => e.id === selectedPublicEventId) || activeEvents[0];

  // Flow State
  const [step, setStep] = useState('datetime'); // 'datetime' | 'form'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(availability.timezone || 'Asia/Jakarta');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
  };

  const handleSelectTime = (timeStr) => {
    setSelectedTime(timeStr);
  };

  const handleProceedToForm = () => {
    if (selectedDate && selectedTime) {
      setStep('form');
    }
  };

  const handleBackToDateTime = () => {
    setStep('datetime');
  };

  const handleBookingSubmit = async (bookingFormData) => {
    let verifiedApplicantId = null;
    let d1Booking = null;
    if (isInterview && token) {
      try {
        const r = await fetch("/api/bookings/interview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, date: selectedDate, time: selectedTime, jobId: jobs[0]?.id }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "token invalid");
        verifiedApplicantId = j.applicantId;
        d1Booking = j.booking ?? null;
        if (d1Booking) addD1Booking(d1Booking);
        try {
          const payload = JSON.parse(atob(token.split(".")[0]));
          verifiedApplicantId = payload.applicantId ?? verifiedApplicantId;
        } catch {}
      } catch (e) {
        showToast(`Gagal mengunci jadwal: ${String(e?.message || e).slice(0, 120)}. Silakan coba pilih slot lagi.`, "error");
        return;
      }
    }
    if (isInterview) {
      if (verifiedApplicantId) markApplicantBooked(verifiedApplicantId);
      setConfirmedBooking({
        id: d1Booking?.id || "d1",
        eventId: "evt-potensi-interview",
        eventTitle: d1Booking?.eventTitle || "Interview Live Streamer",
        date: selectedDate,
        time: selectedTime,
        endTime: d1Booking?.endTime,
        inviteeName: d1Booking?.inviteeName || bookingFormData.inviteeName,
        inviteeEmail: d1Booking?.inviteeEmail || bookingFormData.inviteeEmail,
        meetingType: "google_meet",
        meetingLink: d1Booking?.meetingLink || "",
        status: "confirmed",
        crmStage: "booked",
      });
      return;
    }
    const created = createBooking({
      ...bookingFormData,
      meetingType: selectedEvent.locationType
    });
    setConfirmedBooking(created);
  };

  const handleResetFlow = () => {
    setConfirmedBooking(null);
    setStep('datetime');
    setSelectedDate('');
    setSelectedTime('');
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'zoom':
      case 'google_meet':
        return <Video size={16} />;
      case 'phone':
        return <Phone size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 65px)',
      backgroundColor: 'var(--bg-primary)',
      padding: '2rem 1rem 4rem'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* White-label / Domain Notice */}
        {brandSettings.domainCustom && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: '1.25rem'
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--success-text)' }} />
            <span>Halaman Resmi Penjadwalan: <strong>{brandSettings.domainCustom}</strong></span>
          </div>
        )}

        {isInterview && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, color: '#065f46', fontSize: 13 }}>
            ✅ <b>Interview Verified</b> — token terdeteksi. Silakan pilih jadwal interview (link 7 hari). Data dikirim via <code>/api/bookings/interview</code> dengan verifikasi JWT.
          </div>
        )}

        {/* Main Card Container */}
        <div className="card" style={{
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)'
        }}>
          
          {/* Top Event Selector Bar (If multiple events exist) */}
          {activeEvents.length > 1 && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-default)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              overflowX: 'auto'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Pilihan Sesi:
              </span>
              {activeEvents.map((evt) => {
                const isSelected = evt.id === selectedEvent?.id;
                return (
                  <button
                    key={evt.id}
                    onClick={() => {
                      setSelectedPublicEventId(evt.id);
                      handleResetFlow();
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      backgroundColor: isSelected ? 'var(--brand-600)' : 'var(--bg-surface)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--brand-600)' : '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#ffffff' : (evt.color || 'var(--brand-600)')
                    }} />
                    <span>{evt.title}</span>
                    <span style={{ opacity: 0.8 }}>({evt.duration}m)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Core Booking Interface */}
          {step === 'datetime' ? (
            <div className="booking-scheduler-grid">
              
              {/* Column 1: Host & Event Profile */}
              <div style={{
                padding: '1.75rem',
                borderRight: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Host Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <img
                    src={brandSettings.hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                    alt={brandSettings.hostName}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--brand-500)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {brandSettings.hostName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {brandSettings.hostTitle || brandSettings.companyName}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: selectedEvent?.color || 'var(--brand-600)',
                    marginBottom: '0.5rem'
                  }} />
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {selectedEvent?.title}
                  </h1>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <Clock size={16} style={{ color: 'var(--brand-600)' }} />
                    <span style={{ fontWeight: 600 }}>{selectedEvent?.duration} Menit</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {getLocationIcon(selectedEvent?.locationType)}
                    <span>{selectedEvent?.locationDetails || 'Online Video Meeting'}</span>
                  </div>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  flex: 1
                }}>
                  {selectedEvent?.description}
                </p>

                {/* Bottom Trust Badge */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--success-text)' }} />
                  <span>Konfirmasi instan & sinkronisasi kalender</span>
                </div>
              </div>

              {/* Column 2: Interactive Monthly Calendar */}
              <div style={{
                borderRight: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)'
              }}>
                <CalendarWidget
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  event={selectedEvent}
                  availability={availability}
                  bookings={bookings}
                  selectedTimezone={selectedTimezone}
                  onChangeTimezone={setSelectedTimezone}
                />
              </div>

              {/* Column 3: Dynamic Available Time Slots */}
              <div style={{ backgroundColor: 'var(--bg-surface)' }}>
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectTime={handleSelectTime}
                  onConfirmSlot={handleProceedToForm}
                  event={selectedEvent}
                  availability={availability}
                  bookings={bookings}
                />
              </div>

            </div>
          ) : (
            /* Step 2: Invitee Information Form */
            <InviteeForm
              event={selectedEvent}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedTimezone={selectedTimezone}
              onBack={handleBackToDateTime}
              onSubmit={handleBookingSubmit}
            />
          )}

        </div>

        {/* Confirmation Modal */}
        {confirmedBooking && (
          <BookingSuccessModal
            booking={confirmedBooking}
            brandSettings={brandSettings}
            onBookAnother={handleResetFlow}
          />
        )}

      </div>
    </div>
  );
};
