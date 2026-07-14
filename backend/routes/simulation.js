import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';
import { processTranscript, askCopilotAboutMeeting } from '../services/copilot_service.js';
import { translateText } from '../services/translation_service.js';
import { createJiraIssue, updateJiraStatusInDb } from '../services/jira_service.js';
import { postSlackTaskSummary, postSlackStatusUpdate, getSlackMessages } from '../services/slack_service.js';

const router = express.Router();

// Retrieve all simulated board tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await dbAll('SELECT * FROM jira_issue_syncs ORDER BY created_at DESC');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Retrieve simulated slack logs feed
router.get('/slack', async (req, res) => {
  try {
    const messages = await getSlackMessages();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Run Any-to-Any text translation
router.post('/translate', async (req, res) => {
  const { text, target_language } = req.body;
  if (!text || !target_language) {
    return res.status(400).json({ detail: "text and target_language parameters are required" });
  }

  try {
    const translated = await translateText(text, target_language);
    res.json({ translated });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Contextual Meeting Chat Assistant Q&A endpoint
router.post('/chat', async (req, res) => {
  const { transcript, question } = req.body;
  if (!transcript || !question) {
    return res.status(400).json({ detail: "transcript array and question string are required" });
  }

  try {
    const cleanLines = transcript.map(s => `${s.speaker}: ${s.text}`).join('\n');
    const answer = await askCopilotAboutMeeting(cleanLines, question);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Run end-to-end webhook simulator pipeline
router.post('/process', async (req, res) => {
  const { meeting_id, transcript } = req.body;
  if (!meeting_id || !transcript) {
    return res.status(400).json({ detail: "meeting_id and transcript array are required" });
  }

  try {
    // 1. Format the speech transcript
    const cleanLines = transcript.map(s => `${s.speaker}: ${s.text}`).join('\n');

    // 2. Feed it to the Copilot task extraction engine
    const tasks = await processTranscript(cleanLines);

    // 3. Prevent duplicate meetings sync
    let meeting = await dbGet('SELECT * FROM meeting_syncs WHERE meeting_id = ?', [meeting_id]);
    const slackThreadTs = String(Date.now() / 1000);

    if (meeting) {
      await dbRun('UPDATE meeting_syncs SET processed_at = CURRENT_TIMESTAMP WHERE meeting_id = ?', [meeting_id]);
    } else {
      await dbRun('INSERT INTO meeting_syncs (meeting_id, slack_thread_ts) VALUES (?, ?)', [meeting_id, slackThreadTs]);
    }

    // 4. Resolve users & Create Jira issues
    const syncResults = [];
    for (const task of tasks) {
      const assigneeName = task.assignee_name || "";
      
      // Attempt directory lookups
      const userMapping = await dbGet(
        "SELECT * FROM user_mappings WHERE teams_username LIKE ? OR email LIKE ?",
        [`%${assigneeName}%`, `${assigneeName.toLowerCase()}%`]
      );

      const email = userMapping ? userMapping.email : `${assigneeName.toLowerCase()}@company.com`;

      // Create issue key log
      const syncRes = await createJiraIssue(
        task.action_item,
        task.priority,
        email,
        meeting_id,
        slackThreadTs
      );
      syncResults.push(syncRes);
    }

    // 5. Post block layout notification to Slack feed
    if (syncResults.length > 0) {
      await postSlackTaskSummary(meeting_id, syncResults);
    }

    res.json({
      meeting_id,
      tasks_processed: syncResults.length,
      tasks: syncResults
    });
  } catch (err) {
    console.error("Simulation process endpoint failed:", err);
    res.status(500).json({ detail: err.message });
  }
});

// Transition ticket status (Simulates Jira Webhook update callback trigger)
router.post('/transition/:issue_key', async (req, res) => {
  const { issue_key } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ detail: "status is required" });
  }

  try {
    const issue = await dbGet('SELECT * FROM jira_issue_syncs WHERE issue_key = ?', [issue_key]);
    if (!issue) {
      return res.status(404).json({ detail: "Jira ticket not found" });
    }

    // Update status in local SQLite DB
    const updated = await updateJiraStatusInDb(issue_key, status);

    // Push Slack status transition alert
    await postSlackStatusUpdate(
      issue_key,
      updated.summary,
      updated.assignee_name || "Unassigned",
      status
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Reset simulation states (Clear board logs and slack histories)
router.post('/reset', async (req, res) => {
  try {
    await dbRun('DELETE FROM jira_issue_syncs');
    await dbRun('DELETE FROM meeting_syncs');
    await dbRun('DELETE FROM slack_message_logs');
    res.json({ status: "success", message: "Simulation logs and data reset successfully" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Manually create a Jira ticket from the board UI
router.post('/create-ticket', async (req, res) => {
  const { summary, priority = 'MEDIUM', assignee_name = '' } = req.body;
  if (!summary || !summary.trim()) {
    return res.status(400).json({ detail: "summary is required" });
  }

  try {
    // Find user mapping if assignee supplied
    let email = assignee_name ? `${assignee_name.toLowerCase()}@company.com` : null;
    if (assignee_name) {
      const userMapping = await dbGet(
        "SELECT * FROM user_mappings WHERE teams_username LIKE ? OR email LIKE ?",
        [`%${assignee_name}%`, `${assignee_name.toLowerCase()}%`]
      );
      if (userMapping) email = userMapping.email;
    }

    const result = await createJiraIssue(summary.trim(), priority.toUpperCase(), email, 'manual-create', null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;

