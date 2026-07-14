import axios from 'axios';
import { config } from '../config.js';
import { dbRun, dbAll } from '../database.js';

async function postToSlackLive(webhookUrl, text, blocks) {
  const payload = { text };
  if (blocks) payload.blocks = blocks;

  await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function postSlackTaskSummary(meetingId, tasks, channel = "engineering-sync") {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎙️ *Meeting Tasks Synchronized*\nFrom Teams Meeting: \`${meetingId.substring(0, 8)}...\``
      }
    },
    { type: "divider" }
  ];

  const simpleLines = [];
  for (const task of tasks) {
    const key = task.issue_key || "SYNC-PENDING";
    const summary = task.summary || "Unnamed Task";
    const assignee = task.assignee_name || "Unassigned";
    const priority = task.priority || "MEDIUM";

    const emoji = priority.toUpperCase() === "HIGH" ? "🔴" : priority.toUpperCase() === "MEDIUM" ? "🟡" : "🟢";
    const line = `• *${key}* - ${summary}\n   👤 Assignee: *${assignee}* | Priority: ${emoji} *${priority}*`;
    simpleLines.push(line);

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: line
      }
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Synced automatically at ${new Date().toISOString().replace('T', ' ').substring(11, 19)} UTC`
      }
    ]
  });

  const combinedText = `New tasks synchronized from meeting:\n` + simpleLines.join('\n');

  if (!config.useMockApis && config.slackWebhookUrl) {
    try {
      await postToSlackLive(config.slackWebhookUrl, combinedText, blocks);
    } catch (e) {
      console.error("Live Slack summary dispatch failed:", e.message);
    }
  }

  // Save to Slack Message Log table
  await dbRun(
    'INSERT INTO slack_message_logs (channel, text, blocks_json, meeting_id) VALUES (?, ?, ?, ?)',
    [channel, combinedText, JSON.stringify(blocks), meetingId]
  );

  return "ok";
}

export async function postSlackStatusUpdate(issueKey, summary, assigneeName, status, channel = "engineering-sync") {
  const statusEmoji = status.toLowerCase() === "done" ? "✅" : status.toLowerCase() === "in progress" ? "🔄" : "📋";
  const text = `${statusEmoji} *Jira Board Update:* \`${issueKey}\` moved to *${status}* (Assignee: ${assigneeName})`;

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusEmoji} *Jira Board Update:* \`${issueKey}\` is now *${status}*`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Task:* ${summary} | *Assignee:* ${assigneeName}`
        }
      ]
    }
  ];

  if (!config.useMockApis && config.slackWebhookUrl) {
    try {
      await postToSlackLive(config.slackWebhookUrl, text, blocks);
    } catch (e) {
      console.error("Live Slack update dispatch failed:", e.message);
    }
  }

  await dbRun(
    'INSERT INTO slack_message_logs (channel, text, blocks_json, meeting_id) VALUES (?, ?, ?, ?)',
    [channel, text, JSON.stringify(blocks), null]
  );

  return "ok";
}

export async function getSlackMessages(limit = 20) {
  const rows = await dbAll('SELECT * FROM slack_message_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
  return rows.map(r => ({
    id: r.id,
    channel: r.channel,
    text: r.text,
    blocks: r.blocks_json ? JSON.parse(r.blocks_json) : [],
    timestamp: r.timestamp,
    meeting_id: r.meeting_id
  }));
}
