import fetch from 'node-fetch';

const backendUrl = 'http://localhost:8000';

const runTests = async () => {
  console.log("🧪 Running UnifyWork Phase 1 Verification Tests...");
  
  const testEmail = `testuser-${Math.floor(Math.random() * 10000)}@unify.com`;
  const testPassword = 'Password123';
  const testUsername = 'TestDeveloper';
  let token = '';
  let userId = '';
  let workspaceId = '';
  let channelId = '';
  let messageId = '';

  try {
    // 1. Sign Up
    console.log("👤 Testing Signup Endpoint...");
    const signupRes = await fetch(`${backendUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, username: testUsername })
    });
    const signupData = await signupRes.json();
    if (!signupRes.ok) throw new Error(`Signup failed: ${signupData.error}`);
    token = signupData.token;
    userId = signupData.user.id;
    console.log(`✅ Signup success. Token length: ${token.length}`);

    // 2. Login
    console.log("👤 Testing Login Endpoint...");
    const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${loginData.error}`);
    console.log(`✅ Login success for: ${loginData.user.username}`);

    // 3. Create Workspace
    console.log("📁 Testing Workspace Creation...");
    const wsRes = await fetch(`${backendUrl}/api/workspaces`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'Unify Testing Suite' })
    });
    const wsData = await wsRes.json();
    if (!wsRes.ok) throw new Error(`Workspace creation failed: ${wsData.error}`);
    workspaceId = wsData.id;
    console.log(`✅ Workspace "${wsData.name}" created (slug: ${wsData.slug})`);

    // 4. Fetch Channels
    console.log("💬 Testing Channel List fetch...");
    const chanRes = await fetch(`${backendUrl}/api/channels/workspace/${workspaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chanData = await chanRes.json();
    if (!chanRes.ok) throw new Error(`Fetch channels failed: ${chanData.error}`);
    console.log(`✅ Found channels: ${chanData.map(c => c.name).join(', ')}`);
    channelId = chanData[0].id; // Default #general channel

    // 5. Test Dynamic Translation API
    console.log("🌐 Testing Any-to-Any Translation logic...");
    // Create a mock message to translate
    const seedMsgRes = await fetch(`${backendUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        channelId,
        text: 'Ich werde den Redis-Cache bis Freitag konfigurieren.'
      })
    });
    const seedMsgData = await seedMsgRes.json();
    if (!seedMsgRes.ok) throw new Error(`Seeding message failed: ${seedMsgData.error}`);
    messageId = seedMsgData.id;
    console.log(`✅ Posted message: "${seedMsgData.text}" (ID: ${messageId})`);

    // Translate it
    const transRes = await fetch(`${backendUrl}/api/messages/translate/${messageId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetLanguage: 'English' })
    });
    const transData = await transRes.json();
    if (!transRes.ok) throw new Error(`Translate query failed: ${transData.error}`);
    console.log(`✅ Translated message: "${seedMsgData.text}" -> "${transData.translated}"`);

    // 6. Test AI Copilot summary chat response
    console.log("🧠 Testing AI Copilot chat summary response...");
    const aiRes = await fetch(`${backendUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ channelId, question: 'Who is configuring the Redis cache?' })
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(`AI Chat failed: ${aiData.error}`);
    console.log(`✅ AI Chat Response: "${aiData.answer}"`);

    console.log("\n🏆 UnifyWork Phase 1 Verification Tests Passed Successfully!");
    process.exit(0);
  } catch (err) {
    console.error(`❌ Verification failed: ${err.message}`);
    process.exit(1);
  }
};

runTests();
