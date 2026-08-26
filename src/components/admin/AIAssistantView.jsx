import React, { useState, useRef, useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Lightbulb, 
  Calendar, 
  Mail, 
  TrendingUp 
} from 'lucide-react';

const SUGGESTIONS = [
  { icon: Calendar, text: 'Carikan 3 slot kosong terbaik untuk besok sore' },
  { icon: Mail, text: 'Buatkan draf email follow-up untuk klien setelah meeting selesai' },
  { icon: TrendingUp, text: 'Tampilkan analisis performa booking dan tingkat konversi deals' }
];

export const AIAssistantView = () => {
  const { aiMessages, sendAIMessage, clearAIHistory, showToast } = useBooking();
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendAIMessage(inputText);
    setInputText('');
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Teks respon AI disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              CalendarJet AI Scheduling Assistant
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Asisten berbasis AI cerdas untuk analisis jadwal, resolusi konflik, dan otomasi komunikasi rapat.
            </p>
          </div>
        </div>

        <button
          onClick={clearAIHistory}
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--text-muted)' }}
          title="Bersihkan Percakapan"
        >
          <Trash2 size={15} />
          <span>Reset Percakapan</span>
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="card" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        backgroundColor: 'var(--bg-surface)'
      }}>
        {aiMessages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {/* Avatar */}
              {!isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={18} />
                </div>
              )}

              {/* Message Bubble */}
              <div style={{
                padding: '0.9rem 1.15rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isUser ? 'var(--brand-600)' : 'var(--bg-secondary)',
                color: isUser ? '#ffffff' : 'var(--text-primary)',
                border: isUser ? 'none' : '1px solid var(--border-default)',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                position: 'relative'
              }}>
                <div style={{ whiteSpace: 'pre-line' }}>
                  {msg.text}
                </div>

                {!isUser && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      padding: '4px',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Salin Pesan"
                  >
                    {copiedId === msg.id ? <Check size={13} style={{ color: 'var(--success-text)' }} /> : <Copy size={13} />}
                  </button>
                )}
              </div>

              {isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-100)',
                  color: 'var(--brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={18} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '0.75rem', paddingBottom: '2px' }}>
        {SUGGESTIONS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                sendAIMessage(s.text);
              }}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                whiteSpace: 'nowrap',
                borderRadius: 'var(--radius-full)'
              }}
            >
              <Icon size={13} style={{ color: '#d97706' }} />
              <span>{s.text}</span>
            </button>
          );
        })}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Tanyakan jadwal kosong, draf follow-up, saran strategi rapat..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="form-input"
          style={{ flex: 1, padding: '0.75rem 1rem' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
          <Send size={16} />
          <span>Kirim</span>
        </button>
      </form>
    </div>
  );
};
