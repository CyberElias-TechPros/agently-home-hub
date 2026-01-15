const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('./auth');
const { query } = require('../db');
const documentStorageService = require('../services/documentStorageService');
const docusignService = require('../services/docusignService');
const htmlToPdf = require('html-pdf-node');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Initialize document storage
documentStorageService.initializeStorage().catch(console.error);

// POST /api/documents/upload - Upload a document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      documentType,
      propertyId,
      userId,
      description,
      tags,
      isTemplate,
      templateVariables
    } = req.body;

    const metadata = {
      documentType: documentType || 'general',
      uploadedBy: req.user.id,
      propertyId: propertyId || null,
      userId: userId || req.user.id,
      description: description || '',
      tags: tags ? JSON.parse(tags) : [],
      isTemplate: isTemplate === 'true',
      templateVariables: templateVariables ? JSON.parse(templateVariables) : null
    };

    const document = await documentStorageService.uploadDocument(req.file, metadata);
    
    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Generate document from template
router.post('/generate', authenticateToken, [
  body('templateId').isUUID().withMessage('Valid template ID is required'),
  body('variables').isObject().withMessage('Variables object is required'),
  body('format').optional().isIn(['pdf', 'html']).withMessage('Format must be pdf or html')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { templateId, variables, format = 'pdf' } = req.body;

    // Get template from database
    const templateQuery = `
      SELECT * FROM document_templates 
      WHERE id = $1 AND (created_by = $2 OR is_public = true)
    `;
    const templateResult = await query(templateQuery, [templateId, req.user.id]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Validate variables against template requirements
    const validationErrors = validateTemplateVariables(template, variables);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Variable validation failed',
        details: validationErrors
      });
    }

    // Generate document content
    const content = generateDocumentContent(template.content, variables);

    // Add current date if not provided
    if (!variables.currentDate) {
      variables.currentDate = new Date().toLocaleDateString();
    }

    let pdfDocumentId = null;
    if (format === 'pdf') {
      pdfDocumentId = await generatePDF(content, template.name);
    }

    // Save generated document
    const documentId = generateId();
    const insertQuery = `
      INSERT INTO generated_documents (
        id, template_id, variables, content, pdf_document_id, created_at, created_by, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `;
    await query(insertQuery, [
      documentId,
      templateId,
      JSON.stringify(variables),
      content,
      pdfDocumentId,
      new Date(),
      req.user.id,
      'generated'
    ]);

    res.json({
      id: documentId,
      templateId,
      variables,
      content,
      pdfDocumentId,
      format,
      createdAt: new Date(),
      status: 'generated'
    });

  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// Get generated documents for user
router.get('/generated', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT gd.*, dt.name as template_name, dt.category as template_category
      FROM generated_documents gd
      JOIN document_templates dt ON gd.template_id = dt.id
      WHERE gd.created_by = $1
      ORDER BY gd.created_at DESC
    `;
    const result = await query(query, [req.user.id]);

    res.json(result.rows.map(doc => ({
      ...doc,
      variables: JSON.parse(doc.variables),
      template_name: doc.template_name,
      template_category: doc.template_category
    })));

  } catch (error) {
    console.error('Error fetching generated documents:', error);
    res.status(500).json({ error: 'Failed to fetch generated documents' });
  }
});

// Get specific generated document
router.get('/generated/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT gd.*, dt.name as template_name, dt.category as template_category
      FROM generated_documents gd
      JOIN document_templates dt ON gd.template_id = dt.id
      WHERE gd.id = $1 AND (gd.created_by = $2 OR gd.is_public = true)
    `;
    const result = await query(query, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    res.json({
      ...doc,
      variables: JSON.parse(doc.variables),
      template_name: doc.template_name,
      template_category: doc.template_category
    });

  } catch (error) {
    console.error('Error fetching generated document:', error);
    res.status(500).json({ error: 'Failed to fetch generated document' });
  }
});

// Update document status
router.patch('/generated/:id/status', authenticateToken, [
  body('status').isIn(['draft', 'generated', 'signed', 'expired']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const updateQuery = `
      UPDATE generated_documents 
      SET status = $1, updated_at = $2
      WHERE id = $3 AND (created_by = $4 OR is_public = true)
    `;
    await query(updateQuery, [status, new Date(), id, req.user.id]);

    res.json({ message: 'Document status updated successfully' });

  } catch (error) {
    console.error('Error updating document status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// Delete generated document
router.delete('/generated/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = `
      DELETE FROM generated_documents 
      WHERE id = $1 AND (created_by = $2 OR is_public = true)
    `;
    await query(deleteQuery, [id, req.user.id]);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get document templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = `
      SELECT * FROM document_templates 
      WHERE (created_by = $1 OR is_public = true)
    `;
    const params = [req.user.id];
    
    if (category) {
      query += ' AND category = $' + category + "'";
    }
    
    if (search) {
      query += ' AND (name ILIKE $' + search + '% OR description ILIKE $' + search + '%)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY updated_at DESC';

    const result = await query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create custom template
router.post('/templates', authenticateToken, [
  body('name').notEmpty().withMessage('Template name is required'),
  body('description').notEmpty().withMessage('Template description is required'),
  body('category').isIn(['lease', 'agreement', 'notice', 'form', 'other']).withMessage('Valid category is required'),
  body('content').notEmpty().withMessage('Template content is required'),
  body('variables').isArray().withMessage('Variables array is required'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, content, variables, isPublic = false } = req.body;

    const insertQuery = `
      INSERT INTO document_templates (
        id, name, description, category, content, variables, created_at, updated_at, created_by, is_public
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `;
    await query(insertQuery, [
      generateId(),
      name,
      description,
      category,
      content,
      JSON.stringify(variables),
      new Date(),
      new Date(),
      req.user.id,
      isPublic
    ]);

    res.status(201).json({
      id: generateId(),
      name,
      description,
      category,
      isPublic
    });

  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Helper functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function validateTemplateVariables(template, variables) {
  const errors = [];
  
  for (const templateVar of template.variables) {
    const value = variables[templateVar.name];
    
    // Check required variables
    if (templateVar.required && (value === undefined || value === null || value === '')) {
      errors.push(`${templateVar.label} is required`);
      continue;
    }
    
    // Skip validation if value is empty
    if (value === undefined || value === null || value === '') continue;
    
    // Type validation
    switch (templateVar.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${templateVar.label} must be a number`);
        } else {
          const numValue = Number(value);
          if (templateVar.validation?.min !== undefined && numValue < templateVar.validation.min) {
            errors.push(`${templateVar.label} must be at least ${templateVar.validation.min}`);
          }
          if (templateVar.validation?.max !== undefined && numValue > templateVar.validation.max) {
            errors.push(`${templateVar.label} must be at most ${templateVar.validation.max}`);
          }
        }
        break;
        
      case 'currency':
        if (isNaN(Number(value)) || Number(value) < 0) {
          errors.push(`${templateVar.label} must be a positive number`);
        }
        break;
        
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`${templateVar.label} must be a valid date`);
        }
        break;
        
      case 'select':
        if (templateVar.options && !templateVar.options.includes(value)) {
          errors.push(`${templateVar.label} must be one of: ${templateVar.options.join(', ')}`);
        }
        break;
    }
    
    // Pattern validation
    if (templateVar.validation?.pattern) {
      const regex = new RegExp(templateVar.validation.pattern);
      if (!regex.test(String(value))) {
        errors.push(`${templateVar.label} format is invalid`);
      }
    }
  }
  
  return errors;
}

function generateDocumentContent(template, variables) {
  let content = template;
  
  // Simple template variable replacement
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, String(value || ''));
  }
  
  // Handle conditional blocks (basic implementation)
  content = content.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, varName, innerContent) => {
    const value = variables[varName];
    if (value) {
      // Replace variables within the conditional block
      let processed = innerContent;
      for (const [innerKey, innerValue] of Object.entries(variables)) {
        const innerRegex = new RegExp(`{{${innerKey}}}`, 'g');
        processed = processed.replace(innerRegex, String(innerValue || ''));
      }
      return processed;
    }
    return '';
  });
  
  return content;
}

async function generatePDF(content, filename) {
  try {
    // Convert HTML content to PDF
    const options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    };

    // Wrap content in basic HTML structure if it's not already
    let htmlContent = content;
    if (!content.includes('<html>')) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            h1, h2, h3 { color: #333; margin-top: 20px; }
            p { margin: 10px 0; }
            .signature-line { border-bottom: 1px solid #000; width: 200px; margin: 40px 0 10px 0; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;
    }

    const pdfBuffer = await htmlToPdf.generatePdf({ content: htmlContent }, options);

    // Save PDF to storage
    const pdfFileObject = {
      originalname: `${filename}.pdf`,
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      size: pdfBuffer.length
    };

    const pdfDocument = await documentStorageService.uploadDocument(pdfFileObject, {
      documentType: 'pdf',
      uploadedBy: null, // Will be set by caller
      description: `Generated PDF: ${filename}`,
      isTemplate: false
    });

    return pdfDocument.id; // Return document ID instead of URL
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

// GET /api/documents/:id/download - Download a document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has permission to access this document
    const document = await documentStorageService.getDocumentMetadata(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const hasPermission = 
      document.uploaded_by === req.user.id ||
      document.user_id === req.user.id ||
      (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
      ['admin', 'manager'].includes(req.user.role);

    if (!hasPermission && document.access_level !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log access
    await logDocumentAccess(id, req.user.id, 'download', req);

    const documentData = await documentStorageService.downloadDocument(id);
    
    res.set({
      'Content-Type': documentData.mimeType,
      'Content-Disposition': `attachment; filename="${documentData.filename}"`,
      'Content-Length': documentData.size
    });
    
    res.send(documentData.buffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id - Get document metadata
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await documentStorageService.getDocumentMetadata(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const hasPermission = 
      document.uploaded_by === req.user.id ||
      document.user_id === req.user.id ||
      (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
      ['admin', 'manager'].includes(req.user.role);

    if (!hasPermission && document.access_level !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log access
    await logDocumentAccess(id, req.user.id, 'view', req);

    res.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents - List documents with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      documentType,
      propertyId,
      userId,
      isTemplate,
      tags,
      page = 1,
      limit = 20,
      orderBy = 'created_at DESC'
    } = req.query;

    // Build filters based on user role and permissions
    const filters = {
      documentType,
      propertyId,
      userId: userId || req.user.id,
      isTemplate: isTemplate ? isTemplate === 'true' : undefined,
      tags: tags ? JSON.parse(tags) : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy
    };

    // Non-admin users can only see their own documents unless they have property access
    if (!['admin', 'manager'].includes(req.user.role)) {
      // Add logic to filter by accessible properties
      const accessibleProperties = await getAccessibleProperties(req.user.id);
      if (accessibleProperties.length > 0) {
        filters.propertyIds = accessibleProperties;
      }
    }

    const documents = await documentStorageService.listDocuments(filters);
    
    // Get total count for pagination
    const totalCount = await documentStorageService.listDocuments({
      ...filters,
      limit: undefined,
      offset: undefined
    });

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const document = await documentStorageService.getDocumentMetadata(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const canDelete = 
      document.uploaded_by === req.user.id ||
      (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
      ['admin', 'manager'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log deletion
    await logDocumentAccess(id, req.user.id, 'delete', req);

    const result = await documentStorageService.deleteDocument(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/documents/:id - Update document metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check permissions
    const document = await documentStorageService.getDocumentMetadata(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const canUpdate = 
      document.uploaded_by === req.user.id ||
      (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
      ['admin', 'manager'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update document metadata
    const allowedFields = [
      'description', 'tags', 'access_level', 'expires_at', 'is_template'
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
      UPDATE documents 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    
    // Log update
    await logDocumentAccess(id, req.user.id, 'update', req);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/templates - Get document templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, templateType } = req.query;
    
    let whereClause = 'WHERE is_active = TRUE AND (is_system_template = TRUE OR created_by = $1)';
    let queryParams = [req.user.id];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (templateType) {
      whereClause += ` AND template_type = $${paramIndex}`;
      queryParams.push(templateType);
      paramIndex++;
    }

    const query = `
      SELECT * FROM document_templates 
      ${whereClause}
      ORDER BY is_system_template DESC, name ASC
    `;

    const result = await query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents/templates - Create a new template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      templateContent,
      templateType,
      variables,
      defaultFormat,
      headerContent,
      footerContent
    } = req.body;

    const insertQuery = `
      INSERT INTO document_templates (
        name, description, category, template_content, template_type,
        variables, default_format, header_content, footer_content, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name,
      description,
      category,
      templateContent,
      templateType,
      JSON.stringify(variables),
      defaultFormat || 'pdf',
      headerContent,
      footerContent,
      req.user.id
    ];

    const result = await query(insertQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents/generate - Generate document from template
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { templateId, variables, outputFormat = 'pdf', metadata } = req.body;
    
    // Get template
    const templateQuery = 'SELECT * FROM document_templates WHERE id = $1 AND is_active = TRUE';
    const templateResult = await query(templateQuery, [templateId]);
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Replace variables in template
    let generatedContent = template.template_content;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      generatedContent = generatedContent.replace(new RegExp(placeholder, 'g'), value);
    }

    // Create a temporary file
    const tempFilename = `generated_${Date.now()}.html`;
    const tempPath = path.join(documentStorageService.storagePath, 'temp', tempFilename);
    
    await fs.writeFile(tempPath, generatedContent, 'utf8');

    // Convert to requested format (simplified - in production, use proper PDF generation)
    let finalBuffer;
    let mimeType;
    
    if (outputFormat === 'pdf') {
      // In production, use a proper PDF library like puppeteer
      finalBuffer = Buffer.from(generatedContent, 'utf8');
      mimeType = 'application/pdf';
    } else if (outputFormat === 'docx') {
      // In production, use a proper DOCX library
      finalBuffer = Buffer.from(generatedContent, 'utf8');
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      finalBuffer = Buffer.from(generatedContent, 'utf8');
      mimeType = 'text/html';
    }

    // Save as document
    const fileObject = {
      originalname: `${template.name}_${Date.now()}.${outputFormat}`,
      buffer: finalBuffer,
      mimetype: mimeType,
      size: finalBuffer.length
    };

    const documentMetadata = {
      documentType: template.template_type,
      uploadedBy: req.user.id,
      propertyId: metadata?.propertyId || null,
      userId: metadata?.userId || req.user.id,
      description: `Generated from template: ${template.name}`,
      tags: metadata?.tags || [],
      isTemplate: false,
      templateVariables: variables
    };

    const document = await documentStorageService.uploadDocument(fileObject, documentMetadata);

    // Update template usage count
    await query(
      'UPDATE document_templates SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [templateId]
    );

    // Clean up temp file
    await fs.unlink(tempPath).catch(console.error);

    res.status(201).json(document);
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/statistics - Get document statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const statistics = await documentStorageService.getDocumentStatistics(req.user.id);
    res.json(statistics);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function checkPropertyAccess(propertyId, userId) {
  try {
    // Check if user is landlord or tenant of the property
    const query = `
      SELECT id FROM properties 
      WHERE id = $1 AND (landlord_id = $2)
    `;
    
    const result = await query(query, [propertyId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking property access:', error);
    return false;
  }
}

async function getAccessibleProperties(userId) {
  try {
    const query = `
      SELECT id FROM properties WHERE landlord_id = $1
    `;
    
    const result = await query(query, [userId]);
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error getting accessible properties:', error);
    return [];
  }
}

// POST /api/documents/:id/request-signature - Request e-signature for a document
router.post('/:id/request-signature', authenticateToken, [
  body('signers').isArray().withMessage('Signers array is required'),
  body('signers.*.name').notEmpty().withMessage('Signer name is required'),
  body('signers.*.email').isEmail().withMessage('Valid signer email is required'),
  body('emailSubject').optional().isString(),
  body('emailBlurb').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { signers, emailSubject, emailBlurb } = req.body;

    // Check if DocuSign is configured
    if (!docusignService.isConfigured()) {
      return res.status(503).json({ error: 'E-signature service is not configured' });
    }

    // Check document permissions
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const canSign = document.uploaded_by === req.user.id ||
                   (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
                   ['admin', 'manager'].includes(req.user.role);

    if (!canSign) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create DocuSign envelope
    const envelope = await docusignService.createEnvelope(
      id,
      signers,
      emailSubject || 'Please sign this document',
      emailBlurb || 'Please review and sign the attached document.'
    );

    // Log the signature request
    await logDocumentAccess(id, req.user.id, 'sign_request', req);

    res.json({
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      signers: signers
    });
  } catch (error) {
    console.error('Error requesting signature:', error);
    res.status(500).json({ error: 'Failed to request signature' });
  }
});

// GET /api/documents/:id/signature-status - Get e-signature status
router.get('/:id/signature-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get document metadata
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const hasPermission = document.uploaded_by === req.user.id ||
                         document.user_id === req.user.id ||
                         (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
                         ['admin', 'manager'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!document.esignature_envelope_id) {
      return res.json({ status: 'not_requested' });
    }

    // Get envelope status from DocuSign
    const status = await docusignService.getEnvelopeStatus(document.esignature_envelope_id);
    const recipients = await docusignService.getEnvelopeRecipients(document.esignature_envelope_id);

    res.json({
      envelopeId: document.esignature_envelope_id,
      status: status.status,
      sentDateTime: status.sentDateTime,
      completedDateTime: status.completedDateTime,
      recipients: recipients
    });
  } catch (error) {
    console.error('Error getting signature status:', error);
    res.status(500).json({ error: 'Failed to get signature status' });
  }
});

// GET /api/documents/:id/download-signed - Download signed document
router.get('/:id/download-signed', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get document metadata
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const hasPermission = document.uploaded_by === req.user.id ||
                         document.user_id === req.user.id ||
                         (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
                         ['admin', 'manager'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!document.esignature_envelope_id) {
      return res.status(400).json({ error: 'No signature envelope found' });
    }

    // Download signed document from DocuSign
    const signedDocument = await docusignService.downloadSignedDocument(document.esignature_envelope_id);

    // Set response headers
    res.set({
      'Content-Type': signedDocument.contentType,
      'Content-Disposition': signedDocument.contentDisposition || `attachment; filename="${document.original_name}"`
    });

    // Send the signed document
    res.send(Buffer.from(signedDocument.data, 'base64'));
  } catch (error) {
    console.error('Error downloading signed document:', error);
    res.status(500).json({ error: 'Failed to download signed document' });
  }
});

// POST /api/documents/:id/void-signature - Void signature request
router.post('/:id/void-signature', authenticateToken, [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Get document metadata
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions (only document owner or admin can void)
    const canVoid = document.uploaded_by === req.user.id ||
                   ['admin', 'manager'].includes(req.user.role);

    if (!canVoid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!document.esignature_envelope_id) {
      return res.status(400).json({ error: 'No signature envelope found' });
    }

    // Void the envelope
    await docusignService.voidEnvelope(document.esignature_envelope_id, reason || 'Voided by sender');

    // Log the action
    await logDocumentAccess(id, req.user.id, 'sign_void', req);

    res.json({ message: 'Signature request voided successfully' });
  } catch (error) {
    console.error('Error voiding signature:', error);
    res.status(500).json({ error: 'Failed to void signature request' });
  }
});

// POST /api/documents/:id/versions - Create a new version of a document
router.post('/:id/versions', authenticateToken, upload.single('file'), [
  body('changeDescription').optional().isString(),
  body('changeType').optional().isIn(['create', 'update', 'delete', 'sign', 'expire'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { changeDescription, changeType = 'update' } = req.body;

    // Get current document
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const canUpdate = document.uploaded_by === req.user.id ||
                     (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
                     ['admin', 'manager'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current version number
    const maxVersionQuery = 'SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = $1';
    const maxVersionResult = await query(maxVersionQuery, [id]);
    const nextVersion = (maxVersionResult.rows[0].max_version || 0) + 1;

    let newFileId = id;
    let newPath = document.path;
    let newSize = document.size;

    // If a new file is uploaded, save it
    if (req.file) {
      const fileObject = {
        originalname: document.original_name,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size
      };

      const newDocument = await documentStorageService.uploadDocument(fileObject, {
        documentType: document.document_type,
        uploadedBy: req.user.id,
        propertyId: document.property_id,
        userId: document.user_id,
        description: document.description,
        tags: document.tags,
        isTemplate: document.is_template
      });

      newFileId = newDocument.id;
      newPath = newDocument.path;
      newSize = newDocument.size;
    }

    // Create version record
    const versionInsertQuery = `
      INSERT INTO document_versions (
        document_id, version_number, change_description, changed_by, change_type,
        filename, path, size, metadata_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const versionResult = await query(versionInsertQuery, [
      id,
      nextVersion,
      changeDescription || `Version ${nextVersion} created`,
      req.user.id,
      changeType,
      document.filename,
      newPath,
      newSize,
      JSON.stringify({
        original_name: document.original_name,
        mime_type: document.mime_type,
        document_type: document.document_type,
        description: document.description,
        tags: document.tags
      })
    ]);

    // Update document to point to latest version
    await query(
      'UPDATE documents SET version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextVersion, id]
    );

    // Log the version creation
    await logDocumentAccess(id, req.user.id, 'version_create', req);

    res.status(201).json(versionResult.rows[0]);
  } catch (error) {
    console.error('Error creating document version:', error);
    res.status(500).json({ error: 'Failed to create document version' });
  }
});

// GET /api/documents/:id/versions - Get document versions
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get document
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const hasPermission = document.uploaded_by === req.user.id ||
                         document.user_id === req.user.id ||
                         (document.property_id && await checkPropertyAccess(document.property_id, req.user.id)) ||
                         ['admin', 'manager'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get versions
    const versionsQuery = `
      SELECT dv.*, u.name as changed_by_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.changed_by = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.version_number DESC
    `;

    const versionsResult = await query(versionsQuery, [id]);

    res.json(versionsResult.rows.map(version => ({
      ...version,
      metadata_snapshot: JSON.parse(version.metadata_snapshot || '{}')
    })));
  } catch (error) {
    console.error('Error getting document versions:', error);
    res.status(500).json({ error: 'Failed to get document versions' });
  }
});

// POST /api/documents/:id/versions/:version/restore - Restore a document version
router.post('/:id/versions/:version/restore', authenticateToken, async (req, res) => {
  try {
    const { id, version } = req.params;
    const versionNumber = parseInt(version);

    // Get document
    const document = await documentStorageService.getDocumentMetadata(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const canRestore = document.uploaded_by === req.user.id ||
                      ['admin', 'manager'].includes(req.user.role);

    if (!canRestore) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the version to restore
    const versionQuery = 'SELECT * FROM document_versions WHERE document_id = $1 AND version_number = $2';
    const versionResult = await query(versionQuery, [id, versionNumber]);

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const targetVersion = versionResult.rows[0];

    // Create a new version with the restored content
    const restoreInsertQuery = `
      INSERT INTO document_versions (
        document_id, version_number, change_description, changed_by, change_type,
        filename, path, size, metadata_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const nextVersion = document.version + 1;
    const restoreResult = await query(restoreInsertQuery, [
      id,
      nextVersion,
      `Restored to version ${versionNumber}`,
      req.user.id,
      'update',
      targetVersion.filename,
      targetVersion.path,
      targetVersion.size,
      targetVersion.metadata_snapshot
    ]);

    // Update document to point to restored version
    await query(
      'UPDATE documents SET version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextVersion, id]
    );

    // Log the restoration
    await logDocumentAccess(id, req.user.id, 'version_restore', req);

    res.json({
      message: 'Document version restored successfully',
      newVersion: restoreResult.rows[0]
    });
  } catch (error) {
    console.error('Error restoring document version:', error);
    res.status(500).json({ error: 'Failed to restore document version' });
  }
});

async function logDocumentAccess(documentId, userId, action, req) {
  try {
    const logQuery = `
      INSERT INTO document_access_logs (
        document_id, user_id, action, ip_address, user_agent, context
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await query(logQuery, [
      documentId,
      userId,
      action,
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path
      })
    ]);
  } catch (error) {
    console.error('Error logging document access:', error);
    // Don't fail the request if logging fails
  }
}

module.exports = router;
