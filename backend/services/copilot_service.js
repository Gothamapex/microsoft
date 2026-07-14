import OpenAI from 'openai';
import { config } from '../config.js';

const SYSTEM_PROMPT = `
You are an advanced AI assistant integrated into a Microsoft Teams, Jira, and Slack connector.
Your task is to analyze the provided meeting transcript segments.
Identify explicit action items, tasks, and commitments made by the speakers.

For each task, extract:
1. "action_item": Clear summary of the work agreed to be done.
2. "assignee_name": The speaker's name or the person mentioned who agreed/was assigned to do it (keep it short, e.g. "Gowtham").
3. "deadline_hint": Any relative or absolute time frame mentioned (e.g. "by tonight", "next Friday", "none").
4. "priority": Determine if the task is "HIGH", "MEDIUM", or "LOW" based on urgency and phrasing.

Return a valid JSON object matching this schema exactly:
{
  "tasks": [
    {
      "action_item": "String",
      "assignee_name": "String",
      "deadline_hint": "String",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}
`;

async function extractTasksLive(transcriptText) {
  if (!config.openaiApiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiApiBase
  });

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this meeting transcript:\n\n${transcriptText}` }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const result = response.choices[0].message.content;
  try {
    const data = JSON.parse(result);
    return data.tasks || [];
  } catch (e) {
    console.error("Error parsing LLM response:", e);
    return [];
  }
}

function extractTasksMock(transcriptText) {
  const text = transcriptText.toLowerCase();

  // Incident Review script match
  if (text.includes("transaction lock") && text.includes("pool size")) {
    return [
      {
        action_item: "Optimize transaction lock order in user-service and limit the connection pool size to 20",
        assignee_name: "Gowtham",
        deadline_hint: "by tonight",
        priority: "HIGH"
      },
      {
        action_item: "Create a Grafana dashboard monitoring connection pool metrics and database CPU load",
        assignee_name: "Sarah",
        deadline_hint: "before tomorrow's standup",
        priority: "MEDIUM"
      }
    ];
  }

  // Sprint Planning script match
  if (text.includes("marketing api") || text.includes("stripe webhook")) {
    return [
      {
        action_item: "Fix Stripe webhook retry failures and handle duplicate events",
        assignee_name: "Alex",
        deadline_hint: "by Friday",
        priority: "HIGH"
      },
      {
        action_item: "Implement the marketing campaigns analytics reporting API",
        assignee_name: "Gowtham",
        deadline_hint: "next Wednesday",
        priority: "MEDIUM"
      }
    ];
  }

  // Basic regex fallback parser
  const tasks = [];
  const lines = transcriptText.split('\n');
  let currentSpeaker = 'Unknown';

  for (const line of lines) {
    if (line.includes(':')) {
      const parts = line.split(':');
      currentSpeaker = parts[0].trim();
      const sentence = parts.slice(1).join(':').trim();
      processSentence(sentence, currentSpeaker, tasks);
    } else {
      processSentence(line.trim(), currentSpeaker, tasks);
    }
  }

  if (tasks.length === 0) {
    tasks.push({
      action_item: "Review discussion points from meeting transcript",
      assignee_name: currentSpeaker !== 'Unknown' ? currentSpeaker : 'Attendee',
      deadline_hint: "by next sync",
      priority: "LOW"
    });
  }

  return tasks;
}

function processSentence(text, speaker, tasks) {
  if (!text) return;
  
  // Match "I'll...", "I will...", "Let me...", "I'm going to..."
  const matchSelf = text.match(/\b(i'll|i will|let me|i am going to|i'm going to)\s+([^.?!,]+)/i);
  if (matchSelf) {
    const action = matchSelf[2].trim();
    let deadline = "none";
    let priority = "MEDIUM";

    for (const keyword of ["today", "tonight", "tomorrow", "friday", "monday", "next week"]) {
      if (text.toLowerCase().includes(keyword)) {
        deadline = keyword;
        break;
      }
    }

    if (text.toLowerCase().includes("urgent") || text.toLowerCase().includes("asap") || text.toLowerCase().includes("critical")) {
      priority = "HIGH";
    } else if (text.toLowerCase().includes("low priority") || text.toLowerCase().includes("sometime")) {
      priority = "LOW";
    }

    tasks.push({
      action_item: action.charAt(0).toUpperCase() + action.slice(1),
      assignee_name: speaker,
      deadline_hint: deadline,
      priority: priority
    });
  }
}

export async function processTranscript(transcriptText) {
  if (config.useMockApis) {
    return extractTasksMock(transcriptText);
  } else {
    try {
      return await extractTasksLive(transcriptText);
    } catch (e) {
      console.warn("Live OpenAI extraction failed, falling back to mock:", e.message);
      return extractTasksMock(transcriptText);
    }
  }
}

async function askCopilotLive(transcriptText, question) {
  if (!config.openaiApiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiApiBase
  });

  const prompt = `You are a helpful AI meeting assistant.
Below is the transcript of a meeting:
----
${transcriptText}
----

Answer the user's question about the meeting context accurately, concisely, and based only on the details mentioned in the transcript.
Question: ${question}`;

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: "system", content: "You are a helpful meeting Q&A assistant." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return response.choices[0].message.content.trim();
}

function askCopilotMock(transcriptText, question) {
  const q = question.toLowerCase();
  const t = transcriptText.toLowerCase();

  // Rules-based smart sandbox answers
  if (q.includes("pool") || q.includes("database") || q.includes("lock") || q.includes("limit")) {
    return "Based on the meeting transcript, Gowtham agreed to optimize the transaction lock order in the user-service and limit the database connection pool size to 20 by tonight. Sarah will set up a Grafana dashboard monitoring connection pool metrics and database CPU load.";
  }
  if (q.includes("gowtham")) {
    return "Gowtham committed to optimizing the transaction lock order in the user-service and limiting the connection pool size to 20 by tonight. In the sprint plan script, he also agreed to implement the marketing campaigns analytics reporting API by next Wednesday.";
  }
  if (q.includes("sarah")) {
    return "Sarah committed to creating a Grafana dashboard to monitor database connection pool metrics and database CPU load before tomorrow's standup. In the multilingual script, she also agreed to configure the Redis cache by Friday.";
  }
  if (q.includes("alex")) {
    return "Alex agreed to fix Stripe webhook retry failures and handle duplicate events by Friday. In the incident review script, he also committed to reviewing and merging Gowtham's pull request once submitted.";
  }
  if (q.includes("caching") || q.includes("redis")) {
    return "In the microservices planning meeting, Sarah mentioned they need to enable caching to reduce database load, and she committed to configuring the Redis cache by Friday.";
  }
  if (q.includes("load test") || q.includes("test")) {
    return "Alex agreed to share the load testing results directly on Slack to keep the engineering team updated.";
  }
  if (q.includes("action") || q.includes("task") || q.includes("todo") || q.includes("commit")) {
    return "Here are the key action items decided:\n1. Gowtham: Optimize transaction lock order and set pool limit to 20 (by tonight).\n2. Sarah: Create Grafana dashboard for pool metrics (by tomorrow).\n3. Alex: Review Gowtham's pull request, or fix Stripe webhook retry failures.";
  }

  return "I've analyzed the meeting transcript. It shows a collaboration between Gowtham, Sarah, and Alex regarding microservices architectures, addressing connection exhaustion issues by limiting pool size to 20, configuring Redis caching, and setting up Grafana monitors.";
}

export async function askCopilotAboutMeeting(transcriptText, question) {
  if (config.useMockApis) {
    return askCopilotMock(transcriptText, question);
  } else {
    try {
      return await askCopilotLive(transcriptText, question);
    } catch (e) {
      console.warn("Live OpenAI Q&A failed, falling back to mock:", e.message);
      return askCopilotMock(transcriptText, question);
    }
  }
}

