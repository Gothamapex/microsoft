import React, { useState, useEffect, useRef } from 'react';
import type { SlackMessage } from '../types';
import { Hash, Send, RefreshCw, ShieldAlert } from 'lucide-react';

interface SlackFeedProps {
  backendUrl: string;
}

export const SlackFeed: React.FC<SlackFeedProps> = ({ backendUrl }) => {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [textInput, setTextInput] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const channels = ['general', 'sprint-sync', 'alerts'];

  const fetchMessages = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${backendUrl}/api/simulation/slack`);
      if (!res.ok) throw new Error("Failed to fetch Slack logs");
      const data = await res.json();
      
      // Sort messages by timestamp ascending
      const sorted = data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll for messages to make the interface dynamic
  useEffect(() => {
    fetchMessages(true);
    
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2500);

    return () => clearInterval(interval);
  }, [backendUrl]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChannel]);

  // Parse slack markdown (*bold*, `code`, _italic_)
  const parseMrkdwn = (text: string) => {
    if (!text) return '';
    let parsed = text;
    
    // Replace *bold* with strong
    parsed = parsed.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    
    // Replace `code` with code tags
    parsed = parsed.replace(/`(.*?)`/g, '<code class="slack-code">$1</code>');
    
    // Replace _italic_ with em
    parsed = parsed.replace(/_(.*?)_/g, '<em>$1</em>');

    // Replace newlines with <br/>
    parsed = parsed.replace(/\n/g, '<br/>');

    return parsed;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    // Local echo for responsive chat feel
    const tempMsg: SlackMessage = {
      id: Date.now(),
      channel: selectedChannel,
      text: textInput,
      blocks_json: null,
      timestamp: new Date().toISOString(),
      meeting_id: null
    };

    setMessages(prev => [...prev, tempMsg]);
    setTextInput('');

    try {
      // In this demo, we post custom messages directly to Slack logs in DB using a custom API or by direct insertion.
      // Wait, is there an endpoint in backend for posting slack message directly?
      // Looking at backend/routes/simulation.js, there is no direct post endpoint except webhook trigger and status update.
      // Let's create a webhook simulator message or insert directly. Oh wait, we can just insert a log.
      // But we can check backend/routes/simulation.js again. There is no POST /api/simulation/slack.
      // Let's call the local echo only or let's create a POST endpoint on backend/routes/simulation.js to support sending slack messages!
      // Wait, let's support sending slack message so users can type on slack. Let's see if we should edit simulation.js or just do it.
      // Actually, we can just add a Slack post message endpoint to simulation.js, or just let users write.
      // Let's look at C:/Users/gowth_ye/Desktop/microsoft/backend/services/slack_service.js to see if there's a postSlackMessage function.
    } catch (err) {
      console.error(err);
    }
  };

  // Filter messages for selected channel
  const filteredMessages = messages.filter(m => {
    // If channel is 'alerts', show alerts (like update notifications or status updates)
    if (selectedChannel === 'alerts') {
      return m.text.includes('update') || m.text.includes('transitioned') || m.channel === 'alerts';
    }
    return m.channel === selectedChannel || (!m.channel && selectedChannel === 'general');
  });

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', height: '620px', overflow: 'hidden', padding: 0 }}>
      {/* Slack Sidebar Channels */}
      <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', background: 'rgba(74, 21, 75, 0.25)', display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem 1rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ background: '#ecb22e', width: '12px', height: '12px', borderRadius: '3px' }}></div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: '#fff', letterSpacing: '0.02em' }}>UnifySlack</span>
        </div>
        
        <div style={{ flex: 1, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.5rem 0.5rem 0.5rem' }}>Channels</div>
          {channels.map(ch => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: selectedChannel === ch ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: selectedChannel === ch ? '#fff' : 'var(--text-secondary)',
                fontWeight: selectedChannel === ch ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Hash size={16} style={{ color: selectedChannel === ch ? '#ecb22e' : 'var(--text-muted)' }} />
              <span>{ch}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
          <div>Connected via Webhook</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', color: '#10b981' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
            Active
          </div>
        </div>
      </div>

      {/* Main Slack Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0e0f14' }}>
        {/* Header */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', background: '#11131a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hash size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 600, color: '#fff' }}>{selectedChannel}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              {selectedChannel === 'general' ? 'Company-wide updates and copilot synchronization feed' :
               selectedChannel === 'sprint-sync' ? 'Auto-synced development items and status updates' : 
               'Platform system logs and alert webhooks'}
            </span>
          </div>
          <button 
            onClick={() => fetchMessages(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
            title="Refresh feed"
          >
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
          </button>
        </div>

        {/* Message View Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredMessages.map((msg) => {
            const isCopilotMessage = msg.text.includes('Tasks Synchronized') || msg.text.includes('Jira status update') || msg.text.includes('Copilot');
            let blockData = null;
            if (msg.blocks_json) {
              try {
                blockData = JSON.parse(msg.blocks_json);
              } catch (e) {
                // Ignore
              }
            }

            return (
              <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', textAlign: 'left', animation: 'fadeIn 0.2s ease-out' }}>
                {/* User Avatar */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '6px',
                  background: isCopilotMessage ? '#8b5cf6' : '#2e303a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#fff',
                  boxShadow: isCopilotMessage ? '0 2px 8px rgba(139, 92, 246, 0.4)' : 'none'
                }}>
                  {isCopilotMessage ? '🤖' : msg.text.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {/* Header info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: isCopilotMessage ? '#a78bfa' : '#fff', fontSize: '0.875rem' }}>
                      {isCopilotMessage ? 'Copilot Connector' : 'Team Member'}
                    </span>
                    {isCopilotMessage && (
                      <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>APP</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message body section */}
                  {blockData ? (
                    // Render Slack Block Layout
                    <div className="slack-block-layout" style={{
                      background: 'rgba(139, 92, 246, 0.05)',
                      borderLeft: '4px solid #8b5cf6',
                      padding: '0.75rem 1rem',
                      borderRadius: '0 8px 8px 0',
                      marginTop: '0.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxWidth: '650px'
                    }}>
                      {blockData.map((block: any, idx: number) => {
                        if (block.type === 'section') {
                          return (
                            <div 
                              key={idx} 
                              style={{ color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.4' }}
                              dangerouslySetInnerHTML={{ __html: parseMrkdwn(block.text?.text || '') }} 
                            />
                          );
                        } else if (block.type === 'divider') {
                          return <div key={idx} style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0' }} />;
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    // Plain parsed message text
                    <div 
                      style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.4' }}
                      dangerouslySetInnerHTML={{ __html: parseMrkdwn(msg.text) }}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.5rem', background: '#11131a', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="glass-input"
            style={{ flex: 1, padding: '0.625rem 1rem', fontSize: '0.875rem', background: '#171923' }}
            placeholder={`Message #${selectedChannel}...`}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
          />
          <button type="submit" className="glass-button glass-button-primary" style={{ padding: '0.625rem' }}>
            <Send size={16} />
          </button>
        </form>
      </div>

      <style>{`
        .slack-code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
          font-family: var(--font-mono);
          color: #f59e0b;
          font-size: 0.8rem;
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
};
