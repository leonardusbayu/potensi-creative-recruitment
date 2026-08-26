import React from 'react';
import { useBooking } from '../../context/BookingContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useBooking();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let iconColor = 'var(--success-text)';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--danger-text)';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = 'var(--info-text)';
        }

        return (
          <div key={toast.id} className="toast">
            <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: 'var(--text-muted)', padding: '2px' }}
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
