import React, { useState, useEffect } from 'react';
import { TeamsMeeting } from './components/TeamsMeeting';
import { JiraBoard } from './components/JiraBoard';
import { SlackFeed } from './components/SlackFeed';
import { UserMappings } from './components/UserMappings';
import { 
  Home, 
  Video, 
  Columns, 
  MessageSquare, 
  Users, 
  RefreshCw, 
  Zap, 
  ArrowRight
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

type AppTab = 'dashboard' | 'teams' | 'jira' | 'slack' | 'users';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [stats, setStats] = useState({
    jiraCount: 0,
    slackCount: 0,
    userCount: 0,
    meetingCount: 0
  });
  const [resetting, setResetting] = useState(false);

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersRes = await fetch(`${BACKEND_URL}/api/users`);
      const users = await usersRes.json();

      // Fetch tickets
      const ticketsRes = await fetch(`${BACKEND_URL}/api/simulation/tickets`);
      const tickets = await ticketsRes.json();

      // Fetch slack
      const slackRes = await fetch(`${BACKEND_URL}/api/simulation/slack`);
      const slack = await slackRes.json();

      // Simple meeting unique count
      const uniqueMeetings = new Set(tickets.map((t: any) => t.meeting_id).filter(Boolean));

      setStats({
        userCount: users.length,
        jiraCount: tickets.length,
        slackCount: slack.length,
        meetingCount: uniqueMeetings.size
      });
    } catch (e) {
      console.warn("Failed to fetch dashboard statistics", e);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats occasionally
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to delete all synced tickets, slack messages, and reset simulator logs? User identity mappings will be preserved.")) return;
    
    try {
      setResetting(true);
      const res = await fetch(`${BACKEND_URL}/api/simulation/reset`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to reset database logs");
      await fetchStats();
      alert("Simulation databases reset successfully!");
    } catch (e: any) {
      alert(`Reset failed: ${e.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-app)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      
      {/* Platform Sidebar */}
      <div style={{ width: '260px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem' }}>
        
        {/* Platform Title Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 2rem 0.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-copilot), var(--color-teams))',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <Zap size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em', background: 'linear-gradient(to right, #fff, #9cb3ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              UnifyWork
            </h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Integration Hub</span>
          </div>
        </div>

        {/* Sidebar Nav Buttons */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`sidebar-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>
          
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1rem 0.5rem 0.25rem 0.5rem' }}>Core Workspaces</div>
          
          <button
            onClick={() => setActiveTab('teams')}
            className={`sidebar-nav-btn ${activeTab === 'teams' ? 'active' : ''}`}
            style={{ '--active-border': 'var(--color-teams)' } as React.CSSProperties}
          >
            <Video size={18} style={{ color: activeTab === 'teams' ? 'var(--color-teams)' : 'inherit' }} />
            <span>Microsoft Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('jira')}
            className={`sidebar-nav-btn ${activeTab === 'jira' ? 'active' : ''}`}
            style={{ '--active-border': 'var(--color-jira)' } as React.CSSProperties}
          >
            <Columns size={18} style={{ color: activeTab === 'jira' ? 'var(--color-jira)' : 'inherit' }} />
            <span>Jira Software</span>
          </button>
          <button
            onClick={() => setActiveTab('slack')}
            className={`sidebar-nav-btn ${activeTab === 'slack' ? 'active' : ''}`}
            style={{ '--active-border': '#ecb22e' } as React.CSSProperties}
          >
            <MessageSquare size={18} style={{ color: activeTab === 'slack' ? '#ecb22e' : 'inherit' }} />
            <span>Slack channel</span>
          </button>

          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1rem 0.5rem 0.25rem 0.5rem' }}>Directory & Configuration</div>

          <button
            onClick={() => setActiveTab('users')}
            className={`sidebar-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            style={{ '--active-border': '#10b981' } as React.CSSProperties}
          >
            <Users size={18} style={{ color: activeTab === 'users' ? '#10b981' : 'inherit' }} />
            <span>Identity Directory</span>
          </button>
        </div>

        {/* Sidebar Footer Controls */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Connector Server:</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
              Online
            </span>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="sidebar-reset-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={12} className={resetting ? 'spin-anim' : ''} />
            <span>Reset Simulator Logs</span>
          </button>
        </div>

      </div>

      {/* Main Content Workspace viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', background: 'var(--bg-app)' }}>
        
        {/* Top Header Navbar */}
        <header style={{ height: '70px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--bg-sidebar)', flexShrink: 0 }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKSPACE VIEW</span>
            <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: '#fff', fontWeight: 600, marginTop: '0.125rem' }}>
              {activeTab === 'dashboard' ? 'Platform Overview' :
               activeTab === 'teams' ? '🎙️ Microsoft Teams' :
               activeTab === 'jira' ? '📋 Jira Sprint Board' :
               activeTab === 'slack' ? '💬 Slack Workspace Feed' :
               '👥 Identity Directory Mapping'}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.375rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              🎯 Demo Sandbox Mode
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-copilot-bg)', border: '1px solid var(--color-copilot)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                🤖
              </div>
              <div style={{ textAlign: 'left', fontSize: '0.75rem' }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>Copilot Assistant</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Automations Active</div>
              </div>
            </div>
          </div>
        </header>

        {/* Central Workspace Canvas */}
        <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', width: '100%', display: 'flex' }}>
            
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
                
                {/* Welcome Card Banner */}
                <div className="glass-panel" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(80, 90, 201, 0.1), rgba(139, 92, 246, 0.1))', borderColor: 'var(--color-copilot)', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--color-copilot-bg)', border: '1px solid var(--color-copilot)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', color: '#a78bfa', alignSelf: 'flex-start', fontWeight: 600 }}>
                      🚀 AUTOMATION PIPELINE ACTIVE
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
                      Welcome to the Teams-Jira-Slack Sync Sandbox
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.925rem' }}>
                      UnifyWork connects your video conferencing tools directly to software planning boards and communication platforms. Run virtual team calls on Teams, let the Copilot extract action items automatically, construct Jira issues, and push real-time status updates back to your team on Slack.
                    </p>
                  </div>
                  <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3))' }}>🤖</div>
                </div>

                {/* Dashboard statistics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  
                  {/* Stat Card 1: Users */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '8px', display: 'flex' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{stats.userCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mapped Team Members</div>
                    </div>
                  </div>

                  {/* Stat Card 2: Meetings */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ background: 'var(--color-teams-bg)', color: 'var(--color-teams)', padding: '0.75rem', borderRadius: '8px', display: 'flex' }}>
                      <Video size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{stats.meetingCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Synced Meetings</div>
                    </div>
                  </div>

                  {/* Stat Card 3: Jira Tickets */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ background: 'var(--color-jira-bg)', color: 'var(--color-jira)', padding: '0.75rem', borderRadius: '8px', display: 'flex' }}>
                      <Columns size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{stats.jiraCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jira Synced Issues</div>
                    </div>
                  </div>

                  {/* Stat Card 4: Slack Logs */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ background: 'rgba(236, 178, 46, 0.1)', color: '#ecb22e', padding: '0.75rem', borderRadius: '8px', display: 'flex' }}>
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{stats.slackCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Slack Channel Posts</div>
                    </div>
                  </div>

                </div>

                {/* Pipeline walkthrough visualization */}
                <div className="glass-panel" style={{ padding: '1.75rem', textAlign: 'left' }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>How The Automation Works</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-teams)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}><Video size={14} /> 1. Teams Meeting</div>
                      <div style={{ color: 'var(--text-secondary)' }}>Run calls, transcribing spoken action items.</div>
                    </div>
                    
                    <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-copilot)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}><Zap size={14} /> 2. LLM Summary</div>
                      <div style={{ color: 'var(--text-secondary)' }}>Copilot extracts tasks, assignee mapping, and dates.</div>
                    </div>

                    <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-jira)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}><Columns size={14} /> 3. Jira Sync</div>
                      <div style={{ color: 'var(--text-secondary)' }}>Logs tickets in database with details and status.</div>
                    </div>

                    <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: '#ecb22e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.375rem' }}><MessageSquare size={14} /> 4. Slack Broadcast</div>
                      <div style={{ color: 'var(--text-secondary)' }}>Notifies team on Slack feeds. Updates status live.</div>
                    </div>

                  </div>
                </div>

                {/* Getting started CTA */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setActiveTab('teams')}
                    className="glass-button glass-button-primary"
                    style={{ gap: '0.5rem', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                  >
                    Start Teams Meeting Simulation <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            )}

            {activeTab === 'teams' && (
              <TeamsMeeting backendUrl={BACKEND_URL} onSyncComplete={fetchStats} />
            )}

            {activeTab === 'jira' && (
              <JiraBoard backendUrl={BACKEND_URL} />
            )}

            {activeTab === 'slack' && (
              <SlackFeed backendUrl={BACKEND_URL} />
            )}

            {activeTab === 'users' && (
              <UserMappings backendUrl={BACKEND_URL} />
            )}

          </div>
        </main>

      </div>

      {/* Global CSS overrides */}
      <style>{`
        .sidebar-nav-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-left: 3px solid transparent;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          transition: all 0.15s ease;
        }
        .sidebar-nav-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: #fff;
        }
        .sidebar-nav-btn.active {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-left: 3px solid var(--active-border, var(--color-copilot));
        }

        .sidebar-reset-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sidebar-reset-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fff;
        }
        .sidebar-reset-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

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
}

export default App;
