import React, { useState, useEffect } from 'react';
import type { UserMapping } from '../types';
import { Users, Plus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';

interface UserMappingsProps {
  backendUrl: string;
}

export const UserMappings: React.FC<UserMappingsProps> = ({ backendUrl }) => {
  const [users, setUsers] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating/editing
  const [isEditing, setIsEditing] = useState<string | null>(null); // email of user being edited
  const [email, setEmail] = useState('');
  const [teamsUsername, setTeamsUsername] = useState('');
  const [teamsUserId, setTeamsUserId] = useState('');
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [slackUserId, setSlackUserId] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/users`);
      if (!res.ok) throw new Error("Failed to fetch user mappings");
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [backendUrl]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const res = await fetch(`${backendUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          teams_username: teamsUsername,
          teams_user_id: teamsUserId,
          jira_account_id: jiraAccountId,
          slack_user_id: slackUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create user mapping");
      }

      await fetchUsers();
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent, targetEmail: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/users/${targetEmail}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams_username: teamsUsername,
          teams_user_id: teamsUserId,
          jira_account_id: jiraAccountId,
          slack_user_id: slackUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update user mapping");
      }

      await fetchUsers();
      setIsEditing(null);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (targetEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete the mapping for ${targetEmail}?`)) return;

    try {
      const res = await fetch(`${backendUrl}/api/users/${targetEmail}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete user mapping");
      }

      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (user: UserMapping) => {
    setIsEditing(user.email);
    setEmail(user.email);
    setTeamsUsername(user.teams_username || '');
    setTeamsUserId(user.teams_user_id || '');
    setJiraAccountId(user.jira_account_id || '');
    setSlackUserId(user.slack_user_id || '');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    resetForm();
  };

  const resetForm = () => {
    setEmail('');
    setTeamsUsername('');
    setTeamsUserId('');
    setJiraAccountId('');
    setSlackUserId('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '50%', color: '#3b82f6', display: 'flex' }}>
            <Users size={24} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Identity Directory</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Map identity profiles across MS Teams, Jira Software, and Slack workspaces</p>
          </div>
        </div>
        {!showAddForm && (
          <button 
            className="glass-button glass-button-primary"
            onClick={() => { resetForm(); setShowAddForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Add Identity
          </button>
        )}
      </div>

      {/* Add User form */}
      {showAddForm && (
        <form className="glass-panel animate-fade-in" onSubmit={handleAdd} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 500 }}>Create Cross-Platform Mapping</h3>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="developer@company.com" 
                className="glass-input" 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Teams Username</label>
              <input 
                type="text" 
                placeholder="Gowtham" 
                className="glass-input" 
                value={teamsUsername}
                onChange={e => setTeamsUsername(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Teams User ID</label>
              <input 
                type="text" 
                placeholder="teams-usr-123" 
                className="glass-input" 
                value={teamsUserId}
                onChange={e => setTeamsUserId(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Jira Account ID</label>
              <input 
                type="text" 
                placeholder="jira-acc-456" 
                className="glass-input" 
                value={jiraAccountId}
                onChange={e => setJiraAccountId(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Slack User ID</label>
              <input 
                type="text" 
                placeholder="U_SLACK_789" 
                className="glass-input" 
                value={slackUserId}
                onChange={e => setSlackUserId(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="glass-button glass-button-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button type="submit" className="glass-button glass-button-primary">Save Mapping</button>
          </div>
        </form>
      )}

      {/* Main Directory Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)' }}>Loading directory mapping information...</div>
        ) : error ? (
          <div style={{ padding: '3rem', color: 'var(--color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={36} />
            <div>Failed to load users: {error}</div>
            <button className="glass-button glass-button-secondary" style={{ marginTop: '0.5rem' }} onClick={fetchUsers}>Retry</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Email / Primary Account</th>
                  <th style={{ padding: '0.75rem 1rem' }}>MS Teams Profile</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Jira Account ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Slack ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isEditingThisUser = isEditing === user.email;
                  return (
                    <tr key={user.email} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', fontSize: '0.875rem' }} className="table-row-hover">
                      {/* Email Col */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.email}</div>
                      </td>

                      {/* Teams Col */}
                      <td style={{ padding: '1rem' }}>
                        {isEditingThisUser ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input 
                              type="text" 
                              className="glass-input" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                              value={teamsUsername}
                              placeholder="Username"
                              onChange={e => setTeamsUsername(e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="glass-input" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                              value={teamsUserId}
                              placeholder="Teams User ID"
                              onChange={e => setTeamsUserId(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 500 }}>{user.teams_username || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.teams_user_id || 'No ID'}</div>
                          </div>
                        )}
                      </td>

                      {/* Jira Col */}
                      <td style={{ padding: '1rem' }}>
                        {isEditingThisUser ? (
                          <input 
                            type="text" 
                            className="glass-input" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            value={jiraAccountId}
                            placeholder="Jira Acc ID"
                            onChange={e => setJiraAccountId(e.target.value)}
                          />
                        ) : (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {user.jira_account_id || '—'}
                          </span>
                        )}
                      </td>

                      {/* Slack Col */}
                      <td style={{ padding: '1rem' }}>
                        {isEditingThisUser ? (
                          <input 
                            type="text" 
                            className="glass-input" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            value={slackUserId}
                            placeholder="Slack User ID"
                            onChange={e => setSlackUserId(e.target.value)}
                          />
                        ) : (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {user.slack_user_id || '—'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isEditingThisUser ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={(e) => handleUpdate(e, user.email)}
                              style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: 'none', padding: '0.375rem', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                              title="Save changes"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={cancelEdit}
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: 'none', padding: '0.375rem', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => startEdit(user)}
                              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.375rem', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                              title="Edit user mapping"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(user.email)}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none', padding: '0.375rem', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                              title="Delete user mapping"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No cross-platform identity mappings defined. Click "Add Identity" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
};
