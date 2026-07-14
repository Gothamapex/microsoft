import axios from 'axios';
import { config } from '../config.js';
import { dbRun, dbGet } from '../database.js';

async function createJiraIssueLive(summary, description, priority, assigneeAccountId) {
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraApiToken) {
    throw new Error("Jira credentials not configured.");
  }

  const url = `${config.jiraUrl.replace(/\/$/, '')}/rest/api/3/issue`;
  
  let priorityName = "Medium";
  if (priority.toUpperCase() === "HIGH") priorityName = "High";
  else if (priority.toUpperCase() === "LOW") priorityName = "Low";

  const payload = {
    fields: {
      project: { key: "SYNC" },
      summary: summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description }]
          }
        ]
      },
      priority: { name: priorityName }
    }
  };

  if (assigneeAccountId) {
    payload.fields.assignee = { id: assigneeAccountId };
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString('base64');
  
  const response = await axios.post(url, payload, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader
    }
  });

  return {
    key: response.data.key,
    id: response.data.id
  };
}

export async function createJiraIssue(summary, priority, assigneeEmail, meetingId, slackThreadTs) {
  let assigneeName = "Unassigned";
  let jiraAccountId = null;

  // Resolve user mapping
  if (assigneeEmail) {
    const user = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [assigneeEmail]);
    if (user) {
      jiraAccountId = user.jira_account_id;
      assigneeName = user.teams_username || assigneeEmail.split('@')[0];
    }
  }

  const description = `Auto-generated task from Microsoft Teams Connector.\nMeeting ID: ${meetingId || 'Simulated'}`;
  let issueKey = "";

  if (config.useMockApis) {
    // Generate simulated key (SYNC-101, etc.)
    const lastIssue = await dbGet('SELECT issue_key FROM jira_issue_syncs ORDER BY issue_key DESC LIMIT 1');
    let num = 101;
    if (lastIssue && lastIssue.issue_key.startsWith("SYNC-")) {
      const parts = lastIssue.issue_key.split('-');
      const val = parseInt(parts[1], 10);
      if (!isNaN(val)) num = val + 1;
    }
    issueKey = `SYNC-${num}`;
  } else {
    try {
      const res = await createJiraIssueLive(summary, description, priority, jiraAccountId);
      issueKey = res.key;
    } catch (e) {
      console.warn("Live Jira creation failed, falling back to mock:", e.message);
      const lastIssue = await dbGet('SELECT issue_key FROM jira_issue_syncs ORDER BY issue_key DESC LIMIT 1');
      let num = 101;
      if (lastIssue && lastIssue.issue_key.startsWith("SYNC-")) {
        const parts = lastIssue.issue_key.split('-');
        const val = parseInt(parts[1], 10);
        if (!isNaN(val)) num = val + 1;
      }
      issueKey = `SYNC-${num}`;
    }
  }

  // Insert into SQLite DB
  await dbRun(
    `INSERT INTO jira_issue_syncs 
    (issue_key, summary, description, priority, assignee_name, assignee_email, status, meeting_id, slack_thread_ts) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [issueKey, summary, description, priority, assigneeName, assigneeEmail, 'To Do', meetingId, slackThreadTs]
  );

  return {
    issue_key: issueKey,
    summary,
    assignee_name: assigneeName,
    priority,
    status: "To Do"
  };
}

export async function updateJiraStatusInDb(issueKey, status) {
  await dbRun(
    'UPDATE jira_issue_syncs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE issue_key = ?',
    [status, issueKey]
  );
  return await dbGet('SELECT * FROM jira_issue_syncs WHERE issue_key = ?', [issueKey]);
}
