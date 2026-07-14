import express from 'express';
import { Workspace, WorkspaceMember, Channel, User } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get current user's workspaces
router.get('/', requireAuth, async (req, res) => {
  try {
    const members = await WorkspaceMember.findAll({
      where: { userId: req.user.id },
      include: [Workspace]
    });
    const workspaces = members.map(m => m.Workspace);
    res.json(workspaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Create a new workspace
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Workspace name is required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 10000);

  try {
    const workspace = await Workspace.create({ name, slug });
    
    // Add creator as Admin
    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: req.user.id,
      role: 'admin'
    });

    // Create default #general channel
    await Channel.create({
      name: 'general',
      workspaceId: workspace.id,
      isPrivate: false
    });

    res.status(201).json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get workspace members list
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const members = await WorkspaceMember.findAll({
      where: { workspaceId: req.params.id },
      include: [{ model: User, attributes: ['id', 'username', 'email', 'presence'] }]
    });
    res.json(members.map(m => m.User));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workspace members' });
  }
});

export default router;
