import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';

const router = express.Router();

// Get all mappings
router.get('/', async (req, res) => {
  try {
    const users = await dbAll('SELECT * FROM user_mappings');
    res.json(users);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Create mapping
router.post('/', async (req, res) => {
  const { email, teams_username, teams_user_id, jira_account_id, slack_user_id } = req.body;
  if (!email) {
    return res.status(400).json({ detail: "Email is required" });
  }

  try {
    const existing = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ detail: "User mapping already exists" });
    }

    await dbRun(
      'INSERT INTO user_mappings (email, teams_username, teams_user_id, jira_account_id, slack_user_id) VALUES (?, ?, ?, ?, ?)',
      [email, teams_username, teams_user_id, jira_account_id, slack_user_id]
    );

    const newUser = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [email]);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Update mapping
router.put('/:email', async (req, res) => {
  const { email } = req.params;
  const { teams_username, teams_user_id, jira_account_id, slack_user_id } = req.body;

  try {
    const existing = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [email]);
    if (!existing) {
      return res.status(404).json({ detail: "User mapping not found" });
    }

    await dbRun(
      `UPDATE user_mappings 
       SET teams_username = ?, teams_user_id = ?, jira_account_id = ?, slack_user_id = ? 
       WHERE email = ?`,
      [teams_username, teams_user_id, jira_account_id, slack_user_id, email]
    );

    const updatedUser = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [email]);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Delete mapping
router.delete('/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const existing = await dbGet('SELECT * FROM user_mappings WHERE email = ?', [email]);
    if (!existing) {
      return res.status(404).json({ detail: "User mapping not found" });
    }

    await dbRun('DELETE FROM user_mappings WHERE email = ?', [email]);
    res.json({ message: `Mapping for ${email} deleted successfully` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
