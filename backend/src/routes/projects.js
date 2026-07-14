import express from 'express';
import { Project, Sprint, Issue, IssueComment, Label, User, Workspace, WorkspaceMember } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── PROJECTS ───────────────────────────────────────────────────────────────

// GET /api/projects?workspaceId=xxx  — list projects for workspace
router.get('/', requireAuth, async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
  try {
    const projects = await Project.findAll({ where: { workspaceId } });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects — create a project
router.post('/', requireAuth, async (req, res) => {
  const { workspaceId, name, key, description, type, color, icon } = req.body;
  if (!workspaceId || !name || !key) {
    return res.status(400).json({ error: 'workspaceId, name, and key are required' });
  }
  try {
    const project = await Project.create({
      workspaceId,
      name,
      key: key.toUpperCase(),
      description: description || '',
      type: type || 'scrum',
      color: color || '#7b61ff',
      icon: icon || '📋'
    });
    // Seed default labels
    await Label.bulkCreate([
      { name: 'frontend', color: '#00b4d8', projectId: project.id },
      { name: 'backend', color: '#7b61ff', projectId: project.id },
      { name: 'bug', color: '#e74c3c', projectId: project.id },
      { name: 'enhancement', color: '#2ecc71', projectId: project.id },
      { name: 'documentation', color: '#f39c12', projectId: project.id }
    ]);
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id — get a single project with sprints
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [Sprint, Label]
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PATCH /api/projects/:id — update project
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.update(req.body);
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id — delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ─── SPRINTS ─────────────────────────────────────────────────────────────────

// GET /api/projects/:projectId/sprints
router.get('/:projectId/sprints', requireAuth, async (req, res) => {
  try {
    const sprints = await Sprint.findAll({
      where: { projectId: req.params.projectId },
      order: [['createdAt', 'ASC']]
    });
    res.json(sprints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// POST /api/projects/:projectId/sprints — create sprint
router.post('/:projectId/sprints', requireAuth, async (req, res) => {
  const { name, goal, startDate, endDate } = req.body;
  if (!name) return res.status(400).json({ error: 'Sprint name is required' });
  try {
    const sprint = await Sprint.create({
      projectId: req.params.projectId,
      name,
      goal: goal || '',
      status: 'planning',
      startDate: startDate || null,
      endDate: endDate || null
    });
    res.status(201).json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

// PATCH /api/projects/:projectId/sprints/:sprintId — update sprint (start/complete)
router.patch('/:projectId/sprints/:sprintId', requireAuth, async (req, res) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    await sprint.update(req.body);
    res.json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// ─── ISSUES ──────────────────────────────────────────────────────────────────

// GET /api/projects/:projectId/issues — list project issues
router.get('/:projectId/issues', requireAuth, async (req, res) => {
  const { status, sprintId, type } = req.query;
  const where = { projectId: req.params.projectId };
  if (status) where.status = status;
  if (sprintId) where.sprintId = sprintId;
  if (type) where.type = type;

  try {
    const issues = await Issue.findAll({
      where,
      include: [
        { model: User, as: 'Assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'Reporter', attributes: ['id', 'username', 'email'] },
        { model: Label },
        { model: Issue, as: 'SubTasks', attributes: ['id', 'key', 'title', 'status', 'type'] }
      ],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// POST /api/projects/:projectId/issues — create an issue
router.post('/:projectId/issues', requireAuth, async (req, res) => {
  const { title, description, type, priority, storyPoints, assigneeId, sprintId, dueDate, epicLink, parentIssueId } = req.body;
  if (!title) return res.status(400).json({ error: 'Issue title is required' });

  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Auto-generate issue key (e.g. UW-42)
    const issueCount = await Issue.count({ where: { projectId: req.params.projectId } });
    const key = `${project.key}-${issueCount + 1}`;

    const issue = await Issue.create({
      projectId: req.params.projectId,
      key,
      title,
      description: description || '',
      type: type || 'task',
      priority: priority || 'medium',
      storyPoints: storyPoints || null,
      assigneeId: assigneeId || null,
      reporterId: req.user.id,
      sprintId: sprintId || null,
      dueDate: dueDate || null,
      epicLink: epicLink || null,
      parentIssueId: parentIssueId || null,
      status: sprintId ? 'todo' : 'backlog',
      order: issueCount
    });

    const fullIssue = await Issue.findByPk(issue.id, {
      include: [
        { model: User, as: 'Assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'Reporter', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json(fullIssue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// GET /api/projects/:projectId/issues/:issueId — get single issue with comments
router.get('/:projectId/issues/:issueId', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId, {
      include: [
        { model: User, as: 'Assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'Reporter', attributes: ['id', 'username', 'email'] },
        { model: Label },
        { model: Issue, as: 'SubTasks' },
        {
          model: IssueComment,
          include: [{ model: User, attributes: ['id', 'username'] }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

// PATCH /api/projects/:projectId/issues/:issueId — update issue (status, assignee, sprint, etc.)
router.patch('/:projectId/issues/:issueId', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    await issue.update(req.body);
    const updated = await Issue.findByPk(issue.id, {
      include: [
        { model: User, as: 'Assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'Reporter', attributes: ['id', 'username', 'email'] },
        { model: Label }
      ]
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// DELETE /api/projects/:projectId/issues/:issueId
router.delete('/:projectId/issues/:issueId', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    await issue.destroy();
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// ─── ISSUE COMMENTS ─────────────────────────────────────────────────────────

// POST /api/projects/:projectId/issues/:issueId/comments
router.post('/:projectId/issues/:issueId/comments', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Comment body is required' });
  try {
    const comment = await IssueComment.create({
      body,
      issueId: req.params.issueId,
      userId: req.user.id
    });
    const full = await IssueComment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['id', 'username'] }]
    });
    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/projects/:projectId/issues/:issueId/comments/:commentId
router.delete('/:projectId/issues/:issueId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const comment = await IssueComment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await comment.destroy();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
