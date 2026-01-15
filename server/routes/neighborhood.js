const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get neighborhood insights for a location
router.get('/insights', authenticateToken, [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radius').optional().isInt({ min: 100, max: 5000 }).withMessage('Radius must be between 100-5000 meters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng, radius = 1000 } = req.query;

    // Get neighborhood information from database
    const neighborhoodQuery = `
      SELECT 
        n.*,
        -- Calculate distance from center point
        ST_Distance(
          ST_MakePoint($1, $2)::geography,
          n.center_point::geography
        ) / 1000 as distance_km
      FROM neighborhoods n
      WHERE ST_DWithin(
        ST_MakePoint($1, $2)::geography,
        n.center_point::geography,
        $3
      )
      ORDER BY distance_km
      LIMIT 1
    `;

    const neighborhoodResult = await pool.query(neighborhoodQuery, [lng, lat, radius]);

    if (neighborhoodResult.rows.length === 0) {
      return res.status(404).json({ error: 'No neighborhood data found for this location' });
    }

    const neighborhood = neighborhoodResult.rows[0];

    // Get demographic data
    const demographicsQuery = `
      SELECT * FROM neighborhood_demographics 
      WHERE neighborhood_id = $1
    `;
    const demographicsResult = await pool.query(demographicsQuery, [neighborhood.id]);

    // Get crime statistics
    const crimeQuery = `
      SELECT * FROM neighborhood_crime_stats 
      WHERE neighborhood_id = $1 
      ORDER BY year DESC, month DESC 
      LIMIT 12
    `;
    const crimeResult = await pool.query(crimeQuery, [neighborhood.id]);

    // Get school ratings
    const schoolsQuery = `
      SELECT 
        s.*,
        ST_Distance(
          ST_MakePoint($1, $2)::geography,
          s.location::geography
        ) / 1000 as distance_km
      FROM schools s
      WHERE ST_DWithin(
        ST_MakePoint($1, $2)::geography,
        s.location::geography,
        3000
      )
      ORDER BY distance_km
      LIMIT 20
    `;
    const schoolsResult = await pool.query(schoolsQuery, [lng, lat]);

    // Get nearby amenities
    const amenitiesQuery = `
      SELECT 
        a.*,
        a.type as category,
        ST_Distance(
          ST_MakePoint($1, $2)::geography,
          a.location::geography
        ) / 1000 as distance_km,
        -- Calculate amenity score based on type and rating
        CASE 
          WHEN a.type = 'grocery' THEN 0.9
          WHEN a.type = 'restaurant' THEN 0.8
          WHEN a.type = 'park' THEN 0.85
          WHEN a.type = 'hospital' THEN 0.95
          WHEN a.type = 'school' THEN 0.9
          WHEN a.type = 'shopping' THEN 0.8
          ELSE 0.7
        END * (a.rating / 5) as amenity_score
      FROM amenities a
      WHERE ST_DWithin(
        ST_MakePoint($1, $2)::geography,
        a.location::geography,
        $3
      )
      ORDER BY amenity_score DESC, distance_km
      LIMIT 50
    `;
    const amenitiesResult = await pool.query(amenitiesQuery, [lng, lat, radius]);

    // Get transportation options
    const transportQuery = `
      SELECT 
        t.*,
        ST_Distance(
          ST_MakePoint($1, $2)::geography,
          t.location::geography
        ) / 1000 as distance_km
      FROM public_transport t
      WHERE ST_DWithin(
        ST_MakePoint($1, $2)::geography,
        t.location::geography,
        1000
      )
      ORDER BY distance_km
      LIMIT 20
    `;
    const transportResult = await pool.query(transportQuery, [lng, lat]);

    // Calculate neighborhood scores
    const walkScore = calculateWalkScore(amenitiesResult.rows, radius);
    const transitScore = calculateTransitScore(transportResult.rows, radius);
    const schoolScore = calculateSchoolScore(schoolsResult.rows);
    const safetyScore = calculateSafetyScore(crimeResult.rows);
    const amenitiesScore = calculateAmenitiesScore(amenitiesResult.rows);

    // Get nearby properties for comparison
    const propertiesQuery = `
      SELECT 
        p.*,
        ST_Distance(
          ST_MakePoint($1, $2)::geography,
          ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography
        ) / 1000 as distance_km,
        -- Calculate price per square foot
        CASE WHEN p.area > 0 THEN ROUND(p.price / p.area, 2) ELSE 0 END as price_per_sqft
      FROM properties p
      WHERE p.status = 'available'
        AND ST_DWithin(
          ST_MakePoint($1, $2)::geography,
          ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
          $3
        )
      ORDER BY distance_km
      LIMIT 10
    `;
    const propertiesResult = await pool.query(propertiesQuery, [lng, lat, radius]);

    // Calculate market insights
    const marketInsights = calculateMarketInsights(propertiesResult.rows);

    const insights = {
      neighborhood: {
        ...neighborhood,
        demographics: demographicsResult.rows[0] || null,
        scores: {
          walkability: walkScore,
          transit: transitScore,
          schools: schoolScore,
          safety: safetyScore,
          amenities: amenitiesScore,
          overall: Math.round((walkScore + transitScore + schoolScore + safetyScore + amenitiesScore) / 5)
        }
      },
      nearby_schools: schoolsResult.rows,
      nearby_amenities: amenitiesResult.rows,
      public_transport: transportResult.rows,
      crime_statistics: crimeResult.rows,
      nearby_properties: propertiesResult.rows,
      market_insights: marketInsights,
      generated_at: new Date().toISOString()
    };

    res.json(insights);
  } catch (error) {
    console.error('Error fetching neighborhood insights:', error);
    res.status(500).json({ error: 'Failed to fetch neighborhood insights' });
  }
});

// Get neighborhood comparison
router.get('/compare', authenticateToken, [
  query('neighborhoods').isArray().withMessage('Neighborhoods array is required'),
  query('neighborhoods.*').isUUID().withMessage('Valid neighborhood IDs are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { neighborhoods } = req.query;

    // Get data for all requested neighborhoods
    const neighborhoodsQuery = `
      SELECT 
        n.*,
        nd.*,
        -- Get average property prices
        (
          SELECT ROUND(AVG(p.price))
          FROM properties p
          WHERE ST_Within(
            ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
            n.boundary::geography
          )
            AND p.status = 'available'
        ) as avg_property_price,
        -- Get property count
        (
          SELECT COUNT(*)
          FROM properties p
          WHERE ST_Within(
            ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
            n.boundary::geography
          )
            AND p.status = 'available'
        ) as available_properties
      FROM neighborhoods n
      LEFT JOIN neighborhood_demographics nd ON n.id = nd.neighborhood_id
      WHERE n.id = ANY($1)
    `;

    const result = await pool.query(neighborhoodsQuery, [neighborhoods]);

    // Calculate scores for each neighborhood
    const comparisons = result.rows.map(neighborhood => ({
      ...neighborhood,
      scores: {
        walkability: Math.floor(Math.random() * 30) + 70, // Mock calculation
        transit: Math.floor(Math.random() * 25) + 65,
        schools: Math.floor(Math.random() * 20) + 75,
        safety: Math.floor(Math.random() * 35) + 60,
        amenities: Math.floor(Math.random() * 25) + 70,
        overall: 0
      }
    }));

    // Calculate overall scores
    comparisons.forEach(comp => {
      comp.scores.overall = Math.round(
        (comp.scores.walkability + comp.scores.transit + comp.scores.schools + 
         comp.scores.safety + comp.scores.amenities) / 5
      );
    });

    // Sort by overall score
    comparisons.sort((a, b) => b.scores.overall - a.scores.overall);

    res.json({
      neighborhoods: comparisons,
      comparison_summary: {
        best_overall: comparisons[0],
        most_affordable: comparisons.reduce((min, curr) => 
          curr.avg_property_price < min.avg_property_price ? curr : min
        ),
        most_properties: comparisons.reduce((max, curr) => 
          curr.available_properties > max.available_properties ? curr : max
        ),
        safest: comparisons.reduce((safest, curr) => 
          curr.scores.safety > safest.scores.safety ? curr : safest
        )
      }
    });
  } catch (error) {
    console.error('Error comparing neighborhoods:', error);
    res.status(500).json({ error: 'Failed to compare neighborhoods' });
  }
});

// Get neighborhood trends
router.get('/trends', authenticateToken, [
  query('neighborhood_id').isUUID().withMessage('Valid neighborhood ID is required'),
  query('period').optional().isIn(['1m', '3m', '6m', '1y', '2y']).withMessage('Invalid period')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { neighborhood_id, period = '1y' } = req.query;

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '2y':
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      default: // 1y
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get price trends
    const priceTrendsQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as listings_count
      FROM properties p
      WHERE ST_Within(
        ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
        (SELECT boundary FROM neighborhoods WHERE id = $1)::geography
      )
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const priceTrendsResult = await pool.query(priceTrendsQuery, [neighborhood_id, startDate, endDate]);

    // Get crime trends
    const crimeTrendsQuery = `
      SELECT 
        year,
        month,
        total_incidents,
        property_crime,
        violent_crime,
        safety_score
      FROM neighborhood_crime_stats
      WHERE neighborhood_id = $1
        AND (year > EXTRACT(YEAR FROM $2) OR 
             (year = EXTRACT(YEAR FROM $2) AND month >= EXTRACT(MONTH FROM $2)))
        AND (year < EXTRACT(YEAR FROM $3) OR 
             (year = EXTRACT(YEAR FROM $3) AND month <= EXTRACT(MONTH FROM $3)))
      ORDER BY year ASC, month ASC
    `;

    const crimeTrendsResult = await pool.query(crimeTrendsQuery, [neighborhood_id, startDate, endDate]);

    // Get demand trends (views, inquiries)
    const demandTrendsQuery = `
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) as unique_viewers,
        AVG(CASE WHEN action_type = 'inquiry' THEN 1 ELSE 0 END) as inquiries
      FROM property_analytics pa
      JOIN properties p ON pa.property_id = p.id
      WHERE ST_Within(
        ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
        (SELECT boundary FROM neighborhoods WHERE id = $1)::geography
      )
        AND pa.created_at >= $2
        AND pa.created_at <= $3
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `;

    const demandTrendsResult = await pool.query(demandTrendsQuery, [neighborhood_id, startDate, endDate]);

    const trends = {
      price_trends: priceTrendsResult.rows,
      crime_trends: crimeTrendsResult.rows,
      demand_trends: demandTrendsResult.rows,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      generated_at: new Date().toISOString()
    };

    res.json(trends);
  } catch (error) {
    console.error('Error fetching neighborhood trends:', error);
    res.status(500).json({ error: 'Failed to fetch neighborhood trends' });
  }
});

// Helper functions for score calculations
function calculateWalkScore(amenities, radius) {
  const essentialAmenities = amenities.filter(a => 
    ['grocery', 'restaurant', 'pharmacy', 'bank'].includes(a.type)
  );
  
  const score = Math.min(100, (essentialAmenities.length / 10) * 100);
  return Math.round(score);
}

function calculateTransitScore(transport, radius) {
  const busStops = transport.filter(t => t.type === 'bus_stop').length;
  const trainStations = transport.filter(t => t.type === 'train_station').length;
  
  const score = Math.min(100, ((busStops * 20) + (trainStations * 40)));
  return Math.round(score);
}

function calculateSchoolScore(schools) {
  if (schools.length === 0) return 0;
  
  const avgRating = schools.reduce((sum, school) => sum + (school.rating || 0), 0) / schools.length;
  return Math.round(avgRating * 20); // Scale to 0-100
}

function calculateSafetyScore(crimeStats) {
  if (crimeStats.length === 0) return 75; // Default score
  
  const recentStats = crimeStats.slice(0, 3); // Last 3 months
  const avgIncidents = recentStats.reduce((sum, stat) => sum + stat.total_incidents, 0) / recentStats.length;
  
  // Lower incidents = higher safety score
  const score = Math.max(0, 100 - (avgIncidents * 2));
  return Math.round(score);
}

function calculateAmenitiesScore(amenities) {
  if (amenities.length === 0) return 0;
  
  const avgRating = amenities.reduce((sum, amenity) => sum + (amenity.rating || 0), 0) / amenities.length;
  const diversity = Math.min(1, amenities.length / 20); // Normalize diversity
  
  return Math.round((avgRating / 5) * 100 * diversity);
}

function calculateMarketInsights(properties) {
  if (properties.length === 0) {
    return {
      avg_price: 0,
      price_range: { min: 0, max: 0 },
      avg_price_per_sqft: 0,
      inventory_level: 'Low',
      market_trend: 'Stable'
    };
  }

  const prices = properties.map(p => p.price);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const avgPricePerSqft = properties.reduce((sum, p) => sum + (p.price_per_sqft || 0), 0) / properties.length;
  
  let inventoryLevel = 'Low';
  if (properties.length > 10) inventoryLevel = 'Medium';
  if (properties.length > 20) inventoryLevel = 'High';
  
  return {
    avg_price: Math.round(avgPrice),
    price_range: {
      min: Math.min(...prices),
      max: Math.max(...prices)
    },
    avg_price_per_sqft: Math.round(avgPricePerSqft),
    inventory_level: inventoryLevel,
    market_trend: 'Stable', // This would be calculated from historical data
    total_listings: properties.length
  };
}

module.exports = router;
