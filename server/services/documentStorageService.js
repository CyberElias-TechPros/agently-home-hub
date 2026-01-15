const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { query } = require('../db');

class DocumentStorageService {
  constructor() {
    this.storageType = process.env.DOCUMENT_STORAGE_TYPE || 'local'; // 'local' or 's3'
    this.storagePath = process.env.DOCUMENT_STORAGE_PATH || './uploads/documents';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];

    // Initialize S3 if using cloud storage
    if (this.storageType === 's3') {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.s3 = new AWS.S3();
      this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    }
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    try {
      const directories = [
        this.storagePath,
        path.join(this.storagePath, 'leases'),
        path.join(this.storagePath, 'contracts'),
        path.join(this.storagePath, 'maintenance'),
        path.join(this.storagePath, 'user-documents'),
        path.join(this.storagePath, 'templates'),
        path.join(this.storagePath, 'temp')
      ];

      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
      }

      console.log('Document storage initialized successfully');
    } catch (error) {
      console.error('Error initializing document storage:', error);
      throw error;
    }
  }

  /**
   * Upload a document to storage
   */
  async uploadDocument(file, metadata = {}) {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileId = crypto.randomUUID();
      const fileExtension = path.extname(file.originalname);
      const filename = `${fileId}${fileExtension}`;

      let filePath, s3Key;

      if (this.storageType === 's3') {
        // Upload to S3
        s3Key = `documents/${this.getStorageDirectory(metadata.documentType || 'general')}/${filename}`;

        const uploadParams = {
          Bucket: this.bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
            uploadedBy: metadata.uploadedBy?.toString() || '',
            documentType: metadata.documentType || 'general'
          }
        };

        await this.s3.upload(uploadParams).promise();
        filePath = s3Key; // Store S3 key as path
      } else {
        // Local storage
        const storageDir = this.getStorageDirectory(metadata.documentType || 'general');
        filePath = path.join(storageDir, filename);

        // Save file to local storage
        await fs.writeFile(filePath, file.buffer);
      }

      // Save document metadata to database
      const documentRecord = await this.saveDocumentMetadata({
        id: fileId,
        originalName: file.originalname,
        filename,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        s3Key: s3Key, // Add S3 key for cloud storage
        documentType: metadata.documentType || 'general',
        uploadedBy: metadata.uploadedBy,
        propertyId: metadata.propertyId,
        userId: metadata.userId,
        description: metadata.description,
        tags: metadata.tags || [],
        isTemplate: metadata.isTemplate || false,
        templateVariables: metadata.templateVariables || null
      });

      return documentRecord;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Download a document from storage
   */
  async downloadDocument(documentId) {
    try {
      // Get document metadata from database
      const documentQuery = 'SELECT * FROM documents WHERE id = $1';
      const result = await query(documentQuery, [documentId]);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = result.rows[0];
      let fileBuffer;

      if (this.storageType === 's3') {
        // Download from S3
        const downloadParams = {
          Bucket: this.bucketName,
          Key: document.s3_key || document.path
        };

        const s3Object = await this.s3.getObject(downloadParams).promise();
        fileBuffer = s3Object.Body;
      } else {
        // Local storage
        try {
          await fs.access(document.path);
        } catch (error) {
          throw new Error('Document file not found in storage');
        }

        // Read file content
        fileBuffer = await fs.readFile(document.path);
      }

      return {
        filename: document.original_name,
        mimeType: document.mime_type,
        size: document.size,
        buffer: fileBuffer,
        document
      };
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Delete a document from storage and database
   */
  async deleteDocument(documentId) {
    try {
      // Get document metadata
      const documentQuery = 'SELECT * FROM documents WHERE id = $1';
      const result = await query(documentQuery, [documentId]);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = result.rows[0];

      // Delete file from storage
      if (this.storageType === 's3') {
        const deleteParams = {
          Bucket: this.bucketName,
          Key: document.s3_key || document.path
        };

        try {
          await this.s3.deleteObject(deleteParams).promise();
        } catch (error) {
          console.warn('File not found in S3, continuing with database deletion:', error.message);
        }
      } else {
        try {
          await fs.unlink(document.path);
        } catch (error) {
          console.warn('File not found in storage, continuing with database deletion:', error.message);
        }
      }

      // Delete from database
      await query('DELETE FROM documents WHERE id = $1', [documentId]);

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(documentId) {
    try {
      const query = 'SELECT * FROM documents WHERE id = $1';
      const result = await query(query, [documentId]);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting document metadata:', error);
      throw error;
    }
  }

  /**
   * List documents with filters
   */
  async listDocuments(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      let queryParams = [];
      let paramIndex = 1;

      if (filters.documentType) {
        whereClause += ` AND document_type = $${paramIndex}`;
        queryParams.push(filters.documentType);
        paramIndex++;
      }

      if (filters.uploadedBy) {
        whereClause += ` AND uploaded_by = $${paramIndex}`;
        queryParams.push(filters.uploadedBy);
        paramIndex++;
      }

      if (filters.propertyId) {
        whereClause += ` AND property_id = $${paramIndex}`;
        queryParams.push(filters.propertyId);
        paramIndex++;
      }

      if (filters.userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        queryParams.push(filters.userId);
        paramIndex++;
      }

      if (filters.isTemplate !== undefined) {
        whereClause += ` AND is_template = $${paramIndex}`;
        queryParams.push(filters.isTemplate);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        whereClause += ` AND tags && $${paramIndex}`;
        queryParams.push(filters.tags);
        paramIndex++;
      }

      const orderBy = filters.orderBy || 'created_at DESC';
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const query = `
        SELECT * FROM documents 
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Save document metadata to database
   */
  async saveDocumentMetadata(metadata) {
    try {
      const query = `
        INSERT INTO documents (
          id, original_name, filename, mime_type, size, path, s3_key, document_type,
          uploaded_by, property_id, user_id, description, tags, is_template,
          template_variables, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        metadata.id,
        metadata.originalName,
        metadata.filename,
        metadata.mimeType,
        metadata.size,
        metadata.path,
        metadata.s3Key || null, // Add S3 key
        metadata.documentType,
        metadata.uploadedBy,
        metadata.propertyId,
        metadata.userId,
        metadata.description,
        metadata.tags,
        metadata.isTemplate,
        metadata.templateVariables
      ];

      const result = await query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving document metadata:', error);
      throw error;
    }
  }

  /**
   * Get storage directory based on document type
   */
  getStorageDirectory(documentType) {
    const directories = {
      'lease': path.join(this.storagePath, 'leases'),
      'contract': path.join(this.storagePath, 'contracts'),
      'maintenance': path.join(this.storagePath, 'maintenance'),
      'user-document': path.join(this.storagePath, 'user-documents'),
      'template': path.join(this.storagePath, 'templates'),
      'general': this.storagePath
    };

    return directories[documentType] || directories.general;
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    if (!file.originalname || file.originalname.trim() === '') {
      throw new Error('Filename is required');
    }
  }

  /**
   * Generate document URL (for cloud storage integration)
   */
  generateDocumentUrl(documentId, expiresIn = 3600) {
    // For local storage, return a temporary URL
    // In production with cloud storage, this would generate signed URLs
    return `/api/documents/${documentId}/download?expires=${Date.now() + expiresIn * 1000}`;
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(userId = null) {
    try {
      let whereClause = userId ? 'WHERE uploaded_by = $1' : '';
      let queryParams = userId ? [userId] : [];

      const query = `
        SELECT 
          document_type,
          COUNT(*) as count,
          SUM(size) as total_size
        FROM documents 
        ${whereClause}
        GROUP BY document_type
        ORDER BY count DESC
      `;

      const result = await query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error getting document statistics:', error);
      throw error;
    }
  }

  /**
   * Cleanup old temporary files
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const tempDir = path.join(this.storagePath, 'temp');
      const files = await fs.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new DocumentStorageService();
