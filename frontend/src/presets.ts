import type { ScenarioPreset } from './types';

export const PRESETS: ScenarioPreset[] = [
  {
    name: "🚨 Incident Review: Database Lock Exhaustion",
    description: "Sarah, Gowtham, and Alex discuss a production outage caused by transaction locks and database pool exhaustion.",
    meetingId: "mtg-incident-review-404",
    transcript: [
      { speaker: "Gowtham", text: "Hi team, let's look at the outage that happened early today. It seems we are seeing major transaction lock issues in the user-service database and database pool exhaustion." },
      { speaker: "Sarah", text: "Yes, I analyzed the logs. The connection pool gets filled up with blocked transactions, causing everything else to timeout." },
      { speaker: "Sarah", text: "We must limit the connection pool size to 20 to prevent total DB crashes under load." },
      { speaker: "Gowtham", text: "Okay, that makes sense. I will optimize the transaction lock order in user-service and limit the connection pool size to 20 by tonight." },
      { speaker: "Sarah", text: "Great. Let me create a Grafana dashboard monitoring connection pool metrics and database CPU load before tomorrow's standup so we can track pool status." },
      { speaker: "Alex", text: "I can help review the code modifications. I will review and merge Gowtham's pull request once it's submitted." },
      { speaker: "Gowtham", text: "Perfect. I'll tag you both on Slack once my PR is up. Let's make sure we deploy these changes tonight." }
    ]
  },
  {
    name: "📅 Sprint 3 Planning: Integrations & Marketing",
    description: "Alex and Gowtham coordinate on fixing billing issues and building marketing dashboard integrations.",
    meetingId: "mtg-sprint3-planning-987",
    transcript: [
      { speaker: "Alex", text: "Thanks for joining. For the new sprint, we have some webhook retry issues causing duplicate customer subscriptions in Stripe." },
      { speaker: "Alex", text: "I'll fix Stripe webhook retry failures and handle duplicate events by Friday so our accounts stay accurate." },
      { speaker: "Gowtham", text: "That is urgent. Also, we promised marketing the dashboards. I will implement the marketing campaigns analytics reporting API by next Wednesday so they can query campaign reports." },
      { speaker: "Sarah", text: "I can build the dashboard charts once that API is ready. I'll handle the front-end layout for analytics reports." },
      { speaker: "Alex", text: "Awesome. Let's make sure we log all tasks in Jira and notify the core channel in Slack so developers can see what's planned." }
    ]
  }
];
