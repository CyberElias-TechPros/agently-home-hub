const nodemailer = require('nodemailer');
const { query } = require('../db');

class NotificationService {
  constructor() {
    // Initialize email transporter (in production, use real SMTP credentials)
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@agentlyhomehub.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });

    // SMS service (in production, integrate with Twilio or similar)
    this.smsService = {
      send: async (to, message) => {
        console.log(`SMS to ${to}: ${message}`);
        // In production, integrate with actual SMS service
        return { success: true, messageId: 'mock-sms-id' };
      }
    };
  }

  /**
   * Send notification based on type and recipient preferences
   */
  async sendNotification(type, recipientId, data) {
    try {
      // Get user preferences
      const userQuery = 'SELECT * FROM users WHERE id = $1';
      const userResult = await query(userQuery, [recipientId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get notification preferences (assuming we have a notification_preferences table)
      const preferences = await this.getUserNotificationPreferences(recipientId);

      // Send email if enabled
      if (preferences.email && user.email) {
        await this.sendEmail(type, user.email, data);
      }

      // Send SMS if enabled
      if (preferences.sms && user.phone) {
        await this.sendSms(type, user.phone, data);
      }

      // Log notification for tracking
      await this.logNotification(type, recipientId, data);

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(type, to, data) {
    const emailTemplates = {
      maintenance_request_created: {
        subject: 'New Maintenance Request Submitted',
        html: this.getMaintenanceRequestCreatedTemplate(data)
      },
      maintenance_request_assigned: {
        subject: 'Maintenance Request Assigned',
        html: this.getMaintenanceRequestAssignedTemplate(data)
      },
      maintenance_request_updated: {
        subject: 'Maintenance Request Status Updated',
        html: this.getMaintenanceRequestUpdatedTemplate(data)
      },
      maintenance_request_completed: {
        subject: 'Maintenance Request Completed',
        html: this.getMaintenanceRequestCompletedTemplate(data)
      },
      contractor_assigned: {
        subject: 'New Maintenance Assignment',
        html: this.getContractorAssignedTemplate(data)
      }
    };

    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`No email template found for type: ${type}`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Agently Home Hub <noreply@agentlyhomehub.com>',
      to,
      subject: template.subject,
      html: template.html
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${to} for ${type}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSms(type, to, data) {
    const smsTemplates = {
      maintenance_request_created: `New maintenance request: ${data.title}. Priority: ${data.priority}. Please review.`,
      maintenance_request_assigned: `Maintenance request "${data.title}" has been assigned to ${data.contractorName}.`,
      maintenance_request_updated: `Maintenance request "${data.title}" status updated to: ${data.status}.`,
      maintenance_request_completed: `Maintenance request "${data.title}" has been completed.`,
      contractor_assigned: `New assignment: ${data.title} at ${data.propertyAddress}. Please review details.`
    };

    const message = smsTemplates[type];
    if (!message) {
      throw new Error(`No SMS template found for type: ${type}`);
    }

    try {
      await this.smsService.send(to, message);
      console.log(`SMS sent to ${to} for ${type}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId) {
    // Default preferences - in production, store in database
    return {
      email: true,
      sms: true,
      push: false
    };
  }

  /**
   * Log notification for tracking
   */
  async logNotification(type, recipientId, data) {
    try {
      const logQuery = `
        INSERT INTO notification_logs (type, recipient_id, data, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      
      await query(logQuery, [type, recipientId, JSON.stringify(data)]);
    } catch (error) {
      console.error('Error logging notification:', error);
      // Don't throw here as logging failure shouldn't break the notification
    }
  }

  /**
   * Email template for new maintenance request
   */
  getMaintenanceRequestCreatedTemplate(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Maintenance Request Submitted</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Request Details</h3>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Property:</strong> ${data.propertyTitle}</p>
          <p><strong>Submitted by:</strong> ${data.tenantName}</p>
          <p><strong>Description:</strong> ${data.description}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/maintenance/${data.id}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            View Request Details
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Agently Home Hub. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Email template for maintenance request assignment
   */
  getMaintenanceRequestAssignedTemplate(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Maintenance Request Assigned</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Assignment Details</h3>
          <p><strong>Request:</strong> ${data.title}</p>
          <p><strong>Assigned to:</strong> ${data.contractorName}</p>
          <p><strong>Contractor Phone:</strong> ${data.contractorPhone}</p>
          <p><strong>Estimated Start:</strong> ${data.estimatedStartDate}</p>
          <p><strong>Quoted Amount:</strong> $${data.quotedAmount}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/maintenance/${data.id}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Track Progress
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Agently Home Hub. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Email template for maintenance request status update
   */
  getMaintenanceRequestUpdatedTemplate(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Maintenance Request Status Updated</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Update Details</h3>
          <p><strong>Request:</strong> ${data.title}</p>
          <p><strong>New Status:</strong> ${data.status}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          <p><strong>Updated by:</strong> ${data.updatedBy}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/maintenance/${data.id}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            View Details
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Agently Home Hub. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Email template for completed maintenance request
   */
  getMaintenanceRequestCompletedTemplate(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Maintenance Request Completed</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Completion Details</h3>
          <p><strong>Request:</strong> ${data.title}</p>
          <p><strong>Completed by:</strong> ${data.contractorName}</p>
          <p><strong>Completion Date:</strong> ${data.completionDate}</p>
          ${data.actualAmount ? `<p><strong>Final Cost:</strong> $${data.actualAmount}</p>` : ''}
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #28a745;">
            <strong>Please rate the contractor's work</strong> - Your feedback helps improve our service quality.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/maintenance/${data.id}/review" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Leave a Review
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Agently Home Hub. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Email template for contractor assignment
   */
  getContractorAssignedTemplate(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Maintenance Assignment</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Job Details</h3>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Property:</strong> ${data.propertyAddress}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p><strong>Access Instructions:</strong> ${data.accessInstructions}</p>
          <p><strong>Quoted Amount:</strong> $${data.quotedAmount}</p>
          <p><strong>Landlord:</strong> ${data.landlordName} (${data.landlordPhone})</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/contractor/assignments/${data.id}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Accept Assignment
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from Agently Home Hub. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Send bulk notifications (for system-wide announcements)
   */
  async sendBulkNotification(type, recipients, data) {
    const results = [];
    
    for (const recipientId of recipients) {
      try {
        await this.sendNotification(type, recipientId, data);
        results.push({ recipientId, success: true });
      } catch (error) {
        console.error(`Failed to send notification to ${recipientId}:`, error);
        results.push({ recipientId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM notification_logs
        WHERE recipient_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
