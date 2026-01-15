const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body, validationResult, query } = require('express-validator');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get conversations for a user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        c.*,
        m.content as last_message_content,
        m.created_at as last_message_time,
        u1.first_name as participant_1_first_name,
        u1.last_name as participant_1_last_name,
        u1.email as participant_1_email,
        u2.first_name as participant_2_first_name,
        u2.last_name as participant_2_last_name,
        u2.email as participant_2_email,
        p.title as property_title,
        p.address as property_address,
        CASE 
          WHEN c.participant_1_id = $1 THEN 
            (SELECT COUNT(*) FROM messages WHERE receiver_id = c.participant_1_id AND read_at IS NULL)
          ELSE 
            (SELECT COUNT(*) FROM messages WHERE receiver_id = c.participant_2_id AND read_at IS NULL)
        END as unread_count
      FROM conversations c
      LEFT JOIN messages m ON c.last_message_id = m.id
      LEFT JOIN users u1 ON c.participant_1_id = u1.id
      LEFT JOIN users u2 ON c.participant_2_id = u2.id
      LEFT JOIN properties p ON c.property_id = p.id
      WHERE (c.participant_1_id = $1 OR c.participant_2_id = $1)
        AND c.is_archived = FALSE
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    res.json({
      conversations: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user is part of conversation
    const conversationCheck = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND (participant_1_id = $2 OR participant_2_id = $2)',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT 
        m.*,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        ma.file_name,
        ma.file_path,
        ma.file_type,
        ma.file_size,
        ma.thumbnail_path
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN message_attachments ma ON m.id = ma.message_id
      WHERE (
        (m.sender_id = (SELECT participant_1_id FROM conversations WHERE id = $1 AND participant_2_id = $2) OR
         m.sender_id = (SELECT participant_2_id FROM conversations WHERE id = $1 AND participant_1_id = $2)) OR
        (m.receiver_id = (SELECT participant_1_id FROM conversations WHERE id = $1 AND participant_2_id = $2) OR
         m.receiver_id = (SELECT participant_2_id FROM conversations WHERE id = $1 AND participant_1_id = $2))
      )
      ORDER BY m.created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [conversationId, userId, limit, offset]);

    // Mark messages as read
    await pool.query(
      'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE receiver_id = $1 AND read_at IS NULL',
      [userId]
    );

    res.json({
      messages: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', authenticateToken, [
  body('receiver_id').isUUID().withMessage('Valid receiver ID required'),
  body('message_type').isIn(['text', 'image', 'file', 'system']).withMessage('Invalid message type'),
  body('content').notEmpty().withMessage('Message content required'),
  body('property_id').optional().isUUID().withMessage('Invalid property ID'),
  body('lead_id').optional().isUUID().withMessage('Invalid lead ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiver_id, message_type, content, property_id, lead_id } = req.body;
    const sender_id = req.user.id;

    // Check if conversation exists or create new one
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
      property_id ? [sender_id, receiver_id, property_id] : [sender_id, receiver_id]
    );

    let conversation_id;
    if (conversationResult.rows.length === 0) {
      // Create new conversation
      const newConversation = await pool.query(
        `INSERT INTO conversations (participant_1_id, participant_2_id, property_id) 
         VALUES ($1, $2, $3) RETURNING id`,
        [sender_id, receiver_id, property_id]
      );
      conversation_id = newConversation.rows[0].id;
    } else {
      conversation_id = conversationResult.rows[0].id;
    }

    // Create message
    const messageQuery = `
      INSERT INTO messages (sender_id, receiver_id, property_id, lead_id, message_type, content)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const messageResult = await pool.query(messageQuery, [
      sender_id, receiver_id, property_id, lead_id, message_type, content
    ]);

    const message = messageResult.rows[0];

    // Create notification for receiver
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, content, data)
       VALUES ($1, 'message', 'New Message', $2, $3)`,
      [receiver_id, 'You have a new message', JSON.stringify({
        message_id: message.id,
        conversation_id,
        sender_id,
        sender_name: `${req.user.first_name} ${req.user.last_name}`
      })]
    );

    // Emit real-time event (will be handled by Socket.io)
    req.app.get('io').emit('new_message', {
      message,
      conversation_id,
      receiver_id
    });

    res.status(201).json({
      message,
      conversation_id
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/read', authenticateToken, [
  body('message_ids').isArray().withMessage('Message IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message_ids } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE messages 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1) AND receiver_id = $2 AND read_at IS NULL
       RETURNING id`,
      [message_ids, userId]
    );

    res.json({
      marked_read: result.rows.length,
      messages: result.rows
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get notifications for a user
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    let params = [userId];

    if (unread_only === 'true') {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      notifications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.put('/notifications/read', authenticateToken, [
  body('notification_ids').isArray().withMessage('Notification IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notification_ids } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1) AND user_id = $2 AND read_at IS NULL
       RETURNING id`,
      [notification_ids, userId]
    );

    res.json({
      marked_read: result.rows.length,
      notifications: result.rows
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Search messages
router.get('/search', authenticateToken, [
  query('q').notEmpty().withMessage('Search query required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    const searchQuery = `
      SELECT DISTINCT
        m.*,
        u.first_name,
        u.last_name,
        u.email,
        c.id as conversation_id,
        p.title as property_title
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN conversations c ON (
        (c.participant_1_id = m.sender_id AND c.participant_2_id = $1) OR
        (c.participant_1_id = $1 AND c.participant_2_id = m.sender_id) OR
        (c.participant_1_id = m.receiver_id AND c.participant_2_id = $1) OR
        (c.participant_1_id = $1 AND c.participant_2_id = m.receiver_id)
      )
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE (m.sender_id = $1 OR m.receiver_id = $1)
        AND m.message_type = 'text'
        AND (m.content ILIKE $2 OR u.first_name ILIKE $2 OR u.last_name ILIKE $2)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(searchQuery, [
      userId, `%${q}%`, limit, offset
    ]);

    res.json({
      messages: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Archive conversation
router.put('/conversations/:conversationId/archive', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of conversation
    const conversationCheck = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND (participant_1_id = $2 OR participant_2_id = $2)',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      'UPDATE conversations SET is_archived = TRUE WHERE id = $1',
      [conversationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

module.exports = router;
