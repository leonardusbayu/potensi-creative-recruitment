import React, { useState } from 'react';
import { BookingProvider, useBooking } from './context/BookingContext';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/Toast';
import { ApiStatusBanner } from './components/common/ApiStatusBanner';
import { AdminLayout } from './components/admin/AdminLayout';
import { PublicBookingView } from './components/public/PublicBookingView';
import { ShareEmbedModal } from './components/admin/ShareEmbedModal';
import { HostWarriorApplyPage } from './components/public/HostWarriorApplyPage';
import './styles/hostWarrior.css';

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
  const isHostWarrior = candidateParam === 'apply';

  React.useEffect(() => {
    if (!isHostWarrior) return;
    document.documentElement.classList.add('pc-dark-bg');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('pc-vis');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.pc-r').forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
      document.documentElement.classList.remove('pc-dark-bg');
    };
  }, [isHostWarrior]);

  return (
    <div className="app-container">
      {isHostWarrior ? (
        <HostWarriorApplyPage jobSlug={new URLSearchParams(window.location.search).get('job')} />
      ) : (
        <>
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
