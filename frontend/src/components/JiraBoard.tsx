import React, { useState, useEffect } from 'react';
import type { JiraTicket } from '../types';
import { RefreshCw, LayoutGrid, ShieldAlert, Plus, Trash2, User, Flag, X } from 'lucide-react';

interface JiraBoardProps {
  backendUrl: string;
}

type ColumnStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';

export const JiraBoard: React.FC<JiraBoardProps> = ({ backendUrl }) => {
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioningKey, setTransitioningKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [createForm, setCreateForm] = useState({ summary: '', priority: 'MEDIUM', assignee_name: '' });
  const [creating, setCreating] = useState(false);

  const columns: ColumnStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

  const fetchTickets = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${backendUrl}/api/simulation/tickets`);
      if (!res.ok) throw new Error("Failed to fetch Jira tickets");
      const data = await res.json();
      setTickets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all Jira tickets and Slack logs? This cannot be undone.')) return;
    try {
      setResetting(true);
      await fetch(`${backendUrl}/api/simulation/reset`, { method: 'POST' });
      await fetchTickets(true);
    } finally {
      setResetting(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.summary.trim()) return;
    try {
      setCreating(true);
      const res = await fetch(`${backendUrl}/api/simulation/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      setCreateForm({ summary: '', priority: 'MEDIUM', assignee_name: '' });
      setShowCreate(false);
      await fetchTickets(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchTickets(true);
    const interval = setInterval(() => fetchTickets(false), 2500);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const handleTransition = async (issueKey: string, newStatus: ColumnStatus) => {
    try {
      setTransitioningKey(issueKey);
      const res = await fetch(`${backendUrl}/api/simulation/transition/${issueKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to transition issue");
      }

      // Re-fetch tickets to reflect changes immediately
      await fetchTickets(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioningKey(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'HIGH': return { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'MEDIUM': return { text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'LOW': return { text: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
      default: return { text: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const columnColors: Record<string, string> = {
    'To Do': '#9ca3af',
    'In Progress': '#3b82f6',
    'In Review': '#f59e0b',
    'Done': '#10b981',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Create Jira Ticket</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Summary *</label>
              <input
                value={createForm.summary}
                onChange={e => setCreateForm(f => ({ ...f, summary: e.target.value }))}
                placeholder="e.g. Fix login redirect bug"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority</label>
                <select
                  value={createForm.priority}
                  onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ background: '#161924', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
                >
                  {['HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assignee</label>
                <input
                  value={createForm.assignee_name}
                  onChange={e => setCreateForm(f => ({ ...f, assignee_name: e.target.value }))}
                  placeholder="e.g. Gowtham"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="glass-button glass-button-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="glass-button glass-button-primary"
                onClick={handleCreate}
                disabled={creating || !createForm.summary.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {creating ? <RefreshCw size={12} className="spin-anim" /> : <Plus size={12} />}
                {creating ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(0, 82, 204, 0.12)', padding: '0.75rem', borderRadius: '50%', color: '#4c9aff', display: 'flex' }}>
            <LayoutGrid size={24} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Jira Sprint Board</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Auto-synced from Teams meetings · change status to trigger Slack alerts</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="glass-button glass-button-secondary" onClick={() => fetchTickets(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={13} className={loading ? 'spin-anim' : ''} /> Refresh
          </button>
          <button className="glass-button glass-button-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={13} /> Create Ticket
          </button>
          <button
            className="glass-button glass-button-secondary"
            onClick={handleReset}
            disabled={resetting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}
          >
            <Trash2 size={13} /> {resetting ? 'Resetting…' : 'Reset Board'}
          </button>
        </div>
      </div>

      {/* Sprint Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {columns.map(col => {
          const count = tickets.filter(t => t.status === col).length;
          return (
            <div key={col} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: columnColors[col], flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{col}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Board Columns */}
      {loading && tickets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', color: 'var(--text-secondary)' }}>Loading Sprint Board tickets...</div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '4rem', color: 'var(--color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={36} />
          <div>Failed to connect to Jira database: {error}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', width: '100%' }}>
          {columns.map((col) => {
            const colTickets = tickets.filter(t => t.status === col);
            return (
              <div key={col} className="glass-panel" style={{ background: 'rgba(15, 18, 28, 0.4)', border: `1px solid ${colTickets.length > 0 ? columnColors[col] + '33' : 'var(--border-color)'}`, display: 'flex', flexDirection: 'column', minHeight: '480px', maxHeight: '700px', overflow: 'hidden' }}>
                {/* Column Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: `1px solid ${columnColors[col]}33`, background: `${columnColors[col]}0d` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: columnColors[col] }}></div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{col}</span>
                  </div>
                  <span style={{ background: `${columnColors[col]}22`, border: `1px solid ${columnColors[col]}44`, padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.72rem', color: columnColors[col], fontWeight: 700 }}>{colTickets.length}</span>
                </div>

                {/* Cards Container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {colTickets.map((t) => {
                    const priority = getPriorityColor(t.priority);
                    const isTransitioning = transitioningKey === t.issue_key;

                    return (
                      <div
                        key={t.issue_key}
                        className="glass-panel"
                        style={{
                          background: 'rgba(20, 24, 38, 0.8)',
                          padding: '0.875rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.625rem',
                          textAlign: 'left',
                          opacity: isTransitioning ? 0.6 : 1,
                          transform: isTransitioning ? 'scale(0.98)' : 'none',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                      >
                        {/* Card Header: Ticket Key + Priority */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#4c9aff', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.02em' }}>{t.issue_key}</span>
                          <span style={{
                            color: priority.text,
                            background: priority.bg,
                            border: `1px solid ${priority.border}`,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Flag size={9} />{t.priority}
                          </span>
                        </div>

                        {/* Title Summary */}
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.45 }}>
                          {t.summary}
                        </div>

                        {/* Metadata: Owner & Meeting Origin */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <User size={11} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.assignee_name || 'Unassigned'}</span>
                          </div>
                          {t.meeting_id && (
                            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.68rem' }}>📅 {t.meeting_id.substring(0, 16)}</div>
                          )}
                        </div>

                        {/* Transition Select Control */}
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Move to:</span>
                          <select
                            value={t.status}
                            onChange={(e) => handleTransition(t.issue_key, e.target.value as ColumnStatus)}
                            disabled={isTransitioning}
                            style={{
                              flex: 1,
                              background: '#161924',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {columns.map(statusOpt => (
                              <option key={statusOpt} value={statusOpt}>{statusOpt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {colTickets.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      border: `1px dashed ${columnColors[col]}33`,
                      borderRadius: '8px',
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>📭</div>
                      <span>No tickets here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
