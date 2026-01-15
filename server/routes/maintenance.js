const express = require('express');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('./auth');
const { query } = require('../db');
const notificationService = require('../services/notificationService');

const router = express.Router();

// GET /api/maintenance/requests - Get all maintenance requests (filtered by user role)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let whereClause = '';
    let queryParams = [];

    // Filter based on user role
    if (role === 'tenant') {
      whereClause = 'WHERE mr.tenant_id = $1';
      queryParams = [userId];
    } else if (role === 'landlord') {
      whereClause = 'WHERE mr.landlord_id = $1';
      queryParams = [userId];
    } else if (role === 'admin' || role === 'manager') {
      // Admin/manager can see all requests
      whereClause = '';
      queryParams = [];
    } else if (role === 'contractor') {
      whereClause = 'WHERE mr.contractor_id = $1 OR mr.status = $2';
      queryParams = [userId, 'pending'];
    }

    const query = `
      SELECT 
        mr.*,
        p.title as property_title,
        p.address,
        p.city,
        p.state,
        tenant.name as tenant_name,
        tenant.email as tenant_email,
        landlord.name as landlord_name,
        landlord.email as landlord_email,
        contractor.name as contractor_name,
        contractor.email as contractor_email,
        contractor.phone as contractor_phone
      FROM maintenance_requests mr
      LEFT JOIN properties p ON mr.property_id = p.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      LEFT JOIN users landlord ON mr.landlord_id = landlord.id
      LEFT JOIN users contractor ON mr.contractor_id = contractor.id
      ${whereClause}
      ORDER BY mr.created_at DESC
    `;

    const result = await query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

// GET /api/maintenance/requests/:id - Get specific maintenance request
router.get('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const query = `
      SELECT 
        mr.*,
        p.title as property_title,
        p.address,
        p.city,
        p.state,
        tenant.name as tenant_name,
        tenant.email as tenant_email,
        tenant.phone as tenant_phone,
        landlord.name as landlord_name,
        landlord.email as landlord_email,
        landlord.phone as landlord_phone,
        contractor.name as contractor_name,
        contractor.email as contractor_email,
        contractor.phone as contractor_phone
      FROM maintenance_requests mr
      LEFT JOIN properties p ON mr.property_id = p.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      LEFT JOIN users landlord ON mr.landlord_id = landlord.id
      LEFT JOIN users contractor ON mr.contractor_id = contractor.id
      WHERE mr.id = $1
    `;

    const result = await query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    const maintenanceRequest = result.rows[0];

    // Check if user has permission to view this request
    const hasPermission = 
      maintenanceRequest.tenant_id === userId ||
      maintenanceRequest.landlord_id === userId ||
      maintenanceRequest.contractor_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(maintenanceRequest);
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance request' });
  }
});

// POST /api/maintenance/requests - Create new maintenance request
router.post('/requests', authenticateToken, requireRole('tenant'), async (req, res) => {
  try {
    const {
      property_id,
      title,
      description,
      category,
      priority = 'medium',
      area_affected,
      access_instructions,
      tenant_notes,
      images = [],
      documents = []
    } = req.body;

    const tenantId = req.user.id;

    // Validate required fields
    if (!property_id || !title || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get property details to find landlord
    const propertyQuery = 'SELECT landlord_id FROM properties WHERE id = $1';
    const propertyResult = await query(propertyQuery, [property_id]);

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const landlordId = propertyResult.rows[0].landlord_id;

    // Verify tenant is associated with this property (through booking or ownership)
    const bookingQuery = `
      SELECT id FROM bookings 
      WHERE property_id = $1 AND tenant_id = $2 
      AND status IN ('confirmed', 'completed')
    `;
    const bookingResult = await query(bookingQuery, [property_id, tenantId]);

    if (bookingResult.rows.length === 0 && landlordId !== tenantId) {
      return res.status(403).json({ error: 'You are not associated with this property' });
    }

    const insertQuery = `
      INSERT INTO maintenance_requests (
        property_id, tenant_id, landlord_id, title, description, category, 
        priority, area_affected, access_instructions, tenant_notes, images, documents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      property_id, tenantId, landlordId, title, description, category,
      priority, area_affected, access_instructions, tenant_notes, 
      JSON.stringify(images), JSON.stringify(documents)
    ];

    const result = await query(insertQuery, values);
    const newRequest = result.rows[0];

    // Create history entry
    const historyQuery = `
      INSERT INTO maintenance_request_history (
        maintenance_request_id, action, changed_by, changed_by_role, notes
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    
    await query(historyQuery, [
      newRequest.id, 'created', tenantId, 'tenant', 'Maintenance request created'
    ]);

    // Send notification to landlord
    try {
      await notificationService.sendNotification('maintenance_request_created', landlordId, {
        id: newRequest.id,
        title: newRequest.title,
        category: newRequest.category,
        priority: newRequest.priority,
        propertyTitle: propertyResult.rows[0].title,
        tenantName: req.user.name,
        description: newRequest.description
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    // Notify landlord (in a real implementation, this would send email/SMS)
    console.log(`Maintenance request created: ${newRequest.id} - notifying landlord ${landlordId}`);

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ error: 'Failed to create maintenance request' });
  }
});

// PUT /api/maintenance/requests/:id - Update maintenance request
router.put('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const updates = req.body;

    // Get current request to check permissions
    const currentQuery = 'SELECT * FROM maintenance_requests WHERE id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    const currentRequest = currentResult.rows[0];

    // Check permissions
    const canUpdate = 
      (role === 'tenant' && currentRequest.tenant_id === userId) ||
      (role === 'landlord' && currentRequest.landlord_id === userId) ||
      (role === 'contractor' && currentRequest.contractor_id === userId) ||
      ['admin', 'manager'].includes(role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Build dynamic update query
    const allowedFields = [
      'title', 'description', 'category', 'priority', 'status', 
      'area_affected', 'access_instructions', 'tenant_notes', 
      'landlord_notes', 'contractor_notes', 'estimated_cost', 
      'actual_cost', 'payment_status', 'contractor_id', 'images', 'documents'
    ];

    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'images' || field === 'documents') {
          updateFields.push(`${field} = $${valueIndex}`);
          updateValues.push(JSON.stringify(updates[field]));
        } else {
          updateFields.push(`${field} = $${valueIndex}`);
          updateValues.push(updates[field]);
        }
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // Add WHERE clause parameter

    const updateQuery = `
      UPDATE maintenance_requests 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedRequest = result.rows[0];

    // Create history entry for status changes
    if (updates.status && updates.status !== currentRequest.status) {
      const historyQuery = `
        INSERT INTO maintenance_request_history (
          maintenance_request_id, action, old_status, new_status, changed_by, changed_by_role, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await query(historyQuery, [
        id, 'status_changed', currentRequest.status, updates.status, 
        userId, role, `Status changed from ${currentRequest.status} to ${updates.status}`
      ]);

      // Send notifications for status changes
      try {
        const notificationData = {
          id,
          title: currentRequest.title,
          status: updates.status,
          updatedBy: req.user.name,
          notes: updates.landlord_notes || updates.contractor_notes
        };

        // Notify tenant
        await notificationService.sendNotification('maintenance_request_updated', currentRequest.tenant_id, notificationData);

        // Notify landlord
        await notificationService.sendNotification('maintenance_request_updated', currentRequest.landlord_id, notificationData);

        // If completed, send completion notification
        if (updates.status === 'completed') {
          const completionData = {
            ...notificationData,
            contractorName: currentRequest.contractor_id ? 'Assigned Contractor' : 'N/A',
            completionDate: new Date().toLocaleDateString(),
            actualAmount: updates.actual_cost
          };

          await notificationService.sendNotification('maintenance_request_completed', currentRequest.tenant_id, completionData);
          await notificationService.sendNotification('maintenance_request_completed', currentRequest.landlord_id, completionData);
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(500).json({ error: 'Failed to update maintenance request' });
  }
});

// DELETE /api/maintenance/requests/:id - Delete maintenance request
router.delete('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Get current request
    const currentQuery = 'SELECT * FROM maintenance_requests WHERE id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    const currentRequest = currentResult.rows[0];

    // Only tenants and landlords can delete requests (and only if status is pending)
    const canDelete = 
      currentRequest.status === 'pending' && (
        (role === 'tenant' && currentRequest.tenant_id === userId) ||
        (role === 'landlord' && currentRequest.landlord_id === userId) ||
        ['admin', 'manager'].includes(role)
      );

    if (!canDelete) {
      return res.status(403).json({ error: 'Cannot delete request in current status or insufficient permissions' });
    }

    const deleteQuery = 'DELETE FROM maintenance_requests WHERE id = $1';
    await query(deleteQuery, [id]);

    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    res.status(500).json({ error: 'Failed to delete maintenance request' });
  }
});

// GET /api/maintenance/requests/:id/history - Get maintenance request history
router.get('/requests/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Check if user has permission to view this request
    const requestQuery = 'SELECT * FROM maintenance_requests WHERE id = $1';
    const requestResult = await query(requestQuery, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    const request = requestResult.rows[0];
    const hasPermission = 
      request.tenant_id === userId ||
      request.landlord_id === userId ||
      request.contractor_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const historyQuery = `
      SELECT 
        mrh.*,
        u.name as changed_by_name,
        u.email as changed_by_email
      FROM maintenance_request_history mrh
      LEFT JOIN users u ON mrh.changed_by = u.id
      WHERE mrh.maintenance_request_id = $1
      ORDER BY mrh.created_at DESC
    `;

    const result = await query(historyQuery, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance request history:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance request history' });
  }
});

// GET /api/maintenance/categories - Get maintenance categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = [
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'appliance', label: 'Appliance' },
      { value: 'structural', label: 'Structural' },
      { value: 'pest_control', label: 'Pest Control' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'other', label: 'Other' }
    ];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
