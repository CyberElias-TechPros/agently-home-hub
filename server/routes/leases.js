const express = require('express');
const { authenticateToken, requireRole } = require('./auth');
const { query } = require('../db');
const leaseGenerationService = require('../services/leaseGenerationService');

const router = express.Router();

// POST /api/leases/generate/from-booking - Generate lease from booking
router.post('/generate/from-booking', authenticateToken, async (req, res) => {
  try {
    const { bookingId, customTerms } = req.body;
    const { role, id: userId } = req.user;

    // Check if user has permission (landlord of the property or admin)
    const bookingQuery = `
      SELECT b.*, p.landlord_id
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
    `;

    const bookingResult = await query(bookingQuery, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    const canGenerate = 
      booking.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canGenerate) {
      return res.status(403).json({ error: 'Insufficient permissions to generate lease' });
    }

    // Check if lease already exists
    const existingLeaseQuery = 'SELECT id FROM leases WHERE booking_id = $1';
    const existingLeaseResult = await query(existingLeaseQuery, [bookingId]);

    if (existingLeaseResult.rows.length > 0) {
      return res.status(400).json({ error: 'Lease already exists for this booking' });
    }

    const lease = await leaseGenerationService.generateLeaseFromBooking(bookingId, customTerms);
    
    res.status(201).json(lease);
  } catch (error) {
    console.error('Error generating lease from booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leases/generate/custom - Generate custom lease
router.post('/generate/custom', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const leaseData = req.body;
    const { id: userId } = req.user;

    // Verify landlord owns the property
    const propertyQuery = 'SELECT landlord_id FROM properties WHERE id = $1';
    const propertyResult = await query(propertyQuery, [leaseData.propertyId]);

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (propertyResult.rows[0].landlord_id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const lease = await leaseGenerationService.generateCustomLease(leaseData);
    
    res.status(201).json(lease);
  } catch (error) {
    console.error('Error generating custom lease:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases/templates - Get lease templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await leaseGenerationService.getLeaseTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting lease templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases/:id - Get lease details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const leaseQuery = `
      SELECT 
        l.*,
        d.original_name,
        d.filename,
        d.path,
        d.created_at as document_created_at,
        p.title as property_title,
        p.address as property_address,
        tenant.name as tenant_name,
        tenant.email as tenant_email,
        landlord.name as landlord_name,
        landlord.email as landlord_email
      FROM leases l
      LEFT JOIN documents d ON l.document_id = d.id
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users tenant ON l.tenant_id = tenant.id
      LEFT JOIN users landlord ON l.landlord_id = landlord.id
      WHERE l.id = $1
    `;

    const result = await query(leaseQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = result.rows[0];

    // Check permissions
    const canView = 
      lease.tenant_id === userId ||
      lease.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(lease);
  } catch (error) {
    console.error('Error getting lease:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases/booking/:bookingId - Get lease by booking ID
router.get('/booking/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { role, id: userId } = req.user;

    // Check if user has permission to view this booking's lease
    const bookingQuery = `
      SELECT b.*, p.landlord_id
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
    `;

    const bookingResult = await query(bookingQuery, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    const canView = 
      booking.tenant_id === userId ||
      booking.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const lease = await leaseGenerationService.getLeaseByBooking(bookingId);
    
    if (!lease) {
      return res.status(404).json({ error: 'Lease not found for this booking' });
    }

    res.json(lease);
  } catch (error) {
    console.error('Error getting lease by booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases - List leases with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      propertyId,
      tenantId,
      landlordId,
      page = 1,
      limit = 20,
      orderBy = 'created_at DESC'
    } = req.query;

    const { role, id: userId } = req.user;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;

    // Filter based on user role
    if (!['admin', 'manager'].includes(role)) {
      if (role === 'landlord') {
        whereClause += ` AND l.landlord_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      } else if (role === 'tenant') {
        whereClause += ` AND l.tenant_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }
    }

    // Add additional filters
    if (status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (propertyId) {
      whereClause += ` AND l.property_id = $${paramIndex}`;
      queryParams.push(propertyId);
      paramIndex++;
    }

    if (tenantId) {
      whereClause += ` AND l.tenant_id = $${paramIndex}`;
      queryParams.push(tenantId);
      paramIndex++;
    }

    if (landlordId) {
      whereClause += ` AND l.landlord_id = $${paramIndex}`;
      queryParams.push(landlordId);
      paramIndex++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const leasesQuery = `
      SELECT 
        l.*,
        d.original_name,
        d.filename,
        p.title as property_title,
        p.address as property_address,
        tenant.name as tenant_name,
        tenant.email as tenant_email,
        landlord.name as landlord_name,
        landlord.email as landlord_email
      FROM leases l
      LEFT JOIN documents d ON l.document_id = d.id
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN users tenant ON l.tenant_id = tenant.id
      LEFT JOIN users landlord ON l.landlord_id = landlord.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const result = await query(leasesQuery, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leases l
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      leases: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing leases:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/leases/:id/status - Update lease status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const { role, id: userId } = req.user;

    // Get lease details
    const leaseQuery = 'SELECT * FROM leases WHERE id = $1';
    const leaseResult = await query(leaseQuery, [id]);

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    // Check permissions
    const canUpdate = 
      lease.tenant_id === userId ||
      lease.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updatedLease = await leaseGenerationService.updateLeaseStatus(id, status, notes);
    
    res.json(updatedLease);
  } catch (error) {
    console.error('Error updating lease status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leases/:id/sign - Sign lease
router.post('/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureData } = req.body;
    const { role, id: userId } = req.user;

    // Get lease details
    const leaseQuery = 'SELECT * FROM leases WHERE id = $1';
    const leaseResult = await query(leaseQuery, [id]);

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    // Check if user can sign this lease
    const canSign = 
      (lease.tenant_id === userId && !lease.tenant_signed) ||
      (lease.landlord_id === userId && !lease.landlord_signed) ||
      ['admin', 'manager'].includes(role);

    if (!canSign) {
      return res.status(403).json({ error: 'Insufficient permissions or already signed' });
    }

    // Update signature
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    if (lease.tenant_id === userId) {
      updateFields.push('tenant_signed = $1, tenant_signed_at = CURRENT_TIMESTAMP');
      updateValues.push(true);
    } else if (lease.landlord_id === userId) {
      updateFields.push('landlord_signed = $1, landlord_signed_at = CURRENT_TIMESTAMP');
      updateValues.push(true);
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE leases 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex + 1}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedLease = result.rows[0];

    // Update lease status if both parties have signed
    if (updatedLease.tenant_signed && updatedLease.landlord_signed) {
      await query(
        'UPDATE leases SET status = $1, executed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['executed', id]
      );
    }

    res.json(updatedLease);
  } catch (error) {
    console.error('Error signing lease:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases/statistics - Get lease statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    let landlordId = null;
    if (role === 'landlord') {
      landlordId = userId;
    }

    const statistics = await leaseGenerationService.getLeaseStatistics(landlordId);
    res.json(statistics);
  } catch (error) {
    console.error('Error getting lease statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leases/:id/payments - Get lease payment history
router.get('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Check permissions
    const leaseQuery = 'SELECT * FROM leases WHERE id = $1';
    const leaseResult = await query(leaseQuery, [id]);

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    const canView = 
      lease.tenant_id === userId ||
      lease.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const paymentsQuery = `
      SELECT * FROM lease_payments 
      WHERE lease_id = $1 
      ORDER BY payment_date DESC
    `;

    const result = await query(paymentsQuery, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting lease payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leases/:id/payments - Record lease payment
router.post('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;
    const { role, id: userId } = req.user;

    // Check permissions
    const leaseQuery = 'SELECT * FROM leases WHERE id = $1';
    const leaseResult = await query(leaseQuery, [id]);

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    const canRecord = 
      lease.tenant_id === userId ||
      lease.landlord_id === userId ||
      ['admin', 'manager'].includes(role);

    if (!canRecord) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const insertQuery = `
      INSERT INTO lease_payments (
        lease_id, payment_date, amount, payment_type, payment_method,
        status, notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id,
      paymentData.payment_date,
      paymentData.amount,
      paymentData.payment_type,
      paymentData.payment_method,
      paymentData.status || 'pending',
      paymentData.notes,
      userId
    ];

    const result = await query(insertQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording lease payment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
