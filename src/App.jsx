import React, { useState } from 'react';
import { BookingProvider, useBooking } from './context/BookingContext';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/Toast';
import { ApiStatusBanner } from './components/common/ApiStatusBanner';
import { AdminLayout } from './components/admin/AdminLayout';
import { PublicBookingView } from './components/public/PublicBookingView';
import { ShareEmbedModal } from './components/admin/ShareEmbedModal';

function getCandidateParam() {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  if (search.get('job')) return 'apply';
  if (search.get('token')) return 'interview';
  if (search.get('status')) return 'status';
  return null;
}

function MainApp() {
  const { currentView } = useBooking();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const candidateParam = getCandidateParam();

  return (
    <div className="app-container">
      {candidateParam ? (
        <PublicBookingView />
      ) : (
        <>
          <Header onOpenShareModal={() => setIsShareModalOpen(true)} />
          {currentView === 'admin' ? (
            <AdminLayout
              isShareModalOpen={isShareModalOpen}
              setIsShareModalOpen={setIsShareModalOpen}
            />
          ) : (
            <PublicBookingView />
          )}
          <ShareEmbedModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
        </>
      )}
      <ToastContainer />
      <ApiStatusBanner />
    </div>
  );
}

export default function App() {
  return (
    <BookingProvider>
      <MainApp />
    </BookingProvider>
  );
}
