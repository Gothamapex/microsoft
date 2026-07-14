import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';
import { processTranscript } from '../services/copilot_service.js';
import { createJiraIssue } from '../services/jira_service.js';
import { postSlackTaskSummary, postSlackStatusUpdate } from '../services/slack_service.js';

const router = express.Router();

// MS Graph Webhook for transcripts
router.post('/teams', async (req, res) => {
  // Check for Graph subscription validation token
  const validationToken = req.query.validationToken;
  if (validationToken) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(validationToken);
  }

  const { value } = req.body;
  if (!value || !Array.isArray(value) || value.length === 0) {
    return res.json({ status: "skipped", message: "No event data found" });
  }

  const event = value[0];
  const resourceData = event.resourceData || {};
  const meetingId = resourceData.meetingId || event.id;

  if (!meetingId) {
    return res.json({ status: "skipped", message: "Meeting ID not found in payload" });
  }

  try {
    // Check if transcript was already processed
    const existing = await dbGet('SELECT * FROM meeting_syncs WHERE meeting_id = ?', [meetingId]);
    if (existing) {
      return res.json({ status: "skipped", message: "Meeting transcript already processed" });
    }

    const segments = resourceData.segments || [];
    if (segments.length === 0) {
      return res.json({ status: "skipped", message: "No transcript segments found" });
    }

    // Clean transcript text
    const cleanLines = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

    // Extract tasks using Copilot service
    const tasks = await processTranscript(cleanLines);

    // Save meeting record
    const slackThreadTs = String(Date.now() / 1000);
    await dbRun('INSERT INTO meeting_syncs (meeting_id, slack_thread_ts) VALUES (?, ?)', [meetingId, slackThreadTs]);

    // Create tickets
    const createdTickets = [];
    for (const task of tasks) {
      const ticket = await createJiraIssue(
        task.action_item,
        task.priority,
        null, // Email lookup would happen here in production
        meetingId,
        slackThreadTs
      );
      createdTickets.push(ticket);
    }

    if (createdTickets.length > 0) {
      await postSlackTaskSummary(meetingId, createdTickets);
    }

    res.json({ status: "success", processed_tasks: createdTickets.length });
  } catch (err) {
    console.error("Teams webhook failed:", err);
    res.status(500).json({ detail: err.message });
  }
});

// Jira Cloud Webhook listener
router.post('/jira', async (req, res) => {
  const { webhookEvent, issue } = req.body;

  if (webhookEvent !== 'jira:issue_updated') {
    return res.json({ status: "skipped", reason: "Ignored event" });
  }

  if (!issue || !issue.key) {
    return res.json({ status: "failed", reason: "No issue key" });
  }

  const issueKey = issue.key;
  const fields = issue.fields || {};
  const statusName = fields.status ? fields.status.name : "To Do";
  const assigneeName = fields.assignee ? fields.assignee.displayName : "Unassigned";

  try {
    const dbIssue = await dbGet('SELECT * FROM jira_issue_syncs WHERE issue_key = ?', [issueKey]);
    if (!dbIssue) {
      return res.json({ status: "skipped", reason: "Issue not tracked by connector" });
    }

    if (dbIssue.status !== statusName) {
      await dbRun(
        'UPDATE jira_issue_syncs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE issue_key = ?',
        [statusName, issueKey]
      );

      await postSlackStatusUpdate(
        issueKey,
        dbIssue.summary,
        assigneeName,
        statusName
      );

      return res.json({ status: "updated", issue_key: issueKey, new_status: statusName });
    }

    res.json({ status: "no_change" });
  } catch (err) {
    console.error("Jira webhook routing failed:", err);
    res.status(500).json({ detail: err.message });
  }
});

export default router;
