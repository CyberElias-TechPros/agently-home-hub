const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('./auth');

const router = express.Router();

// Get all properties (public endpoint)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      minPrice,
      maxPrice,
      city,
      state,
      status = 'available',
      featured
    } = req.query;

    let whereClause = 'WHERE p.status = $1';
    let queryParams = [status];
    let paramIndex = 2;

    // Add filters
    if (search) {
      whereClause += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.city ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND p.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (minPrice) {
      whereClause += ` AND p.price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      whereClause += ` AND p.price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND p.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (state) {
      whereClause += ` AND p.state = $${paramIndex}`;
      queryParams.push(state);
      paramIndex++;
    }

    if (featured === 'true') {
      whereClause += ` AND p.featured = true`;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM properties p
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get properties with pagination
    const offset = (page - 1) * limit;
    const propertiesQuery = `
      SELECT 
        p.*,
        u.name as landlord_name,
        u.email as landlord_email,
        u.phone as landlord_phone
      FROM properties p
      LEFT JOIN users u ON p.landlord_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await query(propertiesQuery, queryParams);

    res.json({
      properties: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        p.*,
        u.name as landlord_name,
        u.email as landlord_email,
        u.phone as landlord_phone
      FROM properties p
      LEFT JOIN users u ON p.landlord_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Create property (landlord, manager, admin only)
router.post('/', authenticateToken, requireRole(['landlord', 'manager', 'admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      price,
      address_line1,
      address_line2,
      city,
      state,
      zip_code,
      country = 'USA',
      bedrooms = 0,
      bathrooms = 0,
      area_sqft,
      year_built,
      amenities = [],
      images = [],
      featured = false,
      available_from
    } = req.body;

    // Validation
    if (!title || !description || !type || !price || !address_line1 || !city || !state || !zip_code) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const validTypes = ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid property type' });
    }

    // Insert property
    const result = await query(`
      INSERT INTO properties (
        title, description, type, price, status, landlord_id,
        address_line1, address_line2, city, state, zip_code, country,
        bedrooms, bathrooms, area_sqft, year_built,
        amenities, images, featured, available_from
      ) VALUES (
        $1, $2, $3, $4, 'available', $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19
      ) RETURNING *
    `, [
      title, description, type, price, req.user.id,
      address_line1, address_line2, city, state, zip_code, country,
      bedrooms, bathrooms, area_sqft, year_built,
      amenities, images, featured, available_from
    ]);

    res.status(201).json({
      message: 'Property created successfully',
      property: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property (owner or admin/manager only)
router.put('/:id', authenticateToken, requireOwnershipOrRole(
  (req) => req.params.id, // This would need to be modified to get property.landlord_id
  ['admin', 'manager']
), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // First check if property exists and get landlord_id
    const propertyResult = await query('SELECT landlord_id FROM properties WHERE id = $1', [id]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    // Check ownership or admin role
    if (property.landlord_id !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only update your own properties' });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'type', 'price', 'status',
      'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
      'bedrooms', 'bathrooms', 'area_sqft', 'year_built',
      'amenities', 'images', 'featured', 'available_from'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // For WHERE clause

    const updateQuery = `
      UPDATE properties 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    res.json({
      message: 'Property updated successfully',
      property: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property (owner or admin only)
router.delete('/:id', authenticateToken, requireOwnershipOrRole(
  (req) => req.params.id, // This would need to be modified to get property.landlord_id
  ['admin']
), async (req, res) => {
  try {
    const { id } = req.params;

    // First check if property exists and get landlord_id
    const propertyResult = await query('SELECT landlord_id FROM properties WHERE id = $1', [id]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    // Check ownership or admin role
    if (property.landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own properties' });
    }

    // Check if property has active bookings
    const bookingResult = await query(
      'SELECT COUNT(*) as count FROM bookings WHERE property_id = $1 AND status IN ($2, $3)',
      [id, 'confirmed', 'pending']
    );

    if (parseInt(bookingResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete property with active bookings' 
      });
    }

    // Delete property
    await query('DELETE FROM properties WHERE id = $1', [id]);

    res.json({ message: 'Property deleted successfully' });

  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Get landlord's properties (landlord, manager, admin only)
router.get('/my/properties', authenticateToken, requireRole(['landlord', 'manager', 'admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let whereClause = 'WHERE p.landlord_id = $1';
    let queryParams = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT *
      FROM properties p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM properties p
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      properties: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching landlord properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

module.exports = router;
