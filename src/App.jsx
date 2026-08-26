import React, { useState } from 'react';
import { BookingProvider, useBooking } from './context/BookingContext';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/Toast';
import { AdminLayout } from './components/admin/AdminLayout';
import { PublicBookingView } from './components/public/PublicBookingView';
import { ShareEmbedModal } from './components/admin/ShareEmbedModal';

function MainApp() {
  const { currentView } = useBooking();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Global Navigation Header */}
      <Header onOpenShareModal={() => setIsShareModalOpen(true)} />

      {/* Main View Router */}
      {currentView === 'admin' ? (
        <AdminLayout
          isShareModalOpen={isShareModalOpen}
          setIsShareModalOpen={setIsShareModalOpen}
        />
      ) : (
        <PublicBookingView />
      )}

      {/* Global Share / Embed Modal */}
      <ShareEmbedModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Notification Toast Hub */}
      <ToastContainer />
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
