import express from 'express';
import { Message, Reaction, User } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { translateText } from '../services/ai.js';
const router = express.Router();

// Post a new message to a channel
router.post('/', requireAuth, async (req, res) => {
  const { channelId, text, parentId } = req.body;
  if (!channelId || !text) return res.status(400).json({ error: 'channelId and text are required' });

  try {
    const user = await User.findByPk(req.user.id);
    const message = await Message.create({
      channelId,
      userId: req.user.id,
      username: user.username,
      text,
      parentId: parentId || null
    });
    res.status(201).json({ ...message.toJSON(), Reactions: [], Replies: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Get main messages of a channel (parentId is null)
router.get('/channel/:channelId', requireAuth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { channelId: req.params.channelId, parentId: null },
      include: [
        { model: Reaction, include: [{ model: User, attributes: ['id', 'username'] }] },
        { model: Message, as: 'Replies', attributes: ['id'] } // Used to count replies
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get thread replies of a parent message
router.get('/message/:messageId/replies', requireAuth, async (req, res) => {
  try {
    const replies = await Message.findAll({
      where: { parentId: req.params.messageId },
      include: [
        { model: Reaction, include: [{ model: User, attributes: ['id', 'username'] }] }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch thread replies' });
  }
});

// Add reaction to a message
router.post('/message/:messageId/reaction', requireAuth, async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  try {
    // Check if user already added this exact emoji to this message
    const existing = await Reaction.findOne({
      where: {
        messageId: req.params.messageId,
        userId: req.user.id,
        emoji
      }
    });

    if (existing) {
      await existing.destroy();
      return res.json({ status: 'removed', emoji });
    }

    const reaction = await Reaction.create({
      messageId: req.params.messageId,
      userId: req.user.id,
      emoji
    });

    // Fetch user details to return in message payload
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'username'] });
    res.status(201).json({ status: 'added', reaction: { ...reaction.toJSON(), User: user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// Translate message text dynamically and cache it in the DB
router.post('/translate/:messageId', requireAuth, async (req, res) => {
  const { targetLanguage } = req.body;
  if (!targetLanguage) return res.status(400).json({ error: 'Target language is required' });

  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Parse existing translation caches
    let cache = {};
    if (message.translatedText) {
      try {
        cache = JSON.parse(message.translatedText);
      } catch (e) {
        cache = {};
      }
    }

    // Check cache first
    if (cache[targetLanguage]) {
      return res.json({ translated: cache[targetLanguage] });
    }

    // Call translation service
    const translated = await translateText(message.text, targetLanguage);
    
    // Save to cache
    cache[targetLanguage] = translated;
    message.translatedText = JSON.stringify(cache);
    await message.save();

    res.json({ translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
