import sqlite3 from 'sqlite3';
import { config } from './config.js';

// Open or create the database
const db = new sqlite3.Database(config.databaseFile, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite:', err.message);
  } else {
    console.log('📦 Connected to SQLite database:', config.databaseFile);
  }
});

// Helper wrapper to run queries as promises
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize schema and seed data
export const initDatabase = async () => {
  // Create Tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_mappings (
      email TEXT PRIMARY KEY,
      teams_username TEXT,
      teams_user_id TEXT,
      jira_account_id TEXT,
      slack_user_id TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS meeting_syncs (
      meeting_id TEXT PRIMARY KEY,
      slack_thread_ts TEXT,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS jira_issue_syncs (
      issue_key TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'MEDIUM',
      assignee_name TEXT,
      assignee_email TEXT,
      status TEXT DEFAULT 'To Do',
      meeting_id TEXT,
      slack_thread_ts TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS slack_message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT DEFAULT 'general',
      text TEXT NOT NULL,
      blocks_json TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      meeting_id TEXT
    )
  `);

  // Seed default mapping profiles if table is empty
  const users = await dbAll('SELECT * FROM user_mappings');
  if (users.length === 0) {
    console.log('👤 Seeding default identity mappings...');
    const defaults = [
      ['gowtham@company.com', 'Gowtham', 'teams-usr-gowtham-789', 'jira-acc-gowtham-123', 'U12345_GOWTHAM'],
      ['sarah@company.com', 'Sarah', 'teams-usr-sarah-456', 'jira-acc-sarah-789', 'U67890_SARAH'],
      ['alex@company.com', 'Alex', 'teams-usr-alex-123', 'jira-acc-alex-456', 'U34567_ALEX']
    ];
    for (const row of defaults) {
      await dbRun(
        'INSERT INTO user_mappings (email, teams_username, teams_user_id, jira_account_id, slack_user_id) VALUES (?, ?, ?, ?, ?)',
        row
      );
    }
  }
};

export default db;
