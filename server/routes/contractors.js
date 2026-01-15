const express = require('express');
const { authenticateToken, requireRole } = require('./auth');
const { query } = require('../db');
const notificationService = require('../services/notificationService');

const router = express.Router();

// GET /api/contractors - Get all contractors (filtered by service and location)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { service, location, verified_only = false, page = 1, limit = 20 } = req.query;
    
    let whereClause = 'WHERE c.available = TRUE';
    let queryParams = [];
    let paramIndex = 1;

    // Filter by service
    if (service) {
      whereClause += ` AND c.services @> $${paramIndex}`;
      queryParams.push([service]);
      paramIndex++;
    }

    // Filter by location
    if (location) {
      whereClause += ` AND c.service_areas @> $${paramIndex}`;
      queryParams.push([location]);
      paramIndex++;
    }

    // Filter by verified status
    if (verified_only === 'true') {
      whereClause += ` AND c.verified = TRUE`;
    }

    const offset = (page - 1) * limit;

    const contractorsQuery = `
      SELECT 
        c.*,
        u.name as contact_name,
        u.email as contact_email,
        COUNT(ca.id) as completed_jobs,
        AVG(cr.rating) as avg_review_rating
      FROM contractors c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN contractor_assignments ca ON c.id = ca.contractor_id AND ca.status = 'completed'
      LEFT JOIN contractor_reviews cr ON c.id = cr.contractor_id
      ${whereClause}
      GROUP BY c.id, u.name, u.email
      ORDER BY c.rating DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(contractorsQuery, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contractors c
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      contractors: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

// GET /api/contractors/:id - Get specific contractor details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const contractorQuery = `
      SELECT 
        c.*,
        u.name as contact_name,
        u.email as contact_email,
        u.phone as contact_phone,
        COUNT(ca.id) as completed_jobs,
        AVG(cr.rating) as avg_review_rating,
        COUNT(cr.id) as review_count
      FROM contractors c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN contractor_assignments ca ON c.id = ca.contractor_id AND ca.status = 'completed'
      LEFT JOIN contractor_reviews cr ON c.id = cr.contractor_id
      WHERE c.id = $1
      GROUP BY c.id, u.name, u.email, u.phone
    `;

    const result = await query(contractorQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    const contractor = result.rows[0];

    // Get recent reviews
    const reviewsQuery = `
      SELECT 
        cr.*,
        u.name as reviewer_name,
        mr.title as request_title
      FROM contractor_reviews cr
      LEFT JOIN users u ON cr.reviewer_id = u.id
      LEFT JOIN maintenance_requests mr ON cr.maintenance_request_id = mr.id
      WHERE cr.contractor_id = $1
      ORDER BY cr.created_at DESC
      LIMIT 10
    `;

    const reviewsResult = await query(reviewsQuery, [id]);

    // Get availability for next 30 days
    const availabilityQuery = `
      SELECT *
      FROM contractor_availability
      WHERE contractor_id = $1
        AND date >= CURRENT_DATE
        AND date <= CURRENT_DATE + INTERVAL '30 days'
        AND available = TRUE
      ORDER BY date, start_time
    `;

    const availabilityResult = await query(availabilityQuery, [id]);

    res.json({
      ...contractor,
      reviews: reviewsResult.rows,
      availability: availabilityResult.rows
    });
  } catch (error) {
    console.error('Error fetching contractor:', error);
    res.status(500).json({ error: 'Failed to fetch contractor' });
  }
});

// POST /api/contractors - Create new contractor profile
router.post('/', authenticateToken, requireRole('contractor'), async (req, res) => {
  try {
    const {
      business_name,
      license_number,
      insurance_number,
      insurance_expiry,
      phone,
      website,
      services,
      service_areas,
      years_experience,
      specialties,
      business_hours,
      hourly_rate,
      service_call_fee
    } = req.body;

    const userId = req.user.id;

    // Check if contractor profile already exists for this user
    const existingQuery = 'SELECT id FROM contractors WHERE user_id = $1';
    const existingResult = await query(existingQuery, [userId]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Contractor profile already exists for this user' });
    }

    const insertQuery = `
      INSERT INTO contractors (
        user_id, business_name, license_number, insurance_number, insurance_expiry,
        phone, website, services, service_areas, years_experience, specialties,
        business_hours, hourly_rate, service_call_fee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      userId, business_name, license_number, insurance_number, insurance_expiry,
      phone, website, services, service_areas, years_experience, specialties,
      business_hours, hourly_rate, service_call_fee
    ];

    const result = await query(insertQuery, values);
    const newContractor = result.rows[0];

    res.status(201).json(newContractor);
  } catch (error) {
    console.error('Error creating contractor:', error);
    res.status(500).json({ error: 'Failed to create contractor profile' });
  }
});

// PUT /api/contractors/:id - Update contractor profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const updates = req.body;

    // Get current contractor to check permissions
    const currentQuery = 'SELECT * FROM contractors WHERE id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    const currentContractor = currentResult.rows[0];

    // Check permissions (contractor can update their own profile, admin/manager can update any)
    const canUpdate = 
      (role === 'contractor' && currentContractor.user_id === userId) ||
      ['admin', 'manager'].includes(role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Build dynamic update query
    const allowedFields = [
      'business_name', 'license_number', 'insurance_number', 'insurance_expiry',
      'phone', 'website', 'services', 'service_areas', 'years_experience',
      'specialties', 'business_hours', 'hourly_rate', 'service_call_fee',
      'verified', 'background_checked', 'insured', 'available'
    ];

    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${valueIndex}`);
        updateValues.push(updates[field]);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // Add WHERE clause parameter

    const updateQuery = `
      UPDATE contractors 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contractor:', error);
    res.status(500).json({ error: 'Failed to update contractor' });
  }
});

// POST /api/contractors/:id/assign - Assign contractor to maintenance request
router.post('/:id/assign', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { id: contractorId } = req.params;
    const { maintenance_request_id, quoted_amount, estimated_start_date, estimated_completion_date } = req.body;
    const landlordId = req.user.id;

    // Check if maintenance request exists and belongs to this landlord
    const requestQuery = 'SELECT * FROM maintenance_requests WHERE id = $1 AND landlord_id = $2';
    const requestResult = await query(requestQuery, [maintenance_request_id, landlordId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found or access denied' });
    }

    // Check if contractor exists and is available
    const contractorQuery = 'SELECT * FROM contractors WHERE id = $1 AND available = TRUE';
    const contractorResult = await query(contractorQuery, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found or not available' });
    }

    // Check if request is already assigned
    const existingAssignmentQuery = 'SELECT * FROM contractor_assignments WHERE maintenance_request_id = $1';
    const existingAssignmentResult = await query(existingAssignmentQuery, [maintenance_request_id]);

    if (existingAssignmentResult.rows.length > 0) {
      return res.status(400).json({ error: 'Maintenance request is already assigned' });
    }

    // Create assignment
    const insertQuery = `
      INSERT INTO contractor_assignments (
        maintenance_request_id, contractor_id, assigned_by, quoted_amount,
        estimated_start_date, estimated_completion_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      maintenance_request_id, contractorId, landlordId, quoted_amount,
      estimated_start_date, estimated_completion_date
    ];

    const result = await query(insertQuery, values);
    const assignment = result.rows[0];

    // Update maintenance request status
    await query(
      'UPDATE maintenance_requests SET status = $1, contractor_id = $2, assigned_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['assigned', contractorId, maintenance_request_id]
    );

    // Notify contractor (in a real implementation, this would send email/SMS)
    console.log(`Contractor ${contractorId} assigned to maintenance request ${maintenance_request_id}`);

    // Send notifications
    try {
      // Get contractor details for notification
      const contractorDetailsQuery = `
        SELECT c.*, u.name as contractor_name, u.email as contractor_email, u.phone as contractor_phone
        FROM contractors c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `;
      const contractorDetailsResult = await query(contractorDetailsQuery, [contractorId]);
      const contractor = contractorDetailsResult.rows[0];

      // Notify contractor
      await notificationService.sendNotification('contractor_assigned', contractor.user_id, {
        id: maintenance_request_id,
        title: requestResult.rows[0].title,
        category: requestResult.rows[0].category,
        priority: requestResult.rows[0].priority,
        propertyAddress: requestResult.rows[0].property_address || 'Property Address',
        description: requestResult.rows[0].description,
        accessInstructions: requestResult.rows[0].access_instructions,
        quotedAmount: quoted_amount,
        landlordName: req.user.name,
        landlordPhone: req.user.phone
      });

      // Notify tenant about assignment
      await notificationService.sendNotification('maintenance_request_assigned', requestResult.rows[0].tenant_id, {
        id: maintenance_request_id,
        title: requestResult.rows[0].title,
        contractorName: contractor.business_name,
        contractorPhone: contractor.phone,
        estimatedStartDate: estimated_start_date,
        quotedAmount: quoted_amount
      });

    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the assignment if notifications fail
    }

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning contractor:', error);
    res.status(500).json({ error: 'Failed to assign contractor' });
  }
});

// PUT /api/contractors/assignments/:id/status - Update assignment status
router.put('/assignments/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
    const { status, contractor_notes, actual_amount } = req.body;
    const { role, id: userId } = req.user;

    // Get current assignment
    const currentQuery = 'SELECT * FROM contractor_assignments WHERE id = $1';
    const currentResult = await query(currentQuery, [assignmentId]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = currentResult.rows[0];

    // Check permissions
    const canUpdate = 
      (role === 'contractor' && assignment.contractor_id === userId) ||
      (role === 'landlord' && assignment.assigned_by === userId) ||
      ['admin', 'manager'].includes(role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update assignment
    const updateQuery = `
      UPDATE contractor_assignments 
      SET status = $1, contractor_notes = $2, actual_amount = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await query(updateQuery, [status, contractor_notes, actual_amount, assignmentId]);
    const updatedAssignment = result.rows[0];

    // Update maintenance request status based on assignment status
    let requestStatus = status;
    if (status === 'completed') {
      requestStatus = 'completed';
      await query(
        'UPDATE maintenance_requests SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [requestStatus, assignment.maintenance_request_id]
      );
    } else {
      await query(
        'UPDATE maintenance_requests SET status = $1 WHERE id = $2',
        [requestStatus, assignment.maintenance_request_id]
      );
    }

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

// GET /api/contractors/assignments - Get contractor assignments
router.get('/assignments', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let whereClause = '';
    let queryParams = [];

    // Filter based on user role
    if (role === 'contractor') {
      whereClause = 'WHERE ca.contractor_id = $1';
      queryParams = [userId];
    } else if (role === 'landlord') {
      whereClause = 'WHERE ca.assigned_by = $1';
      queryParams = [userId];
    } else if (role === 'admin' || role === 'manager') {
      // Admin/manager can see all assignments
      whereClause = '';
      queryParams = [];
    }

    const assignmentsQuery = `
      SELECT 
        ca.*,
        mr.title as request_title,
        mr.description as request_description,
        mr.category as request_category,
        mr.priority as request_priority,
        p.title as property_title,
        p.address as property_address,
        c.business_name as contractor_name,
        landlord.name as landlord_name,
        tenant.name as tenant_name
      FROM contractor_assignments ca
      LEFT JOIN maintenance_requests mr ON ca.maintenance_request_id = mr.id
      LEFT JOIN properties p ON mr.property_id = p.id
      LEFT JOIN contractors c ON ca.contractor_id = c.id
      LEFT JOIN users landlord ON mr.landlord_id = landlord.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `;

    const result = await query(assignmentsQuery, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/contractors/:id/reviews - Add review for contractor
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id: contractorId } = req.params;
    const {
      maintenance_request_id,
      rating,
      title,
      comment,
      professionalism_rating,
      quality_rating,
      timeliness_rating,
      communication_rating,
      value_rating
    } = req.body;
    const reviewerId = req.user.id;

    // Verify the maintenance request belongs to the reviewer and is completed
    const requestQuery = `
      SELECT mr.* FROM maintenance_requests mr
      LEFT JOIN contractor_assignments ca ON mr.id = ca.maintenance_request_id
      WHERE mr.id = $1 AND mr.tenant_id = $2 AND mr.status = 'completed'
    `;
    const requestResult = await query(requestQuery, [maintenance_request_id, reviewerId]);

    if (requestResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot review this maintenance request' });
    }

    // Check if review already exists
    const existingReviewQuery = 'SELECT * FROM contractor_reviews WHERE maintenance_request_id = $1 AND reviewer_id = $2';
    const existingReviewResult = await query(existingReviewQuery, [maintenance_request_id, reviewerId]);

    if (existingReviewResult.rows.length > 0) {
      return res.status(400).json({ error: 'Review already exists for this maintenance request' });
    }

    // Create review
    const insertQuery = `
      INSERT INTO contractor_reviews (
        contractor_id, maintenance_request_id, reviewer_id, rating, title, comment,
        professionalism_rating, quality_rating, timeliness_rating, communication_rating, value_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      contractorId, maintenance_request_id, reviewerId, rating, title, comment,
      professionalism_rating, quality_rating, timeliness_rating, communication_rating, value_rating
    ];

    const result = await query(insertQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/contractors/services - Get available service categories
router.get('/services', authenticateToken, (req, res) => {
  try {
    const services = [
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'appliance', label: 'Appliance Repair' },
      { value: 'structural', label: 'Structural' },
      { value: 'pest_control', label: 'Pest Control' },
      { value: 'cleaning', label: 'Cleaning Services' },
      { value: 'painting', label: 'Painting' },
      { value: 'landscaping', label: 'Landscaping' },
      { value: 'roofing', label: 'Roofing' },
      { value: 'flooring', label: 'Flooring' },
      { value: 'windows', label: 'Windows & Doors' },
      { value: 'other', label: 'Other' }
    ];
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

module.exports = router;
