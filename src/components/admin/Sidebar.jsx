import React from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  CalendarDays, 
  Clock, 
  Kanban, 
  Sparkles, 
  Share2, 
  Settings, 
  Users,
  CheckCircle2,
  Megaphone
} from 'lucide-react';

export const Sidebar = () => {
  const { 
    activeAdminTab, 
    setActiveAdminTab, 
    bookings, 
    brandSettings,
    applicants
  } = useBooking();

  const upcomingCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingApplicants = applicants.filter((a) => a.status === "pending" || a.status === "review").length;

  const menuItems = [
    { id: 'potensi', label: 'Potensi Creative Hub', icon: Megaphone, highlight: true, badge: pendingApplicants },
    { id: 'events', label: 'Jenis Acara', icon: CalendarDays },
    { id: 'bookings', label: 'Janji Temu (Bookings)', icon: Users, badge: upcomingCount },
    { id: 'availability', label: 'Ketersediaan Jadwal', icon: Clock },
    { id: 'pipeline', label: 'HR Recruitment Pipeline', icon: Kanban },
    { id: 'ai_assistant', label: 'Asisten AI', icon: Sparkles },
    { id: 'embed', label: 'Bagikan & Kode Semat', icon: Share2 },
    { id: 'settings', label: 'Pengaturan & Branding', icon: Settings }
  ];

  return (
    <aside style={{
      width: '270px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Host Profile Capsule */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--border-default)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={brandSettings.hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt={brandSettings.hostName}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--brand-500)'
              }}
            />
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid var(--bg-surface)'
            }} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontWeight: 700,
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {brandSettings.hostName}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {brandSettings.companyName || 'Host CalendarJet'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeAdminTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveAdminTab(item.id)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--brand-50)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={18} style={{ color: isActive ? 'var(--brand-600)' : (item.highlight ? '#d97706' : 'var(--text-muted)') }} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>
                  {item.badge}
                </span>
              )}

              {item.highlight && (
                <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-default)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>CalendarJet Engine v2.4</div>
        <div style={{ marginTop: '2px' }}>Mode Enterprise Aktif</div>
      </div>
    </aside>
  );
};
