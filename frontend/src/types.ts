export interface UserMapping {
  email: string;
  teams_username: string;
  teams_user_id: string;
  jira_account_id: string;
  slack_user_id: string;
}

export interface JiraTicket {
  issue_key: string;
  summary: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee_name: string | null;
  assignee_email: string | null;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  meeting_id: string | null;
  slack_thread_ts: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlackMessage {
  id: number;
  channel: string;
  text: string;
  blocks_json: string | null;
  timestamp: string;
  meeting_id: string | null;
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  duration?: number; // duration to simulate typing/speaking
}

export interface ScenarioPreset {
  name: string;
  description: string;
  meetingId: string;
  transcript: TranscriptLine[];
}
