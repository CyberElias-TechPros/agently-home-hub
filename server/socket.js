const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Socket.io middleware for authentication
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

// Initialize Socket.io
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Store connected users
  const connectedUsers = new Map();

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      connectedAt: new Date(),
      userRole: socket.userRole
    });

    // Join user to their personal room for direct messages
    socket.join(`user_${socket.userId}`);

    // Join user to their role-based rooms
    socket.join(`role_${socket.userRole}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user is part of conversation
        const result = await pool.query(
          `SELECT id FROM conversations 
           WHERE id = $1 AND (participant_1_id = $2 OR participant_2_id = $2)`,
          [conversationId, socket.userId]
        );

        if (result.rows.length > 0) {
          socket.join(`conversation_${conversationId}`);
          socket.emit('joined_conversation', { conversationId });
          
          // Notify other participants that user is online
          socket.to(`conversation_${conversationId}`).emit('user_online', {
            userId: socket.userId,
            conversationId
          });
        } else {
          socket.emit('error', { message: 'Access denied to conversation' });
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      socket.to(`conversation_${conversationId}`).emit('user_offline', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        typing: false
      });
    });

    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      try {
        const { messageIds } = data;
        
        // Update messages as read in database
        await pool.query(
          `UPDATE messages 
           SET read_at = CURRENT_TIMESTAMP 
           WHERE id = ANY($1) AND receiver_id = $2 AND read_at IS NULL`,
          [messageIds, socket.userId]
        );

        // Notify sender that messages were read
        const messagesResult = await pool.query(
          `SELECT sender_id FROM messages WHERE id = ANY($1)`,
          [messageIds]
        );

        messagesResult.rows.forEach(message => {
          socket.to(`user_${message.sender_id}`).emit('messages_read', {
            messageIds,
            readBy: socket.userId,
            readAt: new Date()
          });
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle real-time message delivery
    socket.on('send_message', async (data) => {
      try {
        const { receiver_id, message_type, content, property_id, lead_id } = data;
        
        // Create message in database
        const messageQuery = `
          INSERT INTO messages (sender_id, receiver_id, property_id, lead_id, message_type, content)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const result = await pool.query(messageQuery, [
          socket.userId, receiver_id, property_id, lead_id, message_type, content
        ]);
        
        const message = result.rows[0];

        // Get or create conversation
        let conversationQuery = `
          SELECT id FROM conversations 
          WHERE (participant_1_id = $1 AND participant_2_id = $2) 
             OR (participant_1_id = $2 AND participant_2_id = $1)
        `;
        
        if (property_id) {
          conversationQuery += ' AND property_id = $3';
        }

        const conversationResult = await pool.query(
          conversationQuery,
          property_id ? [socket.userId, receiver_id, property_id] : [socket.userId, receiver_id]
        );

        let conversation_id;
        if (conversationResult.rows.length === 0) {
          const newConversation = await pool.query(
            `INSERT INTO conversations (participant_1_id, participant_2_id, property_id) 
             VALUES ($1, $2, $3) RETURNING id`,
            [socket.userId, receiver_id, property_id]
          );
          conversation_id = newConversation.rows[0].id;
        } else {
          conversation_id = conversationResult.rows[0].id;
        }

        // Create notification for receiver
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, content, data)
           VALUES ($1, 'message', 'New Message', $2, $3)`,
          [receiver_id, 'You have a new message', JSON.stringify({
            message_id: message.id,
            conversation_id,
            sender_id: socket.userId
          })]
        );

        // Send message to receiver in real-time
        socket.to(`user_${receiver_id}`).emit('new_message', {
          message,
          conversation_id,
          sender: {
            id: socket.userId,
            role: socket.userRole
          }
        });

        // Send confirmation to sender
        socket.emit('message_sent', {
          message,
          conversation_id
        });

        // Update conversation last message
        await pool.query(
          `UPDATE conversations 
           SET last_message_id = $1, last_message_at = $2 
           WHERE id = $3`,
          [message.id, message.created_at, conversation_id]
        );

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle getting online users
    socket.on('get_online_users', async () => {
      try {
        const onlineUserIds = Array.from(connectedUsers.keys());
        
        if (onlineUserIds.length > 0) {
          const usersResult = await pool.query(
            `SELECT id, first_name, last_name, email, role 
             FROM users WHERE id = ANY($1)`,
            [onlineUserIds]
          );

          const onlineUsers = usersResult.rows.map(user => ({
            ...user,
            socketId: connectedUsers.get(user.id)?.socketId,
            connectedAt: connectedUsers.get(user.id)?.connectedAt
          }));

          socket.emit('online_users', onlineUsers);
        } else {
          socket.emit('online_users', []);
        }
      } catch (error) {
        console.error('Error getting online users:', error);
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });

    // Handle getting unread message count
    socket.on('get_unread_count', async () => {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM messages 
           WHERE receiver_id = $1 AND read_at IS NULL`,
          [socket.userId]
        );

        socket.emit('unread_count', {
          count: parseInt(result.rows[0].count)
        });
      } catch (error) {
        console.error('Error getting unread count:', error);
        socket.emit('error', { message: 'Failed to get unread count' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      
      // Remove user from connected users
      connectedUsers.delete(socket.userId);

      // Notify all conversations that user is offline
      socket.rooms.forEach(room => {
        if (room.startsWith('conversation_')) {
          const conversationId = room.replace('conversation_', '');
          socket.to(room).emit('user_offline', {
            userId: socket.userId,
            conversationId
          });
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Make io available to routes
  return io;
};

// Helper function to get online users count
const getOnlineUsersCount = () => {
  return connectedUsers.size;
};

// Helper function to check if user is online
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// Helper function to get user socket ID
const getUserSocketId = (userId) => {
  const user = connectedUsers.get(userId);
  return user ? user.socketId : null;
};

module.exports = {
  initializeSocket,
  getOnlineUsersCount,
  isUserOnline,
  getUserSocketId
};
