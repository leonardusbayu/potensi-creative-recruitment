import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { Sidebar } from './Sidebar';
import { EventTypesView } from './EventTypesView';
import { BookingsView } from './BookingsView';
import { AvailabilityView } from './AvailabilityView';
import { PipelineView } from './PipelineView';
import { AIAssistantView } from './AIAssistantView';
import { SettingsView } from './SettingsView';
import { ShareEmbedModal } from './ShareEmbedModal';
import { JobPostComposer } from './JobPostComposer';
import { SocialCalendarView } from './SocialCalendarView';
import { CVReviewView } from './CVReviewView';
import { PotensiDashboard } from './PotensiDashboard';

export const AdminLayout = ({ isShareModalOpen, setIsShareModalOpen }) => {
  const { activeAdminTab } = useBooking();

  const renderContent = () => {
    switch (activeAdminTab) {
      case 'events':
        return <EventTypesView onOpenShareModal={() => setIsShareModalOpen(true)} />;
      case 'bookings':
        return <BookingsView />;
      case 'availability':
        return <AvailabilityView />;
      case 'pipeline':
        return <PipelineView />;
      case 'potensi':
        return <PotensiDashboard />;
      case 'rekrutmen':
      case 'social':
      case 'pelamar':
        return <PotensiDashboard />;
      case 'ai_assistant':
        return <AIAssistantView />;
      case 'embed':
        return (
          <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1rem', padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Bagikan & Sematkan Kalender</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Klik tombol di bawah untuk membuka pop-up opsi tautan langsung, iframe, dan widget popup.</p>
              <button onClick={() => setIsShareModalOpen(true)} className="btn btn-primary" style={{ marginTop: 12 }}>
                Buka Pop-up Sematkan Kalender
              </button>
            </div>
            <EventTypesView onOpenShareModal={() => setIsShareModalOpen(true)} />
          </div>
        );
      case 'settings':
        return <SettingsView />;
      default:
        return <EventTypesView onOpenShareModal={() => setIsShareModalOpen(true)} />;
    }
  };

  return (
    <div className="admin-layout-wrapper">
      <Sidebar />
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
};
