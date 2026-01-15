const { query } = require('../db');
const documentStorageService = require('./documentStorageService');

class LeaseGenerationService {
  /**
   * Generate a lease agreement from booking information
   */
  async generateLeaseFromBooking(bookingId, customTerms = {}) {
    try {
      // Get booking details
      const bookingQuery = `
        SELECT 
          b.*,
          p.title as property_title,
          p.address as property_address,
          p.city as property_city,
          p.state as property_state,
          p.zip_code as property_zip,
          p.bedrooms,
          p.bathrooms,
          p.area,
          p.amenities,
          landlord.name as landlord_name,
          landlord.email as landlord_email,
          landlord.phone as landlord_phone,
          landlord.address as landlord_address,
          tenant.name as tenant_name,
          tenant.email as tenant_email,
          tenant.phone as tenant_phone,
          tenant.address as tenant_address
        FROM bookings b
        LEFT JOIN properties p ON b.property_id = p.id
        LEFT JOIN users landlord ON p.landlord_id = landlord.id
        LEFT JOIN users tenant ON b.tenant_id = tenant.id
        WHERE b.id = $1
      `;

      const bookingResult = await query(bookingQuery, [bookingId]);

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      // Get lease template
      const templateQuery = `
        SELECT * FROM document_templates 
        WHERE template_type = 'lease' AND is_active = TRUE 
        ORDER BY is_system_template DESC, usage_count DESC
        LIMIT 1
      `;

      const templateResult = await query(templateQuery);
      
      if (templateResult.rows.length === 0) {
        throw new Error('No lease template found');
      }

      const template = templateResult.rows[0];

      // Prepare lease variables
      const leaseVariables = {
        ...this.extractLeaseVariables(booking, customTerms),
        lease_date: new Date().toLocaleDateString(),
        start_date: new Date(booking.start_date).toLocaleDateString(),
        end_date: new Date(booking.end_date).toLocaleDateString(),
        rent_amount: booking.total_price / 12, // Monthly rent
        rent_due_day: 1,
        security_deposit: booking.total_price * 0.1, // 10% of total
        utilities_clause: this.generateUtilitiesClause(booking),
        maintenance_clause: this.generateMaintenanceClause(booking),
        pets_clause: this.generatePetsClause(booking),
        termination_clause: this.generateTerminationClause(booking)
      };

      // Generate lease content
      const leaseContent = this.replaceTemplateVariables(template.template_content, leaseVariables);

      // Create lease document
      const leaseDocument = await this.createLeaseDocument(
        leaseContent,
        booking,
        template,
        leaseVariables
      );

      // Update booking status
      await query(
        'UPDATE bookings SET lease_generated = TRUE, lease_document_id = $1 WHERE id = $2',
        [leaseDocument.id, bookingId]
      );

      return leaseDocument;
    } catch (error) {
      console.error('Error generating lease from booking:', error);
      throw error;
    }
  }

  /**
   * Generate a custom lease with provided data
   */
  async generateCustomLease(leaseData) {
    try {
      const {
        templateId,
        propertyId,
        tenantId,
        landlordId,
        startDate,
        endDate,
        rentAmount,
        securityDeposit,
        customTerms,
        metadata
      } = leaseData;

      // Get template
      const templateQuery = 'SELECT * FROM document_templates WHERE id = $1 AND is_active = TRUE';
      const templateResult = await query(templateQuery, [templateId]);

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = templateResult.rows[0];

      // Get property and user details
      const detailsQuery = `
        SELECT 
          p.title as property_title,
          p.address as property_address,
          p.city as property_city,
          p.state as property_state,
          p.zip_code as property_zip,
          landlord.name as landlord_name,
          landlord.email as landlord_email,
          landlord.phone as landlord_phone,
          landlord.address as landlord_address,
          tenant.name as tenant_name,
          tenant.email as tenant_email,
          tenant.phone as tenant_phone,
          tenant.address as tenant_address
        FROM properties p
        LEFT JOIN users landlord ON p.landlord_id = landlord.id
        LEFT JOIN users tenant ON $3 = tenant.id
        WHERE p.id = $1
      `;

      const detailsResult = await query(detailsQuery, [propertyId, landlordId, tenantId]);

      if (detailsResult.rows.length === 0) {
        throw new Error('Property or user details not found');
      }

      const details = detailsResult.rows[0];

      // Prepare lease variables
      const leaseVariables = {
        ...details,
        lease_date: new Date().toLocaleDateString(),
        start_date: new Date(startDate).toLocaleDateString(),
        end_date: new Date(endDate).toLocaleDateString(),
        rent_amount: rentAmount,
        rent_due_day: 1,
        security_deposit: securityDeposit || rentAmount,
        utilities_clause: customTerms?.utilities || 'Tenant is responsible for all utilities.',
        maintenance_clause: customTerms?.maintenance || 'Landlord is responsible for major repairs and maintenance.',
        pets_clause: customTerms?.pets || 'No pets allowed without written consent.',
        termination_clause: customTerms?.termination || '30 days written notice required for termination.',
        ...customTerms
      };

      // Generate lease content
      const leaseContent = this.replaceTemplateVariables(template.template_content, leaseVariables);

      // Create lease document
      const leaseDocument = await this.createLeaseDocument(
        leaseContent,
        { id: 'custom', ...details },
        template,
        leaseVariables,
        metadata
      );

      return leaseDocument;
    } catch (error) {
      console.error('Error generating custom lease:', error);
      throw error;
    }
  }

  /**
   * Extract lease variables from booking data
   */
  extractLeaseVariables(booking, customTerms = {}) {
    return {
      property_address: `${booking.property_address}, ${booking.property_city}, ${booking.property_state} ${booking.property_zip}`,
      landlord_name: booking.landlord_name,
      landlord_address: booking.landlord_address || booking.property_address,
      landlord_phone: booking.landlord_phone,
      landlord_email: booking.landlord_email,
      tenant_name: booking.tenant_name,
      tenant_address: booking.tenant_address,
      tenant_phone: booking.tenant_phone,
      tenant_email: booking.tenant_email,
      property_title: booking.property_title,
      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      area: booking.area,
      amenities: booking.amenities?.join(', ') || '',
      ...customTerms
    };
  }

  /**
   * Replace template variables with actual values
   */
  replaceTemplateVariables(template, variables) {
    let content = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return content;
  }

  /**
   * Create lease document file
   */
  async createLeaseDocument(content, booking, template, variables, metadata = {}) {
    try {
      // Create file buffer
      const buffer = Buffer.from(content, 'utf8');

      // Create file object for storage
      const fileObject = {
        originalname: `Lease_Agreement_${booking.property_title}_${new Date().toISOString().split('T')[0]}.html`,
        buffer,
        mimetype: 'text/html',
        size: buffer.length
      };

      // Save to document storage
      const documentMetadata = {
        documentType: 'lease',
        uploadedBy: booking.landlord_id || 1,
        propertyId: booking.property_id,
        userId: booking.tenant_id,
        description: `Lease agreement for ${booking.property_title}`,
        tags: ['lease', 'agreement', booking.property_title],
        isTemplate: false,
        templateVariables: variables
      };

      const document = await documentStorageService.uploadDocument(fileObject, documentMetadata);

      // Create lease record
      await this.createLeaseRecord(document.id, booking, template, variables);

      return document;
    } catch (error) {
      console.error('Error creating lease document:', error);
      throw error;
    }
  }

  /**
   * Create lease record in database
   */
  async createLeaseRecord(documentId, booking, template, variables) {
    try {
      const leaseQuery = `
        INSERT INTO leases (
          document_id, booking_id, property_id, tenant_id, landlord_id,
          start_date, end_date, rent_amount, security_deposit,
          template_id, variables, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        documentId,
        booking.id,
        booking.property_id,
        booking.tenant_id,
        booking.landlord_id,
        booking.start_date,
        booking.end_date,
        booking.total_price / 12,
        booking.total_price * 0.1,
        template.id,
        JSON.stringify(variables)
      ];

      const result = await query(leaseQuery, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating lease record:', error);
      throw error;
    }
  }

  /**
   * Generate utilities clause
   */
  generateUtilitiesClause(booking) {
    const amenities = booking.amenities || [];
    
    if (amenities.includes('Utilities Included')) {
      return 'Utilities (water, electricity, gas, trash) are included in the rent.';
    } else if (amenities.includes('Water Included')) {
      return 'Water and trash are included in the rent. Tenant is responsible for electricity and gas.';
    } else {
      return 'Tenant is responsible for all utilities including water, electricity, gas, and trash.';
    }
  }

  /**
   * Generate maintenance clause
   */
  generateMaintenanceClause(booking) {
    return `Landlord is responsible for major repairs and maintenance of the property including structural components, plumbing, electrical systems, and HVAC. Tenant is responsible for minor maintenance and keeping the property clean and in good condition. Tenant must notify Landlord promptly of any needed repairs.`;
  }

  /**
   * Generate pets clause
   */
  generatePetsClause(booking) {
    const amenities = booking.amenities || [];
    
    if (amenities.includes('Pet-friendly')) {
      return 'Pets are allowed with prior written consent from Landlord. Tenant may be required to pay a pet deposit and is responsible for any damage caused by pets.';
    } else {
      return 'No pets are allowed on the premises without written consent from Landlord.';
    }
  }

  /**
   * Generate termination clause
   */
  generateTerminationClause(booking) {
    return `Either party may terminate this lease with 30 days written notice. Tenant must give notice no later than the last day of the month. Security deposit will be returned within 30 days of termination, less any deductions for damages or unpaid rent.`;
  }

  /**
   * Get lease templates
   */
  async getLeaseTemplates() {
    try {
      const query = `
        SELECT * FROM document_templates 
        WHERE template_type = 'lease' AND is_active = TRUE 
        ORDER BY is_system_template DESC, name ASC
      `;

      const result = await query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting lease templates:', error);
      throw error;
    }
  }

  /**
   * Get lease by booking ID
   */
  async getLeaseByBooking(bookingId) {
    try {
      const query = `
        SELECT 
          l.*,
          d.original_name,
          d.filename,
          d.path,
          d.created_at as document_created_at
        FROM leases l
        LEFT JOIN documents d ON l.document_id = d.id
        WHERE l.booking_id = $1
      `;

      const result = await query(query, [bookingId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting lease by booking:', error);
      throw error;
    }
  }

  /**
   * Update lease status
   */
  async updateLeaseStatus(leaseId, status, notes = '') {
    try {
      const query = `
        UPDATE leases 
        SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await query(query, [status, notes, leaseId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating lease status:', error);
      throw error;
    }
  }

  /**
   * Get lease statistics
   */
  async getLeaseStatistics(landlordId = null) {
    try {
      let whereClause = '';
      let queryParams = [];

      if (landlordId) {
        whereClause = 'WHERE l.landlord_id = $1';
        queryParams = [landlordId];
      }

      const query = `
        SELECT 
          COUNT(*) as total_leases,
          COUNT(CASE WHEN l.status = 'signed' THEN 1 END) as signed_leases,
          COUNT(CASE WHEN l.status = 'pending' THEN 1 END) as pending_leases,
          COUNT(CASE WHEN l.status = 'expired' THEN 1 END) as expired_leases,
          AVG(l.rent_amount) as avg_rent,
          SUM(l.security_deposit) as total_deposits
        FROM leases l
        ${whereClause}
      `;

      const result = await query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting lease statistics:', error);
      throw error;
    }
  }
}

module.exports = new LeaseGenerationService();
