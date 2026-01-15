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

// Get property valuation
router.post('/calculate', authenticateToken, [
  body('property_id').isUUID().withMessage('Valid property ID is required'),
  body('valuation_type').optional().isIn(['basic', 'comprehensive', 'investment']).withMessage('Invalid valuation type'),
  body('include_market_trends').optional().isBoolean(),
  body('include_comparables').optional().isBoolean(),
  body('include_neighborhood_factors').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      property_id,
      valuation_type = 'comprehensive',
      include_market_trends = true,
      include_comparables = true,
      include_neighborhood_factors = true
    } = req.body;

    // Get property details
    const propertyQuery = `
      SELECT 
        p.*,
        l.first_name || ' ' || l.last_name as landlord_name,
        l.rating as landlord_rating,
        -- Calculate price per square foot
        CASE WHEN p.area > 0 THEN ROUND(p.price / p.area, 2) ELSE 0 END as price_per_sqft,
        -- Calculate days on market
        EXTRACT(DAY FROM CURRENT_DATE - p.created_at) as days_on_market,
        -- Get neighborhood information
        n.name as neighborhood_name,
        n.city,
        n.state,
        -- Get neighborhood scores
        ns.walk_score,
        ns.transit_score,
        ns.school_score,
        ns.safety_score,
        ns.amenities_score,
        ns.overall_score as neighborhood_score
      FROM properties p
      LEFT JOIN users l ON p.landlord_id = l.id
      LEFT JOIN neighborhoods n ON ST_Within(
        ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
        n.boundary::geography
      )
      LEFT JOIN neighborhood_scores ns ON n.id = ns.neighborhood_id
      WHERE p.id = $1
    `;

    const propertyResult = await pool.query(propertyQuery, [property_id]);

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    // Get comparable properties
    let comparables = [];
    if (include_comparables) {
      const comparablesQuery = `
        SELECT 
          p.*,
          -- Calculate similarity score
          CASE 
            WHEN p.type = $2 THEN 30
            ELSE 0
          END +
          CASE 
            WHEN ABS(p.bedrooms - $3) <= 1 THEN 20
            WHEN ABS(p.bedrooms - $3) <= 2 THEN 10
            ELSE 0
          END +
          CASE 
            WHEN ABS(p.bathrooms - $4) <= 1 THEN 15
            WHEN ABS(p.bathrooms - $4) <= 2 THEN 8
            ELSE 0
          END +
          CASE 
            WHEN ABS(p.area - $5) / $5 <= 0.2 THEN 25
            WHEN ABS(p.area - $5) / $5 <= 0.4 THEN 15
            ELSE 0
          END +
          CASE 
            WHEN ST_DWithin(
              ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
              ST_MakePoint($6, $7)::geography,
              2000
            ) THEN 10
            ELSE 0
          END as similarity_score,
          -- Calculate price per square foot
          CASE WHEN p.area > 0 THEN ROUND(p.price / p.area, 2) ELSE 0 END as price_per_sqft,
          -- Calculate distance
          ST_Distance(
            ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
            ST_MakePoint($6, $7)::geography
          ) / 1000 as distance_km
        FROM properties p
        WHERE p.id != $1
          AND p.status = 'available'
          AND p.type = $2
          AND ST_DWithin(
            ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
            ST_MakePoint($6, $7)::geography,
            5000
          )
        ORDER BY similarity_score DESC, distance_km ASC
        LIMIT 10
      `;

      const comparablesResult = await pool.query(comparablesQuery, [
        property_id, property.type, property.bedrooms, property.bathrooms, 
        property.area, property.location.coordinates.lng, property.location.coordinates.lat
      ]);

      comparables = comparablesResult.rows;
    }

    // Get market trends
    let marketTrends = null;
    if (include_market_trends) {
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          AVG(price) as avg_price,
          AVG(CASE WHEN area > 0 THEN price / area ELSE 0 END) as avg_price_per_sqft,
          COUNT(*) as listings_count,
          AVG(EXTRACT(DAY FROM CURRENT_DATE - created_at)) as avg_days_on_market
        FROM properties p
        WHERE ST_Within(
          ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
          (SELECT boundary FROM neighborhoods WHERE name = $1)::geography
        )
          AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `;

      const trendsResult = await pool.query(trendsQuery, [property.neighborhood_name]);
      marketTrends = trendsResult.rows;
    }

    // Calculate valuation
    const valuation = calculatePropertyValuation(property, comparables, marketTrends, valuation_type);

    // Generate valuation report
    const report = {
      property: {
        id: property.id,
        title: property.title,
        address: property.location.address,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        current_price: property.price,
        price_per_sqft: property.price_per_sqft,
        days_on_market: property.days_on_market,
        neighborhood: {
          name: property.neighborhood_name,
          city: property.city,
          state: property.state,
          scores: {
            walkability: property.walk_score,
            transit: property.transit_score,
            schools: property.school_score,
            safety: property.safety_score,
            amenities: property.amenities_score,
            overall: property.neighborhood_score
          }
        }
      },
      valuation: valuation,
      comparables: comparables.map(comp => ({
        id: comp.id,
        title: comp.title,
        address: comp.location.address,
        price: comp.price,
        price_per_sqft: comp.price_per_sqft,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        area: comp.area,
        similarity_score: comp.similarity_score,
        distance_km: comp.distance_km
      })),
      market_trends: marketTrends,
      valuation_metadata: {
        valuation_type,
        calculation_date: new Date().toISOString(),
        data_sources: ['mls', 'public_records', 'market_data'],
        confidence_level: valuation.confidence_level,
        methodology: valuation.methodology
      }
    };

    res.json(report);
  } catch (error) {
    console.error('Error calculating property valuation:', error);
    res.status(500).json({ error: 'Failed to calculate property valuation' });
  }
});

// Get neighborhood market analysis
router.get('/market-analysis', authenticateToken, [
  query('neighborhood').notEmpty().withMessage('Neighborhood name is required'),
  query('property_type').optional().isIn(['apartment', 'house', 'condo', 'townhouse', 'studio']),
  query('timeframe').optional().isIn(['1m', '3m', '6m', '1y']).withMessage('Invalid timeframe')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { neighborhood, property_type, timeframe = '6m' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 6m
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // Get market data
    const marketQuery = `
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as new_listings,
        AVG(price) as avg_price,
        AVG(CASE WHEN area > 0 THEN price / area ELSE 0 END) as avg_price_per_sqft,
        AVG(EXTRACT(DAY FROM CURRENT_DATE - created_at)) as avg_days_on_market,
        COUNT(CASE WHEN status = 'rented' THEN 1 END) as rented_properties,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_properties
      FROM properties p
      JOIN neighborhoods n ON ST_Within(
        ST_MakePoint(p.location->>'coordinates'->>'lng', p.location->>'coordinates'->>'lat')::geography,
        n.boundary::geography
      )
      WHERE n.name ILIKE $1
        AND created_at >= $2
        AND created_at <= $3
        ${property_type ? 'AND p.type = $4' : ''}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `;

    const params = property_type ? 
      [neighborhood, startDate, endDate, property_type] : 
      [neighborhood, startDate, endDate];

    const marketResult = await pool.query(marketQuery, params);

    // Calculate market metrics
    const marketMetrics = calculateMarketMetrics(marketResult.rows);

    const analysis = {
      neighborhood,
      property_type: property_type || 'all',
      timeframe,
      data: marketResult.rows,
      metrics: marketMetrics,
      generated_at: new Date().toISOString()
    };

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching market analysis:', error);
    res.status(500).json({ error: 'Failed to fetch market analysis' });
  }
});

// Helper function to calculate property valuation
function calculatePropertyValuation(property, comparables, marketTrends, type) {
  const baseValuation = {
    estimated_value: property.price,
    value_range: { min: property.price * 0.9, max: property.price * 1.1 },
    price_per_sqft: property.price_per_sqft,
    confidence_level: 'Medium',
    methodology: 'Basic valuation'
  };

  if (type === 'basic') {
    return baseValuation;
  }

  // Comprehensive valuation
  let weightedPrice = property.price;
  let confidenceFactors = [];
  let methodology = [];

  // Comparable sales analysis (40% weight)
  if (comparables.length > 0) {
    const validComparables = comparables.filter(comp => comp.similarity_score > 50);
    if (validComparables.length >= 3) {
      const avgComparablePrice = validComparables.reduce((sum, comp) => sum + comp.price, 0) / validComparables.length;
      const comparablePricePerSqft = validComparables.reduce((sum, comp) => sum + comp.price_per_sqft, 0) / validComparables.length;
      
      weightedPrice = weightedPrice * 0.6 + avgComparablePrice * 0.4;
      confidenceFactors.push('Strong comparable data');
      methodology.push('Comparable sales analysis');
    }
  }

  // Market trends analysis (25% weight)
  if (marketTrends && marketTrends.length > 0) {
    const recentTrends = marketTrends.slice(-3); // Last 3 months
    const avgRecentPrice = recentTrends.reduce((sum, trend) => sum + trend.avg_price, 0) / recentTrends.length;
    const priceTrend = avgRecentPrice > property.price ? 'increasing' : 'decreasing';
    
    if (priceTrend === 'increasing') {
      weightedPrice = weightedPrice * 1.05; // 5% upward adjustment
    } else if (priceTrend === 'decreasing') {
      weightedPrice = weightedPrice * 0.95; // 5% downward adjustment
    }
    
    confidenceFactors.push('Market trend analysis');
    methodology.push('Market trend analysis');
  }

  // Neighborhood factors (20% weight)
  if (property.neighborhood_score) {
    let neighborhoodAdjustment = 1.0;
    
    if (property.neighborhood_score >= 80) {
      neighborhoodAdjustment = 1.1; // Premium neighborhood
      confidenceFactors.push('High neighborhood score');
    } else if (property.neighborhood_score >= 60) {
      neighborhoodAdjustment = 1.05; // Above average
    } else if (property.neighborhood_score < 40) {
      neighborhoodAdjustment = 0.95; // Below average
    }
    
    weightedPrice = weightedPrice * neighborhoodAdjustment;
    methodology.push('Neighborhood factor analysis');
  }

  // Property characteristics (15% weight)
  let propertyAdjustment = 1.0;
  
  // Age adjustment
  const propertyAge = new Date().getFullYear() - (property.year_built || 2000);
  if (propertyAge < 5) {
    propertyAdjustment *= 1.1; // New property premium
    confidenceFactors.push('New property');
  } else if (propertyAge > 30) {
    propertyAdjustment *= 0.9; // Age discount
  }

  // Amenities adjustment
  if (property.amenities && property.amenities.length > 5) {
    propertyAdjustment *= 1.05; // Amenity premium
  }

  // Features adjustment
  if (property.parking_spaces) {
    propertyAdjustment *= 1.03; // Parking premium
  }
  
  if (property.pet_friendly) {
    propertyAdjustment *= 1.02; // Pet-friendly premium
  }

  weightedPrice = weightedPrice * propertyAdjustment;
  methodology.push('Property characteristic analysis');

  // Calculate confidence level
  let confidenceLevel = 'Medium';
  if (confidenceFactors.length >= 4) {
    confidenceLevel = 'High';
  } else if (confidenceFactors.length <= 1) {
    confidenceLevel = 'Low';
  }

  // Calculate value range
  const variance = weightedPrice * 0.1; // 10% variance
  const valueRange = {
    min: Math.round(weightedPrice - variance),
    max: Math.round(weightedPrice + variance)
  };

  // Investment analysis (if requested)
  let investmentAnalysis = null;
  if (type === 'investment') {
    const monthlyRent = weightedPrice * 0.008; // Assume 0.8% monthly rent
    const annualRent = monthlyRent * 12;
    const grossYield = (annualRent / weightedPrice) * 100;
    
    // Estimate expenses (30% of rent)
    const monthlyExpenses = monthlyRent * 0.3;
    const annualExpenses = monthlyExpenses * 12;
    const netYield = ((annualRent - annualExpenses) / weightedPrice) * 100;
    
    investmentAnalysis = {
      estimated_monthly_rent: Math.round(monthlyRent),
      estimated_annual_rent: Math.round(annualRent),
      gross_rental_yield: Math.round(grossYield * 100) / 100,
      net_rental_yield: Math.round(netYield * 100) / 100,
      estimated_monthly_expenses: Math.round(monthlyExpenses),
      capitalization_rate: Math.round(netYield * 100) / 100
    };
    
    methodology.push('Investment analysis');
  }

  return {
    estimated_value: Math.round(weightedPrice),
    value_range,
    price_per_sqft: Math.round(weightedPrice / property.area),
    confidence_level: confidenceLevel,
    confidence_factors: confidenceFactors,
    methodology: methodology.join(', '),
    market_position: weightedPrice > property.price ? 'Above Market' : 'Below Market',
    adjustment_factors: {
      comparable_sales: comparables.length > 0,
      market_trends: marketTrends && marketTrends.length > 0,
      neighborhood_score: property.neighborhood_score > 0,
      property_characteristics: true
    },
    investment_analysis: investmentAnalysis
  };
}

// Helper function to calculate market metrics
function calculateMarketMetrics(data) {
  if (data.length === 0) {
    return {
      avg_price: 0,
      price_trend: 'Stable',
      avg_days_on_market: 0,
      inventory_level: 'Low',
      absorption_rate: 0
    };
  }

  const prices = data.map(d => d.avg_price);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  // Calculate price trend
  const midPoint = Math.floor(prices.length / 2);
  const firstHalf = prices.slice(0, midPoint);
  const secondHalf = prices.slice(midPoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, price) => sum + price, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, price) => sum + price, 0) / secondHalf.length;
  
  let priceTrend = 'Stable';
  if (secondHalfAvg > firstHalfAvg * 1.05) {
    priceTrend = 'Increasing';
  } else if (secondHalfAvg < firstHalfAvg * 0.95) {
    priceTrend = 'Decreasing';
  }

  // Calculate inventory level
  const totalListings = data.reduce((sum, d) => sum + d.new_listings, 0);
  const avgListings = totalListings / data.length;
  
  let inventoryLevel = 'Medium';
  if (avgListings > 20) {
    inventoryLevel = 'High';
  } else if (avgListings < 5) {
    inventoryLevel = 'Low';
  }

  // Calculate absorption rate
  const totalRented = data.reduce((sum, d) => sum + (d.rented_properties || 0), 0);
  const totalAvailable = data.reduce((sum, d) => sum + (d.available_properties || 0), 0);
  const absorptionRate = totalAvailable > 0 ? (totalRented / totalAvailable) * 100 : 0;

  return {
    avg_price: Math.round(avgPrice),
    price_trend: priceTrend,
    avg_days_on_market: Math.round(data.reduce((sum, d) => sum + d.avg_days_on_market, 0) / data.length),
    inventory_level: inventoryLevel,
    absorption_rate: Math.round(absorptionRate),
    total_listings: totalListings
  };
}

module.exports = router;
