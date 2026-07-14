import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initializing SQLite database instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../unifywork.db'),
  logging: false
});

// User Model
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  presence: {
    type: DataTypes.ENUM('online', 'away', 'dnd'),
    defaultValue: 'online'
  }
});

// Workspace Model
export const Workspace = sequelize.define('Workspace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

// Workspace Member Join Model
export const WorkspaceMember = sequelize.define('WorkspaceMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'member', 'guest'),
    defaultValue: 'member'
  }
});

// Channel Model
export const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Message Model (supporting threads)
export const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  translatedText: {
    type: DataTypes.TEXT, // Storing translation caches as JSON strings
    allowNull: true
  }
});

// Reaction Model
export const Reaction = sequelize.define('Reaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  emoji: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Associations
User.hasMany(WorkspaceMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
WorkspaceMember.belongsTo(User, { foreignKey: 'userId' });

Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspaceId' });

Workspace.hasMany(Channel, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
Channel.belongsTo(Workspace, { foreignKey: 'workspaceId' });

Channel.hasMany(Message, { foreignKey: 'channelId', onDelete: 'CASCADE' });
Message.belongsTo(Channel, { foreignKey: 'channelId' });

User.hasMany(Message, { foreignKey: 'userId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId' });

// Self-referential association for message threading
Message.hasMany(Message, { as: 'Replies', foreignKey: 'parentId', onDelete: 'CASCADE' });
Message.belongsTo(Message, { as: 'Parent', foreignKey: 'parentId' });

Message.hasMany(Reaction, { foreignKey: 'messageId', onDelete: 'CASCADE' });
Reaction.belongsTo(Message, { foreignKey: 'messageId' });

User.hasMany(Reaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
Reaction.belongsTo(User, { foreignKey: 'userId' });

export const initDb = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ UnifyWork SQLite DB synchronised successfully.');
  } catch (error) {
    console.error('❌ Database sync failure:', error);
    throw error;
  }
};

export { sequelize };

// ==========================================
// Phase 2: Project & Issue Tracking Models
// ==========================================

// Project Model (Jira "Project")
export const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  key: { type: DataTypes.STRING, allowNull: false }, // e.g. "UW", "BE", "FE"
  description: { type: DataTypes.TEXT, allowNull: true },
  type: {
    type: DataTypes.ENUM('scrum', 'kanban'),
    defaultValue: 'scrum'
  },
  color: { type: DataTypes.STRING, defaultValue: '#7b61ff' },
  icon: { type: DataTypes.STRING, defaultValue: '📋' }
});

// Sprint Model (Jira "Sprint")
export const Sprint = sequelize.define('Sprint', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  goal: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('planning', 'active', 'completed'),
    defaultValue: 'planning'
  },
  startDate: { type: DataTypes.DATE, allowNull: true },
  endDate: { type: DataTypes.DATE, allowNull: true }
});

// Issue Model (Jira "Issue")
export const Issue = sequelize.define('Issue', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false }, // e.g. "UW-1", "UW-2"
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  type: {
    type: DataTypes.ENUM('story', 'task', 'bug', 'epic', 'subtask'),
    defaultValue: 'task'
  },
  status: {
    type: DataTypes.ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done'),
    defaultValue: 'backlog'
  },
  priority: {
    type: DataTypes.ENUM('lowest', 'low', 'medium', 'high', 'highest'),
    defaultValue: 'medium'
  },
  storyPoints: { type: DataTypes.INTEGER, allowNull: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 }, // for drag-drop ordering
  dueDate: { type: DataTypes.DATE, allowNull: true },
  epicLink: { type: DataTypes.UUID, allowNull: true } // parent Epic ID
});

// Issue Comment Model
export const IssueComment = sequelize.define('IssueComment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  body: { type: DataTypes.TEXT, allowNull: false }
});

// Issue Label Model
export const Label = sequelize.define('Label', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  color: { type: DataTypes.STRING, defaultValue: '#7b61ff' }
});

// Issue <> Label junction (many-to-many)
export const IssueLabel = sequelize.define('IssueLabel', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
});

// ---- Phase 2 Associations ----

// Projects belong to a Workspace
Workspace.hasMany(Project, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
Project.belongsTo(Workspace, { foreignKey: 'workspaceId' });

// Projects have Sprints
Project.hasMany(Sprint, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Sprint.belongsTo(Project, { foreignKey: 'projectId' });

// Projects have Issues (as backlog items)
Project.hasMany(Issue, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Issue.belongsTo(Project, { foreignKey: 'projectId' });

// Sprints have Issues (as sprint items — optional FK, issue may be unassigned)
Sprint.hasMany(Issue, { foreignKey: 'sprintId', onDelete: 'SET NULL' });
Issue.belongsTo(Sprint, { foreignKey: 'sprintId' });

// Issues have assignee / reporter
User.hasMany(Issue, { as: 'AssignedIssues', foreignKey: 'assigneeId', onDelete: 'SET NULL' });
Issue.belongsTo(User, { as: 'Assignee', foreignKey: 'assigneeId' });

User.hasMany(Issue, { as: 'ReportedIssues', foreignKey: 'reporterId', onDelete: 'SET NULL' });
Issue.belongsTo(User, { as: 'Reporter', foreignKey: 'reporterId' });

// Issues have Comments
Issue.hasMany(IssueComment, { foreignKey: 'issueId', onDelete: 'CASCADE' });
IssueComment.belongsTo(Issue, { foreignKey: 'issueId' });

User.hasMany(IssueComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
IssueComment.belongsTo(User, { foreignKey: 'userId' });

// Labels belong to a Project
Project.hasMany(Label, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Label.belongsTo(Project, { foreignKey: 'projectId' });

// Issues <> Labels (many-to-many through IssueLabel)
Issue.belongsToMany(Label, { through: IssueLabel, foreignKey: 'issueId' });
Label.belongsToMany(Issue, { through: IssueLabel, foreignKey: 'labelId' });

// Issues can have sub-tasks (self-referential)
Issue.hasMany(Issue, { as: 'SubTasks', foreignKey: 'parentIssueId', onDelete: 'CASCADE' });
Issue.belongsTo(Issue, { as: 'ParentIssue', foreignKey: 'parentIssueId' });
