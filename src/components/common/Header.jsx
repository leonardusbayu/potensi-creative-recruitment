import React from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  Calendar, 
  ExternalLink, 
  LayoutDashboard, 
  Moon, 
  Sun, 
  RotateCcw, 
  Share2, 
  Sparkles,
  UserCheck
} from 'lucide-react';

export const Header = ({ onOpenShareModal }) => {
  const { 
    currentView, 
    setCurrentView, 
    theme, 
    toggleTheme, 
    brandSettings,
    resetToDemoData 
  } = useBooking();

  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(8px)',
      padding: '0.75rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Left: Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
          }}>
            <Calendar size={22} strokeWidth={2.3} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Potensi<span style={{ color: 'var(--brand-600)' }}> Creative</span>
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                <Sparkles size={11} /> PRO
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {brandSettings.companyName || 'Sistem Penjadwalan Cerdas'}
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)'
        }}>
          <button
            onClick={() => setCurrentView('admin')}
            className="btn btn-sm"
            style={{
              backgroundColor: currentView === 'admin' ? 'var(--bg-surface)' : 'transparent',
              color: currentView === 'admin' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: currentView === 'admin' ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <LayoutDashboard size={15} />
            <span>Panel Admin / Host</span>
          </button>
          
          <button
            onClick={() => setCurrentView('public_booking')}
            className="btn btn-sm"
            style={{
              backgroundColor: currentView === 'public_booking' ? 'var(--bg-surface)' : 'transparent',
              color: currentView === 'public_booking' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: currentView === 'public_booking' ? 'var(--shadow-xs)' : 'none',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <UserCheck size={15} />
            <span>Halaman Booking Klien</span>
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="btn btn-secondary btn-sm"
              title="Bagikan Tautan Booking & Kode Semat"
            >
              <Share2 size={15} />
              <span className="hide-mobile">Bagikan & Semat</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            style={{ width: '36px', height: '36px', padding: 0 }}
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset semua data kalender ke sampel data bawaan?')) {
                resetToDemoData();
              }
            }}
            className="btn btn-ghost btn-sm"
            style={{ width: '36px', height: '36px', padding: 0, color: 'var(--text-muted)' }}
            title="Reset ke Data Demo"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
