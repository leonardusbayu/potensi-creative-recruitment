import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { 
  Users, 
  Mail, 
  Phone, 
  Star, 
  Video, 
  CheckCircle2, 
  XCircle, 
  GripVertical,
  Filter
} from 'lucide-react';

const STAGES = [
  { id: 'pending', label: '1. Lamaran Masuk', color: '#6b7280', bg: '#f3f4f6' },
  { id: 'analyzed', label: '2. CV Dianalisis', color: '#6366f1', bg: '#eef2ff' },
  { id: 'invited', label: '3. Diundang Interview', color: '#0D9488', bg: '#f0fdfa' },
  { id: 'booked', label: '4. Jadwal Terkunci', color: '#D97706', bg: '#fffbeb' },
  { id: 'interviewed', label: '5. Sudah Diwawancara', color: '#059669', bg: '#ecfdf5' },
  { id: 'tested', label: '6. Psikotes Selesai', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'hired', label: '7. Diterima', color: '#10b981', bg: '#ecfdf5' },
  { id: 'rejected', label: '8. Ditolak', color: '#ef4444', bg: '#fef2f2' }
];

export const PipelineView = () => {
  const { applicants, moveApplicantStatus } = useBooking();
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [jobFilter, setJobFilter] = useState('all');

  const jobs = [...new Set(applicants.map((a) => a.job_id))];

  const filtered = jobFilter === 'all' ? applicants : applicants.filter((a) => a.job_id === jobFilter);

  const getInStage = (stageId) => filtered.filter((a) => stageId === 'tested' ? (a.status === 'tested' || a.status === 'test_sent') : a.status === stageId);

  const moveStage = (id, currentStage, direction) => {
    const idx = STAGES.findIndex((s) => s.id === currentStage);
    const next = idx + direction;
    if (next >= 0 && next < STAGES.length) {
      moveApplicantStatus(id, STAGES[next].id);
    }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) moveApplicantStatus(id, stageId);
    setDraggedId(null);
    setDragOverStage(null);
  };

  const scoreColor = (s) => (s == null ? '#6b7280' : s >= 75 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444');

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            HR Recruitment Pipeline
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Pantau alur kandidat: lamaran masuk â†’ analisis CV â†’ diundang â†’ booking interview â†’ diwawancara â†’ ditolak.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)' }}>
            <option value="all">Semua Lowongan</option>
            {jobs.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>

      <div className="pipeline-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '1rem',
        alignItems: 'start',
        overflowX: 'auto',
        minHeight: '600px'
      }}>
        {STAGES.map((stage) => {
          const items = getInStage(stage.id);
          const isOver = dragOverStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragLeave={() => setDragOverStage(null)}
              style={{
                backgroundColor: isOver ? stage.bg : 'var(--bg-secondary)',
                border: isOver ? '2px dashed var(--brand-600)' : '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                minWidth: '200px',
                transition: 'all 150ms ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stage.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{stage.label}</span>
                </div>
                <span style={{ background: stage.color, color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{items.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '150px' }}>
                {items.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                    Tarik kartu ke sini
                  </div>
                ) : (
                  items.map((a) => {
                    const isDragging = draggedId === a.id;
                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, a.id)}
                        className="card card-hover"
                        style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `4px solid ${stage.color}`, cursor: 'grab', opacity: isDragging ? 0.4 : 1, boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-sm)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.job_id}</div>
                          </div>
                          <GripVertical size={14} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        </div>
                        {a.score != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Star size={12} style={{ color: scoreColor(a.score) }} />
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: scoreColor(a.score) }}>Skor AI: {a.score}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Mail size={11} /><span>{a.email}</span>
                          </div>
                          {a.wa && <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Phone size={11} /><span>{a.wa}</span></div>}
                          {(a.tiktok || a.ig) && <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Video size={11} /><span>{a.tiktok ? `TT:${a.tiktok}` : ''}{a.tiktok && a.ig ? ' ' : ''}{a.ig ? `IG:${a.ig}` : ''}</span></div>}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.ai_summary?.slice(0, 80)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
