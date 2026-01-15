const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('./auth');

const router = express.Router();

// Get all bookings for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let bookingsQuery;
    
    if (userRole === 'admin' || userRole === 'manager') {
      // Admins and managers can see all bookings
      bookingsQuery = `
        SELECT b.*, 
               p.title as property_title,
               p.location,
               u.name as tenant_name,
               u.email as tenant_email,
               ul.name as landlord_name
        FROM bookings b
        LEFT JOIN properties p ON b.property_id = p.id
        LEFT JOIN users u ON b.tenant_id = u.id
        LEFT JOIN users ul ON p.landlord_id = ul.id
        ORDER BY b.created_at DESC
      `;
    } else if (userRole === 'landlord') {
      // Landlords can see bookings for their properties
      bookingsQuery = `
        SELECT b.*, 
               p.title as property_title,
               p.location,
               u.name as tenant_name,
               u.email as tenant_email
        FROM bookings b
        LEFT JOIN properties p ON b.property_id = p.id
        LEFT JOIN users u ON b.tenant_id = u.id
        WHERE p.landlord_id = $1
        ORDER BY b.created_at DESC
      `;
    } else {
      // Tenants can only see their own bookings
      bookingsQuery = `
        SELECT b.*, 
               p.title as property_title,
               p.location,
               ul.name as landlord_name,
               ul.email as landlord_email
        FROM bookings b
        LEFT JOIN properties p ON b.property_id = p.id
        LEFT JOIN users ul ON p.landlord_id = ul.id
        WHERE b.tenant_id = $1
        ORDER BY b.created_at DESC
      `;
    }
    
    const result = await query(bookingsQuery, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const bookingQuery = `
      SELECT b.*, 
             p.title as property_title,
             p.location,
             p.landlord_id,
             u.name as tenant_name,
             u.email as tenant_email,
             ul.name as landlord_name,
             ul.email as landlord_email
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN users u ON b.tenant_id = u.id
      LEFT JOIN users ul ON p.landlord_id = ul.id
      WHERE b.id = $1
    `;
    
    const result = await query(bookingQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = result.rows[0];
    
    // Check authorization
    if (userRole === 'tenant' && booking.tenant_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (userRole === 'landlord' && booking.landlord_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking (tenants only)
router.post('/', authenticateToken, requireRole(['tenant']), async (req, res) => {
  try {
    const {
      propertyId,
      startDate,
      endDate,
      notes
    } = req.body;
    
    // Validate required fields
    if (!propertyId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: propertyId, startDate, endDate' 
      });
    }
    
    // Check if property exists and is available
    const propertyQuery = `
      SELECT p.*, u.name as landlord_name, u.email as landlord_email
      FROM properties p
      LEFT JOIN users u ON p.landlord_id = u.id
      WHERE p.id = $1 AND p.status = 'available'
    `;
    
    const propertyResult = await query(propertyQuery, [propertyId]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found or not available' });
    }
    
    const property = propertyResult.rows[0];
    
    // Check for booking conflicts
    const conflictQuery = `
      SELECT id FROM bookings
      WHERE property_id = $1
        AND status NOT IN ('cancelled', 'completed')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
    `;
    
    const conflictResult = await query(conflictQuery, [
      propertyId, startDate, endDate
    ]);
    
    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Property is already booked for these dates' 
      });
    }
    
    // Calculate total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = property.price * nights;
    
    // Create booking
    const insertQuery = `
      INSERT INTO bookings (
        property_id, tenant_id, start_date, end_date, 
        total_price, status, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
      RETURNING *
    `;
    
    const bookingResult = await query(insertQuery, [
      propertyId, req.user.id, startDate, endDate, 
      totalPrice, notes
    ]);
    
    const newBooking = bookingResult.rows[0];
    
    // Send notification to landlord (in a real app, this would send email/SMS)
    console.log(`New booking request for property ${propertyId} from tenant ${req.user.id}`);
    
    res.status(201).json({
      ...newBooking,
      property_title: property.title,
      landlord_name: property.landlord_name,
      total_nights: nights
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status (landlords and admins only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: pending, confirmed, cancelled, completed' 
      });
    }
    
    // Get booking with property info
    const bookingQuery = `
      SELECT b.*, p.landlord_id
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
    `;
    
    const bookingResult = await query(bookingQuery, [id]);
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Check authorization - only landlords of the property or admins/managers can update status
    if (userRole === 'landlord' && booking.landlord_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (userRole === 'tenant') {
      return res.status(403).json({ error: 'Tenants cannot update booking status' });
    }
    
    // Update booking
    const updateQuery = `
      UPDATE bookings 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await query(updateQuery, [status, id]);
    const updatedBooking = updateResult.rows[0];
    
    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Cancel booking (tenants can cancel their own bookings)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get booking
    const bookingQuery = `
      SELECT * FROM bookings WHERE id = $1
    `;
    
    const bookingResult = await query(bookingQuery, [id]);
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Check authorization
    if (userRole === 'tenant' && booking.tenant_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (userRole === 'landlord' && booking.landlord_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only allow cancellation of pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ 
        error: 'Cannot cancel completed or already cancelled bookings' 
      });
    }
    
    // Update booking status
    const updateQuery = `
      UPDATE bookings 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await query(updateQuery, [id]);
    const cancelledBooking = updateResult.rows[0];
    
    res.json(cancelledBooking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Get booking availability for a property
router.get('/availability/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate query parameters are required' 
      });
    }
    
    // Check if property exists
    const propertyQuery = `
      SELECT id, status FROM properties WHERE id = $1
    `;
    
    const propertyResult = await query(propertyQuery, [propertyId]);
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyResult.rows[0];
    
    if (property.status !== 'available') {
      return res.status(400).json({ error: 'Property is not available for booking' });
    }
    
    // Get existing bookings for the date range
    const bookingsQuery = `
      SELECT start_date, end_date, status
      FROM bookings
      WHERE property_id = $1
        AND status NOT IN ('cancelled', 'completed')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      ORDER BY start_date
    `;
    
    const bookingsResult = await query(bookingsQuery, [
      propertyId, startDate, endDate
    ]);
    
    res.json({
      propertyId,
      availableDates: bookingsResult.rows,
      isAvailable: bookingsResult.rows.length === 0
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

module.exports = router;
