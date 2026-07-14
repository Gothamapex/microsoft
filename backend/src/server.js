import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { initDb, sequelize, User, Workspace, WorkspaceMember, Channel, Message, Project, Sprint, Issue } from './config/database.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import projectRoutes from './routes/projects.js';
import { handleSocketConnections } from './services/socket.js';
import { askCopilotAboutChat } from './services/ai.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/projects', projectRoutes);

// AI Chat Assistance endpoint
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  const { channelId, question } = req.body;
  if (!channelId || !question) {
    return res.status(400).json({ error: 'Channel ID and question are required' });
  }

  try {
    const messages = await Message.findAll({
      where: { channelId, parentId: null },
      limit: 30,
      order: [['createdAt', 'DESC']]
    });
    // Reverse messages to chronological order
    messages.reverse();

    const answer = await askCopilotAboutChat(messages, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// Seed mock data
const seedDatabase = async () => {
  try {
    // 1. Check if user already exists
    const userCount = await User.count();
    if (userCount > 0) return;

    console.log('🌱 Seeding default UnifyWork databases...');
    
    // Hash passwords
    const hashed = await bcrypt.hash('password123', 10);

    // Create users
    const gowtham = await User.create({ email: 'gowtham@company.com', password: hashed, username: 'Gowtham' });
    const sarah = await User.create({ email: 'sarah@company.com', password: hashed, username: 'Sarah' });
    const alex = await User.create({ email: 'alex@company.com', password: hashed, username: 'Alex' });

    // Create workspace
    const workspace = await Workspace.create({ name: 'UnifyWork Dev', slug: 'unifywork-dev' });

    // Add members
    await WorkspaceMember.create({ workspaceId: workspace.id, userId: gowtham.id, role: 'admin' });
    await WorkspaceMember.create({ workspaceId: workspace.id, userId: sarah.id, role: 'member' });
    await WorkspaceMember.create({ workspaceId: workspace.id, userId: alex.id, role: 'member' });

    // Create channels
    const general = await Channel.create({ name: 'general', workspaceId: workspace.id, isPrivate: false });
    const sprintSync = await Channel.create({ name: 'sprint-sync', workspaceId: workspace.id, isPrivate: false });

    // Seed mock chats in #general
    await Message.create({
      channelId: general.id,
      userId: gowtham.id,
      username: 'Gowtham',
      text: 'Hi team, let’s coordinate the database deployment checklist here.'
    });

    await Message.create({
      channelId: general.id,
      userId: sarah.id,
      username: 'Sarah',
      text: 'We must enable caching to reduce the load. I will configure the Redis cache by Friday.'
    });

    await Message.create({
      channelId: general.id,
      userId: alex.id,
      username: 'Alex',
      text: 'Sounds good. I will run the load test sequences and share results on Slack.'
    });

    // ── Phase 2: Seed default Project, Sprint, Issues ─────────────────────
    const project = await Project.create({
      workspaceId: workspace.id,
      name: 'UnifyWork Platform',
      key: 'UW',
      description: 'Main development project for the UnifyWork unified platform.',
      type: 'scrum',
      color: '#7b61ff',
      icon: '🚀'
    });

    const sprint = await Sprint.create({
      projectId: project.id,
      name: 'Sprint 1 – Core Platform',
      goal: 'Set up auth, chat, and issue tracking foundations',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
    });

    // Seed sample issues
    const epics = [
      { key: 'UW-1', title: 'User Auth & Onboarding', type: 'epic', status: 'in_progress', priority: 'highest', storyPoints: 13 },
      { key: 'UW-2', title: 'Real-time Chat System', type: 'epic', status: 'in_progress', priority: 'highest', storyPoints: 21 }
    ];
    const epicObjs = await Promise.all(epics.map(e => Issue.create({
      ...e, projectId: project.id, sprintId: sprint.id, reporterId: gowtham.id, assigneeId: gowtham.id
    })));

    await Issue.create({
      key: 'UW-3', title: 'Login page UI', type: 'story', status: 'done',
      priority: 'high', storyPoints: 5, projectId: project.id, sprintId: sprint.id,
      reporterId: gowtham.id, assigneeId: sarah.id, epicLink: epicObjs[0].id
    });
    await Issue.create({
      key: 'UW-4', title: 'JWT token refresh logic', type: 'task', status: 'in_progress',
      priority: 'high', storyPoints: 3, projectId: project.id, sprintId: sprint.id,
      reporterId: sarah.id, assigneeId: alex.id, epicLink: epicObjs[0].id
    });
    await Issue.create({
      key: 'UW-5', title: 'Fix: session expires on refresh', type: 'bug', status: 'todo',
      priority: 'highest', storyPoints: 2, projectId: project.id, sprintId: sprint.id,
      reporterId: alex.id, assigneeId: sarah.id
    });
    await Issue.create({
      key: 'UW-6', title: 'WebSocket channel rooms', type: 'story', status: 'in_review',
      priority: 'high', storyPoints: 8, projectId: project.id, sprintId: sprint.id,
      reporterId: gowtham.id, assigneeId: gowtham.id, epicLink: epicObjs[1].id
    });
    await Issue.create({
      key: 'UW-7', title: 'Message threading (reply-to)', type: 'task', status: 'done',
      priority: 'medium', storyPoints: 5, projectId: project.id, sprintId: sprint.id,
      reporterId: sarah.id, assigneeId: sarah.id, epicLink: epicObjs[1].id
    });
    await Issue.create({
      key: 'UW-8', title: 'AI Copilot integration', type: 'story', status: 'todo',
      priority: 'medium', storyPoints: 8, projectId: project.id, sprintId: sprint.id,
      reporterId: gowtham.id, assigneeId: gowtham.id
    });
    await Issue.create({
      key: 'UW-9', title: 'Multilingual translation support', type: 'story', status: 'backlog',
      priority: 'medium', storyPoints: 5, projectId: project.id, reporterId: alex.id
    });

    console.log('✅ Default databases seeded successfully.');
  } catch (err) {
    console.error('❌ Failed to seed databases:', err);
  }
};

// Start Server
const PORT = process.env.PORT || 8000;
const startServer = async () => {
  await initDb();
  await seedDatabase();

  handleSocketConnections(io);

  server.listen(PORT, () => {
    console.log(`🚀 UnifyWork backend server active on port ${PORT}`);
  });
};

startServer();
