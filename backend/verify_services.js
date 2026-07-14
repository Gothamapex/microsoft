import { initDatabase, dbGet, dbAll, dbRun } from './database.js';
import { processTranscript, askCopilotAboutMeeting } from './services/copilot_service.js';
import { translateText } from './services/translation_service.js';
import { createJiraIssue } from './services/jira_service.js';
import { postSlackTaskSummary, getSlackMessages } from './services/slack_service.js';

const runTests = async () => {
  console.log("🧪 Running Node.js service verification tests (with Translation and Q&A Chat)...");
  
  try {
    // 1. Init Database
    console.log("⚙️ Initializing SQLite database...");
    await initDatabase();
    
    // 2. Ensure test user seeded
    console.log("👤 Checking user mappings...");
    const testEmail = "gowtham@company.com";
    const user = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [testEmail]);
    if (!user) {
      await dbRun(
        'INSERT INTO user_mappings (email, teams_username, teams_user_id, jira_account_id, slack_user_id) VALUES (?, ?, ?, ?, ?)',
        [testEmail, 'Gowtham', 'teams-usr-gowtham-789', 'jira-acc-gowtham-123', 'U12345_GOWTHAM']
      );
      console.log(`✅ Registered test user mapping: ${testEmail}`);
    } else {
      console.log("✅ User mapping already exists.");
    }
    
    // 3. Test Translation Service (Any-to-Any)
    console.log("🌐 Testing Any-to-Any translation engine...");
    const textToTranslate = "La base de datos se está cayendo por la tarde.";
    const translation = await translateText(textToTranslate, "English");
    if (!translation || translation === textToTranslate) {
      throw new Error(`Translation failed or did not change text: ${translation}`);
    }
    console.log(`✅ Translated: "${textToTranslate}" -> "${translation}"`);

    // 4. Test Copilot Mock Transcript Extractor (using translated text)
    console.log("🧠 Testing Copilot mock transcript extractor...");
    const sampleTranscript = `Gowtham: ${translation}\nSarah: We must also enable caching to reduce the load.`;
    const tasks = await processTranscript(sampleTranscript);
    if (tasks.length === 0) throw new Error("No tasks extracted from transcript");
    console.log(`✅ Extracted task: "${tasks[0].action_item}" (Assignee: ${tasks[0].assignee_name})`);

    // 5. Test Meeting Chat Assistant (Q&A)
    console.log("💬 Testing Meeting Q&A Chat Assistant...");
    const chatAnswer = await askCopilotAboutMeeting(sampleTranscript, "What did Gowtham agree to do?");
    if (!chatAnswer || chatAnswer.length === 0) {
      throw new Error("Chat assistant failed to return answer context");
    }
    console.log(`✅ AI Chat Response: "${chatAnswer.substring(0, 80)}..."`);

    // 6. Test Jira local creation
    console.log("📂 Testing local Jira issue sync...");
    const meetingId = "test-meeting-101";
    const slackThreadTs = "12345678.90";
    
    const ticket = await createJiraIssue(
      tasks[0].action_item,
      tasks[0].priority,
      testEmail,
      meetingId,
      slackThreadTs
    );
    if (!ticket.issue_key.startsWith("SYNC-")) throw new Error("Invalid ticket key generated");
    console.log(`✅ Local Jira ticket logged: ${ticket.issue_key}`);

    // 7. Test Slack broadcasting logs
    console.log("💬 Testing Slack block layout feed compiler...");
    await postSlackTaskSummary(meetingId, [ticket]);
    const messages = await getSlackMessages();
    if (messages.length === 0) throw new Error("Slack logs were not written to DB");
    console.log(`✅ Slack message queued in channel. Latest text: ${messages[0].text.substring(0, 45)}...`);
    
    console.log("\n🏆 Node.js Verification Tests Passed Successfully!");
    process.exit(0);
  } catch (err) {
    console.error(`❌ Verification failed: ${err.message}`);
    process.exit(1);
  }
};

runTests();
