const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Advanced property search with complex filters
router.get('/properties', authenticateToken, [
  query('query').optional().isString(),
  query('type').optional().isIn(['apartment', 'house', 'condo', 'townhouse', 'studio', 'all']),
  query('min_price').optional().isNumeric(),
  query('max_price').optional().isNumeric(),
  query('min_bedrooms').optional().isInt({ min: 0 }),
  query('max_bedrooms').optional().isInt({ min: 0 }),
  query('min_bathrooms').optional().isInt({ min: 0 }),
  query('max_bathrooms').optional().isInt({ min: 0 }),
  query('min_area').optional().isNumeric(),
  query('max_area').optional().isNumeric(),
  query('amenities').optional().isString(),
  query('city').optional().isString(),
  query('state').optional().isString(),
  query('zip_code').optional().isString(),
  query('neighborhood').optional().isString(),
  query('property_age').optional().isIn(['new', 'old', 'any']),
  query('parking').optional().isBoolean(),
  query('pet_friendly').optional().isBoolean(),
  query('furnished').optional().isBoolean(),
  query('available_from').optional().isISO8601(),
  query('lease_term').optional().isIn(['month-to-month', '6-months', '1-year', '2-years', 'any']),
  query('sort_by').optional().isIn(['price', 'bedrooms', 'bathrooms', 'area', 'created_at', 'featured']),
  query('sort_order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      query: searchQuery,
      type = 'all',
      min_price,
      max_price,
      min_bedrooms,
      max_bedrooms,
      min_bathrooms,
      max_bathrooms,
      min_area,
      max_area,
      amenities,
      city,
      state,
      zip_code,
      neighborhood,
      property_age = 'any',
      parking,
      pet_friendly,
      furnished,
      available_from,
      lease_term = 'any',
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    let whereConditions = ['p.status = $1'];
    let params = [1]; // $1 = status = 'available'
    let paramIndex = 2;

    // Text search
    if (searchQuery) {
      whereConditions.push(`(
        p.title ILIKE $${paramIndex} OR 
        p.description ILIKE $${paramIndex} OR 
        p.location->>'address' ILIKE $${paramIndex} OR
        p.location->>'city' ILIKE $${paramIndex} OR
        p.location->>'state' ILIKE $${paramIndex}
      )`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Property type
    if (type !== 'all') {
      whereConditions.push(`p.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    // Price range
    if (min_price) {
      whereConditions.push(`p.price >= $${paramIndex}`);
      params.push(min_price);
      paramIndex++;
    }
    if (max_price) {
      whereConditions.push(`p.price <= $${paramIndex}`);
      params.push(max_price);
      paramIndex++;
    }

    // Bedrooms range
    if (min_bedrooms) {
      whereConditions.push(`p.bedrooms >= $${paramIndex}`);
      params.push(min_bedrooms);
      paramIndex++;
    }
    if (max_bedrooms) {
      whereConditions.push(`p.bedrooms <= $${paramIndex}`);
      params.push(max_bedrooms);
      paramIndex++;
    }

    // Bathrooms range
    if (min_bathrooms) {
      whereConditions.push(`p.bathrooms >= $${paramIndex}`);
      params.push(min_bathrooms);
      paramIndex++;
    }
    if (max_bathrooms) {
      whereConditions.push(`p.bathrooms <= $${paramIndex}`);
      params.push(max_bathrooms);
      paramIndex++;
    }

    // Area range
    if (min_area) {
      whereConditions.push(`p.area >= $${paramIndex}`);
      params.push(min_area);
      paramIndex++;
    }
    if (max_area) {
      whereConditions.push(`p.area <= $${paramIndex}`);
      params.push(max_area);
      paramIndex++;
    }

    // Location filters
    if (city) {
      whereConditions.push(`p.location->>'city' ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }
    if (state) {
      whereConditions.push(`p.location->>'state' = $${paramIndex}`);
      params.push(state);
      paramIndex++;
    }
    if (zip_code) {
      whereConditions.push(`p.location->>'zipCode' = $${paramIndex}`);
      params.push(zip_code);
      paramIndex++;
    }
    if (neighborhood) {
      whereConditions.push(`p.location->>'neighborhood' ILIKE $${paramIndex}`);
      params.push(`%${neighborhood}%`);
      paramIndex++;
    }

    // Property age
    if (property_age !== 'any') {
      const ageCondition = property_age === 'new' 
        ? `p.year_built >= $${paramIndex}`
        : `p.year_built < $${paramIndex}`;
      whereConditions.push(ageCondition);
      params.push(property_age === 'new' ? 2015 : 1980);
      paramIndex++;
    }

    // Boolean filters
    if (parking !== undefined) {
      whereConditions.push(`p.parking = $${paramIndex}`);
      params.push(parking === 'true');
      paramIndex++;
    }
    if (pet_friendly !== undefined) {
      whereConditions.push(`p.pet_friendly = $${paramIndex}`);
      params.push(pet_friendly === 'true');
      paramIndex++;
    }
    if (furnished !== undefined) {
      whereConditions.push(`p.furnished = $${paramIndex}`);
      params.push(furnished === 'true');
      paramIndex++;
    }

    // Availability
    if (available_from) {
      whereConditions.push(`p.available_from <= $${paramIndex}`);
      params.push(available_from);
      paramIndex++;
    }

    // Lease term
    if (lease_term !== 'any') {
      whereConditions.push(`p.lease_term = $${paramIndex}`);
      params.push(lease_term);
      paramIndex++;
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      const amenityConditions = amenityList.map(() => `p.amenities ? $${paramIndex} : false`).join(' AND ');
      whereConditions.push(`(${amenityConditions})`);
      params.push(amenityList);
      paramIndex++;
    }

    // Build ORDER BY clause
    const validSortFields = {
      price: 'p.price',
      bedrooms: 'p.bedrooms',
      bathrooms: 'p.bathrooms',
      area: 'p.area',
      created_at: 'p.created_at',
      featured: 'p.featured DESC'
    };
    const sortField = validSortFields[sort_by] || 'p.created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Main query
    const propertySearchQuery = `
      SELECT 
        p.*,
        l.first_name || ' ' || l.last_name as landlord_name,
        l.email as landlord_email,
        l.phone as landlord_phone,
        l.rating as landlord_rating,
        -- Calculate price per square foot
        CASE WHEN p.area > 0 THEN ROUND(p.price / p.area, 2) ELSE 0 END as price_per_sqft,
        -- Calculate days on market
        EXTRACT(DAY FROM CURRENT_DATE - p.created_at) as days_on_market,
        -- Match score for relevance
        CASE 
          WHEN p.title ILIKE $${paramIndex} THEN 100
          WHEN p.description ILIKE $${paramIndex} THEN 80
          WHEN p.location->>'address' ILIKE $${paramIndex} THEN 60
          ELSE 40
        END as relevance_score
      FROM properties p
      LEFT JOIN users l ON p.landlord_id = l.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN $${paramIndex + 1} = 'featured' THEN p.featured DESC
          ELSE 0
        END DESC,
        ${sortField} ${sortDirection}
      LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}
    `;

    // Add search query parameter for relevance scoring
    if (searchQuery) {
      params.push(`%${searchQuery}%`);
    } else {
      params.push('%');
    }
    params.push(sort_by, limit, offset);

    const result = await pool.query(propertySearchQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM properties p
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -3));
    const total = parseInt(countResult.rows[0].total);

    // Get search suggestions based on current filters
    const suggestionsQuery = `
      SELECT DISTINCT 
        p.location->>'city' as city,
        p.location->>'neighborhood' as neighborhood,
        p.type as property_type,
        array_agg(DISTINCT unnest(p.amenities)) FILTER (WHERE p.amenities IS NOT NULL) as common_amenities
      FROM properties p
      WHERE p.status = 'available'
        ${city ? "AND p.location->>'city' ILIKE '%" + city + "%'" : ''}
        ${type !== 'all' ? "AND p.type = '" + type + "'" : ''}
      GROUP BY p.location->>'city', p.location->>'neighborhood', p.type
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;

    const suggestionsResult = await pool.query(suggestionsQuery);

    res.json({
      properties: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      suggestions: suggestionsResult.rows,
      filters_applied: {
        query: searchQuery,
        type,
        price_range: { min: min_price, max: max_price },
        bedrooms_range: { min: min_bedrooms, max: max_bedrooms },
        bathrooms_range: { min: min_bathrooms, max: max_bathrooms },
        area_range: { min: min_area, max: max_area },
        amenities: amenities ? amenities.split(',').map(a => a.trim()) : [],
        location: { city, state, zip_code, neighborhood },
        features: { property_age, parking, pet_friendly, furnished },
        availability: { available_from, lease_term }
      }
    });
  } catch (error) {
    console.error('Error in advanced property search:', error);
    res.status(500).json({ error: 'Failed to search properties' });
  }
});

// Get search filters and available options
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    const queries = await Promise.all([
      // Get unique cities
      pool.query(`
        SELECT DISTINCT location->>'city' as city, COUNT(*) as count
        FROM properties 
        WHERE status = 'available' AND location->>'city' IS NOT NULL
        GROUP BY location->>'city'
        ORDER BY count DESC
      `),
      
      // Get unique neighborhoods
      pool.query(`
        SELECT DISTINCT location->>'neighborhood' as neighborhood, COUNT(*) as count
        FROM properties 
        WHERE status = 'available' AND location->>'neighborhood' IS NOT NULL
        GROUP BY location->>'neighborhood'
        ORDER BY count DESC
        LIMIT 50
      `),
      
      // Get property types with counts
      pool.query(`
        SELECT type, COUNT(*) as count
        FROM properties 
        WHERE status = 'available'
        GROUP BY type
        ORDER BY count DESC
      `),
      
      // Get common amenities
      pool.query(`
        SELECT unnest(amenities) as amenity, COUNT(*) as count
        FROM properties 
        WHERE status = 'available' AND amenities IS NOT NULL
        GROUP BY unnest(amenities)
        ORDER BY count DESC
        LIMIT 20
      `),
      
      // Get price ranges
      pool.query(`
        SELECT 
          CASE 
            WHEN price < 1000 THEN 'Under $1,000'
            WHEN price < 2000 THEN '$1,000 - $2,000'
            WHEN price < 3000 THEN '$2,000 - $3,000'
            WHEN price < 4000 THEN '$3,000 - $4,000'
            WHEN price < 5000 THEN '$4,000 - $5,000'
            ELSE 'Over $5,000'
          END as price_range,
          COUNT(*) as count
        FROM properties 
        WHERE status = 'available'
        GROUP BY price_range
        ORDER BY MIN(price)
      `),
      
      // Get bedroom counts
      pool.query(`
        SELECT bedrooms, COUNT(*) as count
        FROM properties 
        WHERE status = 'available' AND bedrooms IS NOT NULL
        GROUP BY bedrooms
        ORDER BY bedrooms
      `),
      
      // Get bathroom counts
      pool.query(`
        SELECT bathrooms, COUNT(*) as count
        FROM properties 
        WHERE status = 'available' AND bathrooms IS NOT NULL
        GROUP BY bathrooms
        ORDER BY bathrooms
      `)
    ]);

    const [cities, neighborhoods, types, amenities, priceRanges, bedrooms, bathrooms] = queries;

    res.json({
      cities: cities.rows,
      neighborhoods: neighborhoods.rows,
      property_types: types.rows,
      amenities: amenities.rows,
      price_ranges: priceRanges.rows,
      bedroom_counts: bedrooms.rows,
      bathroom_counts: bathrooms.rows,
      lease_terms: [
        { value: 'month-to-month', label: 'Month-to-Month', count: 156 },
        { value: '6-months', label: '6 Months', count: 89 },
        { value: '1-year', label: '1 Year', count: 234 },
        { value: '2-years', label: '2 Years', count: 45 }
      ]
    });
  } catch (error) {
    console.error('Error fetching search filters:', error);
    res.status(500).json({ error: 'Failed to fetch search filters' });
  }
});

// Save search preferences
router.post('/save-search', authenticateToken, [
  body('name').notEmpty().withMessage('Search name is required'),
  body('filters').isObject().withMessage('Filters must be an object'),
  body('notifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, filters, notifications = false } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO saved_searches (user_id, name, filters, notifications, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, name, JSON.stringify(filters), notifications]);

    res.status(201).json({
      saved_search: result.rows[0],
      message: 'Search saved successfully'
    });
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// Get saved searches
router.get('/saved-searches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        ss.*,
        COUNT(*) OVER() as total_matches
      FROM saved_searches ss
      WHERE ss.user_id = $1
      ORDER BY ss.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      saved_searches: result.rows
    });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// Delete saved search
router.delete('/saved-searches/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      DELETE FROM saved_searches 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json({
      message: 'Saved search deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// Get search analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const queries = await Promise.all([
      // Popular searches
      pool.query(`
        SELECT 
          filters->>'query' as search_term,
          COUNT(*) as search_count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_session_duration
        FROM saved_searches 
        WHERE user_id = $1 AND updated_at > created_at
        GROUP BY filters->>'query'
        ORDER BY search_count DESC
        LIMIT 10
      `),
      
      // Most used filters
      pool.query(`
        SELECT 
          jsonb_each_text(filters) as filter_pair,
          COUNT(*) as usage_count
        FROM saved_searches 
        WHERE user_id = $1
        GROUP BY filter_pair
        ORDER BY usage_count DESC
        LIMIT 20
      `),
      
      // Search trends over time
      pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as searches_created,
          COUNT(CASE WHEN updated_at > created_at THEN 1 END) as searches_run
        FROM saved_searches 
        WHERE user_id = $1 AND created_at > CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `)
    ]);

    const [popularSearches, usedFilters, searchTrends] = queries;

    res.json({
      popular_searches: popularSearches.rows,
      most_used_filters: usedFilters.rows,
      search_trends: searchTrends.rows
    });
  } catch (error) {
    console.error('Error fetching search analytics:', error);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

module.exports = router;

// Map-based property search endpoint
router.get('/properties/map', authenticateToken, [
  query('north').isNumeric().withMessage('North bound is required'),
  query('south').isNumeric().withMessage('South bound is required'),
  query('east').isNumeric().withMessage('East bound is required'),
  query('west').isNumeric().withMessage('West bound is required'),
  query('type').optional().isIn(['apartment', 'house', 'condo', 'townhouse', 'studio', 'all']),
  query('min_price').optional().isNumeric(),
  query('max_price').optional().isNumeric(),
  query('min_bedrooms').optional().isInt({ min: 0 }),
  query('max_bedrooms').optional().isInt({ min: 0 }),
  query('min_bathrooms').optional().isInt({ min: 0 }),
  query('max_bathrooms').optional().isInt({ min: 0 }),
  query('amenities').optional().isString(),
  query('featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      north,
      south,
      east,
      west,
      type = 'all',
      min_price,
      max_price,
      min_bedrooms,
      max_bedrooms,
      min_bathrooms,
      max_bathrooms,
      amenities,
      featured
    } = req.query;

    // Build WHERE conditions for map bounds
    let whereConditions = [
      `p.status = 'available'`,
      `p.location->>'coordinates' IS NOT NULL`,
      `ST_Within(
        ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      )`
    ];
    
    let params = [west, south, east, north];
    let paramIndex = 5;

    // Add additional filters
    if (type !== 'all') {
      whereConditions.push(`p.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (min_price) {
      whereConditions.push(`p.price >= $${paramIndex}`);
      params.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      whereConditions.push(`p.price <= $${paramIndex}`);
      params.push(max_price);
      paramIndex++;
    }

    if (min_bedrooms) {
      whereConditions.push(`p.bedrooms >= $${paramIndex}`);
      params.push(min_bedrooms);
      paramIndex++;
    }

    if (max_bedrooms) {
      whereConditions.push(`p.bedrooms <= $${paramIndex}`);
      params.push(max_bedrooms);
      paramIndex++;
    }

    if (min_bathrooms) {
      whereConditions.push(`p.bathrooms >= $${paramIndex}`);
      params.push(min_bathrooms);
      paramIndex++;
    }

    if (max_bathrooms) {
      whereConditions.push(`p.bathrooms <= $${paramIndex}`);
      params.push(max_bathrooms);
      paramIndex++;
    }

    if (featured) {
      whereConditions.push(`p.featured = $${paramIndex}`);
      params.push(true);
      paramIndex++;
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      const amenityConditions = amenityList.map(() => `p.amenities ? $${paramIndex} : false`).join(' OR ');
      whereConditions.push(`(${amenityConditions})`);
      params.push(amenityList);
      paramIndex++;
    }

    const query = `
      SELECT 
        p.*,
        l.first_name || ' ' || l.last_name as landlord_name,
        l.email as landlord_email,
        l.phone as landlord_phone,
        l.rating as landlord_rating,
        -- Calculate distance from map center
        ST_Distance(
          ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
          ST_MakePoint($${paramIndex}, $${paramIndex + 1})::geography
        ) / 1609.34 as distance_from_center_miles,
        -- Calculate price per square foot
        CASE WHEN p.area > 0 THEN ROUND(p.price / p.area, 2) ELSE 0 END as price_per_sqft,
        -- Calculate days on market
        EXTRACT(DAY FROM CURRENT_DATE - p.created_at) as days_on_market
      FROM properties p
      LEFT JOIN users l ON p.landlord_id = l.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY distance_from_center_miles ASC, p.featured DESC, p.created_at DESC
      LIMIT 100
    `;

    // Add map center coordinates for distance calculation
    const centerLng = (parseFloat(west) + parseFloat(east)) / 2;
    const centerLat = (parseFloat(south) + parseFloat(north)) / 2;
    params.push(centerLng, centerLat);

    const result = await pool.query(query, params);

    res.json({
      properties: result.rows,
      bounds: { north, south, east, west },
      center: { lat: centerLat, lng: centerLng },
      total_found: result.rows.length
    });
  } catch (error) {
    console.error('Error in map property search:', error);
    res.status(500).json({ error: 'Failed to search properties in map area' });
  }
});
