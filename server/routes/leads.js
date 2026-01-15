const express = require('express');
const { authenticateToken, requireRole } = require('./auth');
const { query } = require('../db');

const router = express.Router();

// GET /api/leads - Get all leads with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      source, 
      agentId, 
      propertyId, 
      page = 1, 
      limit = 20,
      orderBy = 'created_at DESC',
      search
    } = req.query;
    
    const { role, id: userId } = req.user;
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;

    // Filter based on user role
    if (!['admin', 'manager'].includes(role)) {
      if (role === 'agent') {
        whereClause += ` AND l.agent_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      } else {
        // Non-agents can only see their own leads (if they are leads themselves)
        // This would be implemented based on user ID matching lead contact info
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Add additional filters
    if (status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND l.priority = $${paramIndex}`;
      queryParams.push(priority);
      paramIndex++;
    }

    if (source) {
      whereClause += ` AND l.source = $${paramIndex}`;
      queryParams.push(source);
      paramIndex++;
    }

    if (agentId) {
      whereClause += ` AND l.agent_id = $${paramIndex}`;
      queryParams.push(agentId);
      paramIndex++;
    }

    if (propertyId) {
      whereClause += ` AND l.property_id = $${paramIndex}`;
      queryParams.push(propertyId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (l.first_name ILIKE $${paramIndex} OR l.last_name ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const leadsQuery = `
      SELECT 
        l.*,
        p.title as property_title,
        p.address as property_address,
        agent.name as agent_name,
        agent.email as agent_email
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users agent ON l.agent_id = agent.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await query(leadsQuery, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      leads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leads/:id - Get specific lead details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const leadQuery = `
      SELECT 
        l.*,
        p.title as property_title,
        p.address as property_address,
        p.images as property_images,
        agent.name as agent_name,
        agent.email as agent_email,
        agent.phone as agent_phone
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users agent ON l.agent_id = agent.id
      WHERE l.id = $1
    `;

    const result = await query(leadQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];

    // Check permissions
    const canView = 
      lead.agent_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get related communications
    const communicationsQuery = `
      SELECT * FROM lead_communications 
      WHERE lead_id = $1 
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const communicationsResult = await query(communicationsQuery, [id]);

    // Get related activities
    const activitiesQuery = `
      SELECT * FROM lead_activities 
      WHERE lead_id = $1 
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const activitiesResult = await query(activitiesQuery, [id]);

    // Get related tasks
    const tasksQuery = `
      SELECT * FROM lead_tasks 
      WHERE lead_id = $1 
      ORDER BY due_date ASC, priority DESC
    `;

    const tasksResult = await query(tasksQuery, [id]);

    // Get related showings
    const showingsQuery = `
      SELECT 
        s.*,
        p.title as property_title,
        p.address as property_address
      FROM showings s
      LEFT JOIN properties p ON s.property_id = p.id
      WHERE s.lead_id = $1 
      ORDER BY s.scheduled_at DESC
    `;

    const showingsResult = await query(showingsQuery, [id]);

    res.json({
      ...lead,
      communications: communicationsResult.rows,
      activities: activitiesResult.rows,
      tasks: tasksResult.rows,
      showings: showingsResult.rows
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads - Create new lead
router.post('/', authenticateToken, requireRole('agent'), async (req, res) => {
  try {
    const leadData = req.body;
    const { id: userId } = req.user;

    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'source'];
    for (const field of requiredFields) {
      if (!leadData[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Calculate lead score
    let leadScore = 0;
    if (leadData.email) leadScore += 10;
    if (leadData.phone) leadScore += 10;
    if (leadData.budget_min && leadData.budget_max) leadScore += 15;
    if (leadData.move_in_date) leadScore += 10;
    if (['referral', 'open_house'].includes(leadData.source)) leadScore += 10;

    const insertQuery = `
      INSERT INTO leads (
        first_name, last_name, email, phone, company, source, source_details,
        property_id, property_preferences, budget_min, budget_max, preferred_locations,
        preferred_property_types, preferred_bedrooms, preferred_bathrooms, preferred_area_min,
        preferred_area_max, move_in_date, lease_term_months, status, priority,
        agent_id, lead_score, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `;

    const values = [
      leadData.first_name,
      leadData.last_name,
      leadData.email,
      leadData.phone,
      leadData.company || null,
      leadData.source,
      leadData.source_details || null,
      leadData.property_id || null,
      JSON.stringify(leadData.property_preferences || {}),
      leadData.budget_min || null,
      leadData.budget_max || null,
      leadData.preferred_locations || [],
      leadData.preferred_property_types || [],
      leadData.preferred_bedrooms || null,
      leadData.preferred_bathrooms || null,
      leadData.preferred_area_min || null,
      leadData.preferred_area_max || null,
      leadData.move_in_date || null,
      leadData.lease_term_months || null,
      'new',
      leadData.priority || 'medium',
      userId,
      leadScore,
      leadData.notes || null,
      userId
    ];

    const result = await query(insertQuery, values);
    const newLead = result.rows[0];

    // Create activity record
    await query(
      'INSERT INTO lead_activities (lead_id, type, description, agent_id) VALUES ($1, $2, $3, $4)',
      [newLead.id, 'created', 'Lead created', userId]
    );

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { role, id: userId } = req.user;

    // Get current lead to check permissions
    const currentQuery = 'SELECT * FROM leads WHERE id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const currentLead = currentResult.rows[0];

    // Check permissions
    const canUpdate = 
      currentLead.agent_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Build dynamic update query
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'company', 'status', 'priority',
      'budget_min', 'budget_max', 'preferred_locations', 'preferred_property_types',
      'preferred_bedrooms', 'preferred_bathrooms', 'preferred_area_min', 'preferred_area_max',
      'move_in_date', 'lease_term_months', 'notes', 'next_follow_up_at', 'follow_up_notes',
      'conversion_probability', 'estimated_close_date', 'estimated_commission',
      'preferred_contact_method', 'best_contact_time', 'timezone'
    ];

    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${valueIndex}`);
        updateValues.push(updateData[field]);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // Add WHERE clause parameter

    const updateQuery = `
      UPDATE leads 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedLead = result.rows[0];

    // Create activity record for status change
    if (updateData.status && updateData.status !== currentLead.status) {
      await query(
        'INSERT INTO lead_activities (lead_id, type, description, old_value, new_value, agent_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, 'status_change', `Status changed from ${currentLead.status} to ${updateData.status}`, currentLead.status, updateData.status, userId]
      );
    }

    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/leads/:id/assign - Assign lead to agent
router.put('/:id/assign', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const { id: userId } = req.user;

    // Check if lead exists
    const leadQuery = 'SELECT * FROM leads WHERE id = $1';
    const leadResult = await query(leadQuery, [id]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    // Check if agent exists and has agent role
    const agentQuery = 'SELECT * FROM users WHERE id = $1 AND role = $2';
    const agentResult = await query(agentQuery, [agentId, 'agent']);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found or invalid role' });
    }

    // Update lead assignment
    const updateQuery = `
      UPDATE leads 
      SET agent_id = $1, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(updateQuery, [agentId, id]);
    const updatedLead = result.rows[0];

    // Create activity record
    await query(
      'INSERT INTO lead_activities (lead_id, type, description, agent_id) VALUES ($1, $2, $3, $4)',
      [id, 'assigned', `Lead assigned to agent ${agentResult.rows[0].name}`, userId]
    );

    res.json(updatedLead);
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leads/statistics - Get lead statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    let agentId = null;
    if (role === 'agent') {
      agentId = userId;
    }

    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'closed_won' THEN 1 END) as closed_won_leads,
        COUNT(CASE WHEN status = 'closed_lost' THEN 1 END) as closed_lost_leads,
        ROUND(AVG(lead_score), 2) as avg_lead_score,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as leads_this_month,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week
      FROM leads
      ${agentId ? 'WHERE agent_id = $1' : ''}
    `;

    const queryParams = agentId ? [agentId] : [];
    const result = await query(statisticsQuery, queryParams);

    // Get conversion rate
    const conversionQuery = `
      SELECT 
        ROUND(
          (COUNT(CASE WHEN status = 'closed_won' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN status IN ('closed_won', 'closed_lost') THEN 1 END), 0)), 
          2
        ) as conversion_rate
      FROM leads
      ${agentId ? 'WHERE agent_id = $1' : ''}
    `;

    const conversionResult = await query(conversionQuery, queryParams);

    res.json({
      ...result.rows[0],
      conversion_rate: parseFloat(conversionResult.rows[0].conversion_rate) || 0
    });
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads/:id/communications - Add communication record
router.post('/:id/communications', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const communicationData = req.body;
    const { role, id: userId } = req.user;

    // Check if lead exists and user has permission
    const leadQuery = 'SELECT * FROM leads WHERE id = $1';
    const leadResult = await query(leadQuery, [id]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    const canAdd = 
      lead.agent_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canAdd) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const insertQuery = `
      INSERT INTO lead_communications (
        lead_id, type, direction, subject, content, contact_person,
        contact_method, contact_details, status, agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      communicationData.type,
      communicationData.direction,
      communicationData.subject || null,
      communicationData.content,
      communicationData.contact_person || null,
      communicationData.contact_method || null,
      JSON.stringify(communicationData.contact_details || {}),
      communicationData.status || 'sent',
      userId
    ];

    const result = await query(insertQuery, values);
    const newCommunication = result.rows[0];

    // Update lead's last contacted timestamp
    await query(
      'UPDATE leads SET last_contacted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Create activity record
    await query(
      'INSERT INTO lead_activities (lead_id, type, description, agent_id) VALUES ($1, $2, $3, $4)',
      [id, 'contacted', `${communicationData.type} communication: ${communicationData.subject || 'No subject'}`, userId]
    );

    res.status(201).json(newCommunication);
  } catch (error) {
    console.error('Error adding communication:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leads/:id/tasks - Get lead tasks
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Check permissions
    const leadQuery = 'SELECT * FROM leads WHERE id = $1';
    const leadResult = await query(leadQuery, [id]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    const canView = 
      lead.agent_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const tasksQuery = `
      SELECT * FROM lead_tasks 
      WHERE lead_id = $1 
      ORDER BY due_date ASC, priority DESC
    `;

    const result = await query(tasksQuery, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lead tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads/:id/tasks - Create lead task
router.post('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const taskData = req.body;
    const { role, id: userId } = req.user;

    // Check permissions
    const leadQuery = 'SELECT * FROM leads WHERE id = $1';
    const leadResult = await query(leadQuery, [id]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    const canAdd = 
      lead.agent_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canAdd) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const insertQuery = `
      INSERT INTO lead_tasks (
        lead_id, title, description, type, priority, assigned_to, assigned_by,
        due_date, estimated_duration, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      taskData.title,
      taskData.description,
      taskData.type || 'follow_up',
      taskData.priority || 'medium',
      taskData.assigned_to || userId,
      userId,
      taskData.due_date || null,
      taskData.estimated_duration || null,
      taskData.notes || null
    ];

    const result = await query(insertQuery, values);
    const newTask = result.rows[0];

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating lead task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
