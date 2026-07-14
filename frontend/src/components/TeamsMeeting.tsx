import React, { useState, useEffect, useRef } from 'react';
import { PRESETS } from '../presets';
import type { TranscriptLine, ScenarioPreset } from '../types';
import { 
  Play, 
  Sparkles, 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Share2, 
  CheckCircle2, 
  ClipboardList
} from 'lucide-react';

interface TeamsMeetingProps {
  backendUrl: string;
  onSyncComplete?: () => void;
}

export const TeamsMeeting: React.FC<TeamsMeetingProps> = ({ backendUrl, onSyncComplete }) => {
  // Presets and selection
  const [selectedPreset, setSelectedPreset] = useState<ScenarioPreset>(PRESETS[0]);
  
  
  // Meeting running state
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [speakerLogs, setSpeakerLogs] = useState<TranscriptLine[]>([]);
  
  // Audio/Video control toggles
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);

  // Copilot processing pipeline states
  const [syncingState, setSyncingState] = useState<'idle' | 'transcribing' | 'extracting' | 'jira_updating' | 'slack_notifying' | 'completed' | 'error'>('idle');
  const [syncedTasks, setSyncedTasks] = useState<any[]>([]);
  
  // Q&A assistant chat states
  const [qaInput, setQaInput] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ sender: 'user' | 'copilot', text: string }>>([
    { sender: 'copilot', text: "Hello! I am your Teams Copilot. Once the meeting finishes or you run transcription, ask me anything about what was discussed, who owns what, or when things are due." }
  ]);
  const [qaLoading, setQaLoading] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const transcriptTimerRef = useRef<any>(null);

  // Load selected preset data
  useEffect(() => {
    resetMeeting();
  }, [selectedPreset]);

  // Scroll to bottom helper
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [speakerLogs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaHistory]);

  const resetMeeting = () => {
    if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
    setIsMeetingActive(false);
    setCurrentLineIndex(-1);
    setSpeakerLogs([]);
    setSyncingState('idle');
    setSyncedTasks([]);
    setQaHistory([
      { sender: 'copilot', text: "Hello! I am your Teams Copilot. Once the meeting finishes or you run transcription, ask me anything about what was discussed, who owns what, or when things are due." }
    ]);
  };

  const startMeetingSimulation = () => {
    resetMeeting();
    setIsMeetingActive(true);
    setCurrentLineIndex(0);
    setSyncingState('transcribing');
    
    const lines = selectedPreset.transcript;
    let idx = 0;
    
    setSpeakerLogs([lines[0]]);
    
    transcriptTimerRef.current = setInterval(() => {
      idx += 1;
      if (idx < lines.length) {
        setCurrentLineIndex(idx);
        setSpeakerLogs(prev => [...prev, lines[idx]]);
      } else {
        clearInterval(transcriptTimerRef.current!);
        setIsMeetingActive(false);
        setSyncingState('transcribing'); // transcription complete, ready to process
      }
    }, 3500);
  };

  const skipToDoneTranscript = () => {
    resetMeeting();
    setIsMeetingActive(false);
    setSpeakerLogs(selectedPreset.transcript);
    setCurrentLineIndex(selectedPreset.transcript.length - 1);
  };

  // Run the 5-step Connector pipeline
  const runCopilotConnectorPipeline = async () => {
    if (speakerLogs.length === 0) {
      alert("No transcript found. Please start a meeting or load a transcript first.");
      return;
    }

    try {
      // Step 2: Extraction
      setSyncingState('extracting');
      await new Promise(r => setTimeout(r, 1200));

      // Step 3: Jira Updates
      setSyncingState('jira_updating');
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: Slack Notifications
      setSyncingState('slack_notifying');
      
      const payload = {
        meeting_id: selectedPreset.meetingId,
        transcript: speakerLogs
      };

      const res = await fetch(`${backendUrl}/api/simulation/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to process copilot synchronization");
      const data = await res.json();

      setSyncedTasks(data.tasks || []);
      setSyncingState('completed');

      if (onSyncComplete) onSyncComplete();

    } catch (err: any) {
      setSyncingState('error');
      alert(`Sync failed: ${err.message}`);
    }
  };

  // Chat Q&A submit handler
  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim()) return;

    const userText = qaInput;
    setQaHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setQaInput('');
    setQaLoading(true);

    try {
      const payload = {
        transcript: speakerLogs.length > 0 ? speakerLogs : selectedPreset.transcript,
        question: userText
      };

      const res = await fetch(`${backendUrl}/api/simulation/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Assistant Q&A failed");
      const data = await res.json();

      setQaHistory(prev => [...prev, { sender: 'copilot', text: data.answer }]);
    } catch (err: any) {
      setQaHistory(prev => [...prev, { sender: 'copilot', text: `Sorry, I couldn't answer your question. Error: ${err.message}` }]);
    } finally {
      setQaLoading(false);
    }
  };

  // Determine active speaker to show microphone pulse
  const getActiveSpeaker = () => {
    if (!isMeetingActive || currentLineIndex === -1) return '';
    return selectedPreset.transcript[currentLineIndex]?.speaker || '';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem', width: '100%', alignItems: 'stretch' }}>
      
      {/* Left Pane: Meeting Grid and Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Preset Selector Banner */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <ClipboardList size={20} style={{ color: 'var(--color-teams)' }} />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Meeting Script Presets</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.meetingId}
                    onClick={() => {
                      if (isMeetingActive) {
                        if (!confirm("Stop current meeting and load another preset?")) return;
                      }
                      setSelectedPreset(p);
                    }}
                    style={{
                      background: selectedPreset.meetingId === p.meetingId ? 'var(--color-teams-bg)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedPreset.meetingId === p.meetingId ? 'var(--color-teams)' : 'var(--border-color)'}`,
                      color: selectedPreset.meetingId === p.meetingId ? '#fff' : 'var(--text-secondary)',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {p.name.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            className="glass-button glass-button-secondary"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            onClick={skipToDoneTranscript}
          >
            Load Full Transcript
          </button>
        </div>

        {/* Video Call Simulation Grid */}
        <div className="glass-panel" style={{ background: '#111422', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', minHeight: '340px' }}>
          
          {/* User 1: Sarah */}
          <div style={{
            background: '#16192a',
            borderRadius: '8px',
            border: getActiveSpeaker() === 'Sarah' ? '2px solid #10b981' : '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ec4899',
              color: '#fff',
              fontSize: '1.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: getActiveSpeaker() === 'Sarah' ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none'
            }}>
              S
            </div>
            <span style={{ marginTop: '0.75rem', fontWeight: 500, fontSize: '0.9rem' }}>Sarah (Cloud Infra)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>sarah@company.com</span>
            {getActiveSpeaker() === 'Sarah' && (
              <span className="speaking-bubble" style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '10px', fontWeight: 600 }}>SPEAKING</span>
            )}
          </div>

          {/* User 2: Alex */}
          <div style={{
            background: '#16192a',
            borderRadius: '8px',
            border: getActiveSpeaker() === 'Alex' ? '2px solid #10b981' : '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: '#fff',
              fontSize: '1.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: getActiveSpeaker() === 'Alex' ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none'
            }}>
              A
            </div>
            <span style={{ marginTop: '0.75rem', fontWeight: 500, fontSize: '0.9rem' }}>Alex (Dev Lead)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>alex@company.com</span>
            {getActiveSpeaker() === 'Alex' && (
              <span className="speaking-bubble" style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '10px', fontWeight: 600 }}>SPEAKING</span>
            )}
          </div>

          {/* User 3: Gowtham */}
          <div style={{
            background: '#16192a',
            borderRadius: '8px',
            border: getActiveSpeaker() === 'Gowtham' ? '2px solid #10b981' : '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#10b981',
              color: '#fff',
              fontSize: '1.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: getActiveSpeaker() === 'Gowtham' ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none'
            }}>
              G
            </div>
            <span style={{ marginTop: '0.75rem', fontWeight: 500, fontSize: '0.9rem' }}>Gowtham (Staff Architect)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>gowtham@company.com</span>
            {getActiveSpeaker() === 'Gowtham' && (
              <span className="speaking-bubble" style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: '10px', fontWeight: 600 }}>SPEAKING</span>
            )}
          </div>

          {/* User 4: Me (Visual Mock) */}
          <div style={{
            background: '#16192a',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#8b5cf6',
              color: '#fff',
              fontSize: '1.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              😎
            </div>
            <span style={{ marginTop: '0.75rem', fontWeight: 500, fontSize: '0.9rem' }}>You (Meeting Admin)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>monitoring...</span>
          </div>

        </div>

        {/* Video Control Bar */}
        <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#141724' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setMicActive(!micActive)}
              style={{ background: micActive ? 'rgba(255,255,255,0.06)' : 'rgba(239, 68, 68, 0.2)', color: micActive ? '#fff' : '#ef4444', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {micActive ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button 
              onClick={() => setVideoActive(!videoActive)}
              style={{ background: videoActive ? 'rgba(255,255,255,0.06)' : 'rgba(239, 68, 68, 0.2)', color: videoActive ? '#fff' : '#ef4444', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {videoActive ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Share2 size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {speakerLogs.length > 0 && syncingState === 'idle' && (
              <button 
                onClick={runCopilotConnectorPipeline}
                className="glass-button glass-button-primary animate-fade-in"
                style={{ gap: '0.5rem', background: '#8b5cf6' }}
              >
                <Sparkles size={16} /> Sync Copilot Connector
              </button>
            )}

            {!isMeetingActive ? (
              <button 
                onClick={startMeetingSimulation}
                className="glass-button glass-button-primary"
                style={{ gap: '0.5rem', background: 'var(--color-teams)' }}
              >
                <Play size={16} /> Start Teams Call
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
                  setIsMeetingActive(false);
                }}
                className="glass-button"
                style={{ gap: '0.5rem', background: '#ef4444', color: '#fff' }}
              >
                <PhoneOff size={16} /> End Call
              </button>
            )}
          </div>
        </div>

        {/* Live Transcription Scrolling Box */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '240px', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(25, 29, 45, 0.4)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isMeetingActive ? '#ef4444' : '#10b981', animation: isMeetingActive ? 'pulse 1.5s infinite' : 'none' }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>MS Teams Live Transcription</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#0a0c12' }}>
            {speakerLogs.map((line, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left', animation: 'fadeIn 0.25s ease-out' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 
                  line.speaker === 'Sarah' ? '#f472b6' : 
                  line.speaker === 'Alex' ? '#60a5fa' : 
                  line.speaker === 'Gowtham' ? '#34d399' : '#a78bfa'
                }}>
                  {line.speaker}:
                </span>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.4, background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                  {line.text}
                </span>
              </div>
            ))}
            
            {isMeetingActive && (
              <div style={{ display: 'flex', gap: '0.375rem', padding: '0.25rem', alignSelf: 'flex-start' }}>
                <span className="typing-dot" style={{ animationDelay: '0s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}

            {speakerLogs.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '0.5rem' }}>
                <Bot size={24} />
                <span>Call is inactive. Start call to stream transcription.</span>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

      </div>

      {/* Right Pane: Copilot & Assistant Integration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
        
        {/* Copilot Pipeline Sync State Banner */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid var(--color-copilot)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa' }}>
            <Sparkles size={20} />
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>Copilot Automated Sync</span>
          </div>

          {/* Sync Progress Pipeline Graphic */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.825rem' }}>
            
            {/* Step 1: Record */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: speakerLogs.length > 0 ? '#10b981' : '#2e303a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {speakerLogs.length > 0 ? '✓' : '1'}
              </div>
              <span style={{ color: speakerLogs.length > 0 ? '#fff' : 'var(--text-muted)', fontWeight: speakerLogs.length > 0 ? 500 : 400 }}>1. Listen & Transcribe Meeting</span>
            </div>

            {/* Step 2: Extract */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: syncingState === 'extracting' ? '#3b82f6' : (syncingState === 'jira_updating' || syncingState === 'slack_notifying' || syncingState === 'completed') ? '#10b981' : '#2e303a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {['jira_updating', 'slack_notifying', 'completed'].includes(syncingState) ? '✓' : '2'}
              </div>
              <span style={{ color: syncingState === 'extracting' ? '#3b82f6' : ['jira_updating', 'slack_notifying', 'completed'].includes(syncingState) ? '#fff' : 'var(--text-muted)' }}>
                {syncingState === 'extracting' ? 'Analyzing transcript...' : '2. Copilot Action Items Extracted'}
              </span>
            </div>

            {/* Step 3: Write Jira */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: syncingState === 'jira_updating' ? '#3b82f6' : (syncingState === 'slack_notifying' || syncingState === 'completed') ? '#10b981' : '#2e303a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {['slack_notifying', 'completed'].includes(syncingState) ? '✓' : '3'}
              </div>
              <span style={{ color: syncingState === 'jira_updating' ? '#3b82f6' : ['slack_notifying', 'completed'].includes(syncingState) ? '#fff' : 'var(--text-muted)' }}>
                {syncingState === 'jira_updating' ? 'Creating Jira Issues...' : '3. Automatically Log tickets in Jira'}
              </span>
            </div>

            {/* Step 4: Notify Slack */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: syncingState === 'slack_notifying' ? '#3b82f6' : syncingState === 'completed' ? '#10b981' : '#2e303a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {syncingState === 'completed' ? '✓' : '4'}
              </div>
              <span style={{ color: syncingState === 'slack_notifying' ? '#3b82f6' : syncingState === 'completed' ? '#fff' : 'var(--text-muted)' }}>
                {syncingState === 'slack_notifying' ? 'Posting to Slack...' : '4. Notify Team Slack Channel'}
              </span>
            </div>

          </div>

          {/* Sync Success summary */}
          {syncingState === 'completed' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', borderColor: '#10b981', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} /> Sync Completed Successfully!
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Created <strong>{syncedTasks.length}</strong> Jira tickets and broadcast summaries to Slack channel.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                {syncedTasks.map(t => (
                  <div key={t.issue_key} style={{ fontSize: '0.7rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    🎫 <span style={{ color: '#3b82f6' }}>{t.issue_key}</span>: {t.summary} ({t.assignee_name})
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Copilot Q&A chat assistant */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '420px', overflow: 'hidden', padding: 0 }}>
          {/* Header */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139, 92, 246, 0.1)' }}>
            <Bot size={18} style={{ color: '#a78bfa' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>Copilot Chat Assistant</span>
          </div>

          {/* Chat Window */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0a0b10' }}>
            {qaHistory.map((qa, index) => (
              <div key={index} style={{
                alignSelf: qa.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                textAlign: 'left'
              }}>
                <div style={{
                  background: qa.sender === 'user' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${qa.sender === 'user' ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-color)'}`,
                  color: qa.sender === 'user' ? '#fff' : '#cbd5e1',
                  padding: '0.625rem 0.875rem',
                  borderRadius: qa.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  fontSize: '0.825rem',
                  lineHeight: '1.4'
                }}>
                  {qa.text}
                </div>
              </div>
            ))}
            {qaLoading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.375rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '12px' }}>
                <span className="typing-dot" style={{ animationDelay: '0s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleQaSubmit} style={{ padding: '0.75rem 1rem', background: '#11131a', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="glass-input"
              style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: '#171923' }}
              placeholder="Ask Copilot about the meeting..."
              value={qaInput}
              onChange={e => setQaInput(e.target.value)}
              disabled={qaLoading}
            />
            <button type="submit" className="glass-button glass-button-primary" style={{ padding: '0.5rem' }} disabled={qaLoading}>
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .typing-dot {
          width: 5px;
          height: 5px;
          background: #9ca3af;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
};
