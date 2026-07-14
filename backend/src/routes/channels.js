import express from 'express';
import { Channel } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get channels inside a workspace
router.get('/workspace/:workspaceId', requireAuth, async (req, res) => {
  try {
    const channels = await Channel.findAll({
      where: { workspaceId: req.params.workspaceId }
    });
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Create a new channel
router.post('/workspace/:workspaceId', requireAuth, async (req, res) => {
  const { name, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name is required' });

  // Clean name: lower-case alphanumeric-dash
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

  try {
    const channel = await Channel.create({
      name: cleanName,
      isPrivate: !!isPrivate,
      workspaceId: req.params.workspaceId
    });
    res.status(201).json(channel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

export default router;
