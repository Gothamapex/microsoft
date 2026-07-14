import dotenv from 'dotenv';
dotenv.config();

export const config = {
  appName: "Teams-Jira-Slack Connector",
  port: process.env.PORT || 8000,
  databaseFile: "./connector.db",
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  openaiApiBase: process.env.OPENAI_API_BASE || "https://api.openai.com/v1",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
  jiraUrl: process.env.JIRA_URL || null,
  jiraEmail: process.env.JIRA_EMAIL || null,
  jiraApiToken: process.env.JIRA_API_TOKEN || null,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || null,
  slackBotToken: process.env.SLACK_BOT_TOKEN || null,
  useMockApis: !process.env.OPENAI_API_KEY
};
