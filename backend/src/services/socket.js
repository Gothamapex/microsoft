import { Message, Reaction, User } from '../config/database.js';

export const handleSocketConnections = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a channel room
    socket.on('join_channel', (channelId) => {
      socket.join(channelId);
      console.log(`👤 Client ${socket.id} joined channel room: ${channelId}`);
    });

    // Leave a channel room
    socket.on('leave_channel', (channelId) => {
      socket.leave(channelId);
      console.log(`👤 Client ${socket.id} left channel room: ${channelId}`);
    });

    // Handle new message dispatch
    socket.on('send_message', async (data) => {
      const { channelId, userId, text, parentId } = data;
      if (!channelId || !userId || !text) return;

      try {
        const user = await User.findByPk(userId);
        if (!user) return;

        const message = await Message.create({
          channelId,
          userId,
          username: user.username,
          text,
          parentId: parentId || null
        });

        const messagePayload = {
          ...message.toJSON(),
          Reactions: [],
          Replies: []
        };

        // Broadcast to everyone in the channel (including sender so UI stays synced)
        io.to(channelId).emit('new_message', messagePayload);
      } catch (err) {
        console.error('Socket send_message error:', err);
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { channelId, username, isTyping } = data;
      socket.to(channelId).emit('user_typing', { username, isTyping });
    });

    // Handle emoji reaction toggles
    socket.on('toggle_reaction', async (data) => {
      const { messageId, userId, emoji, channelId } = data;
      try {
        const existing = await Reaction.findOne({
          where: { messageId, userId, emoji }
        });

        let result;
        if (existing) {
          await existing.destroy();
          result = { messageId, userId, emoji, action: 'removed' };
        } else {
          const reaction = await Reaction.create({ messageId, userId, emoji });
          const user = await User.findByPk(userId, { attributes: ['id', 'username'] });
          result = { 
            messageId, 
            userId, 
            emoji, 
            action: 'added', 
            reaction: { ...reaction.toJSON(), User: user } 
          };
        }

        io.to(channelId).emit('reaction_updated', result);
      } catch (err) {
        console.error('Socket toggle_reaction error:', err);
      }
    });

    // Handle user presence status updates
    socket.on('presence_update', async (data) => {
      const { userId, presence } = data;
      try {
        const user = await User.findByPk(userId);
        if (user) {
          user.presence = presence;
          await user.save();
          io.emit('presence_change', { userId, presence });
        }
      } catch (err) {
        console.error('Socket presence_update error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
