const docusign = require('docusign-esign');
const fs = require('fs').promises;
const path = require('path');
const documentStorageService = require('./documentStorageService');
const { query } = require('../db');

class DocuSignService {
  constructor() {
    this.clientId = process.env.DOCUSIGN_CLIENT_ID;
    this.userId = process.env.DOCUSIGN_USER_ID;
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    this.privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH;
    this.basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';

    // Initialize DocuSign API client
    if (this.clientId && this.accountId) {
      this.apiClient = new docusign.ApiClient();
      this.apiClient.setBasePath(this.basePath);
      this.apiClient.setOAuthBasePath(this.basePath.replace('/restapi', ''));

      // Configure JWT authentication if private key is available
      if (this.privateKeyPath) {
        this.configureJWTAuth();
      }
    }
  }

  /**
   * Configure JWT authentication for DocuSign
   */
  async configureJWTAuth() {
    try {
      const privateKey = await fs.readFile(path.resolve(this.privateKeyPath), 'utf8');

      const jwtAuth = new docusign.OAuth.UserInfo();
      jwtAuth.setSubject(this.userId);

      const token = await this.apiClient.requestJWTUserToken(
        this.clientId,
        this.userId,
        this.accountId,
        privateKey,
        3600 // 1 hour
      );

      this.apiClient.addDefaultHeader('Authorization', `Bearer ${token.body.access_token}`);
      console.log('DocuSign JWT authentication configured successfully');
    } catch (error) {
      console.error('Error configuring DocuSign JWT auth:', error.message);
    }
  }

  /**
   * Create an envelope for e-signature
   */
  async createEnvelope(documentId, signers, emailSubject = 'Please sign this document', emailBlurb = 'Please review and sign the attached document.') {
    try {
      if (!this.apiClient) {
        throw new Error('DocuSign API client not configured');
      }

      // Get document from storage
      const document = await documentStorageService.downloadDocument(documentId);

      // Create envelope definition
      const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.setEmailSubject(emailSubject);
      envelopeDefinition.setEmailBlurb(emailBlurb);
      envelopeDefinition.setStatus('sent');

      // Add document to envelope
      const doc = new docusign.Document();
      doc.setDocumentBase64(Buffer.from(document.buffer).toString('base64'));
      doc.setName(document.filename);
      doc.setFileExtension(path.extname(document.filename).slice(1));
      doc.setDocumentId('1');

      envelopeDefinition.setDocuments([doc]);

      // Add signers
      const signerList = [];
      signers.forEach((signer, index) => {
        const signerObj = new docusign.Signer();
        signerObj.setEmail(signer.email);
        signerObj.setName(signer.name);
        signerObj.setRecipientId((index + 1).toString());
        signerObj.setRoutingOrder('1');

        // Add signature tab
        const signHere = new docusign.SignHere();
        signHere.setDocumentId('1');
        signHere.setPageNumber('1');
        signHere.setRecipientId((index + 1).toString());
        signHere.setTabLabel(`Signature${index + 1}`);
        signHere.setXPosition('200');
        signHere.setYPosition('400');

        // Add date signed tab
        const dateSigned = new docusign.DateSigned();
        dateSigned.setDocumentId('1');
        dateSigned.setPageNumber('1');
        dateSigned.setRecipientId((index + 1).toString());
        dateSigned.setTabLabel(`DateSigned${index + 1}`);
        dateSigned.setXPosition('350');
        dateSigned.setYPosition('400');

        const tabs = new docusign.Tabs();
        tabs.setSignHereTabs([signHere]);
        tabs.setDateSignedTabs([dateSigned]);

        signerObj.setTabs(tabs);
        signerList.push(signerObj);
      });

      // Create recipients
      const recipients = new docusign.Recipients();
      recipients.setSigners(signerList);
      envelopeDefinition.setRecipients(recipients);

      // Send envelope
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, { envelopeDefinition });

      // Update document with envelope ID
      await query(
        'UPDATE documents SET esignature_envelope_id = $1, esignature_status = $2 WHERE id = $3',
        [results.envelopeId, 'sent', documentId]
      );

      return {
        envelopeId: results.envelopeId,
        status: results.status,
        uri: results.uri
      };
    } catch (error) {
      console.error('Error creating DocuSign envelope:', error);
      throw new Error(`Failed to create signature request: ${error.message}`);
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId) {
    try {
      if (!this.apiClient) {
        throw new Error('DocuSign API client not configured');
      }

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.getEnvelope(this.accountId, envelopeId);

      return {
        envelopeId: results.envelopeId,
        status: results.status,
        sentDateTime: results.sentDateTime,
        completedDateTime: results.completedDateTime,
        declinedDateTime: results.declinedDateTime,
        deliveredDateTime: results.deliveredDateTime
      };
    } catch (error) {
      console.error('Error getting envelope status:', error);
      throw new Error(`Failed to get envelope status: ${error.message}`);
    }
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(envelopeId, documentId = '1') {
    try {
      if (!this.apiClient) {
        throw new Error('DocuSign API client not configured');
      }

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.getDocument(this.accountId, envelopeId, documentId);

      return {
        contentType: results.contentType,
        data: results.data,
        contentDisposition: results.contentDisposition
      };
    } catch (error) {
      console.error('Error downloading signed document:', error);
      throw new Error(`Failed to download signed document: ${error.message}`);
    }
  }

  /**
   * Void envelope
   */
  async voidEnvelope(envelopeId, voidReason = 'Cancelled by sender') {
    try {
      if (!this.apiClient) {
        throw new Error('DocuSign API client not configured');
      }

      const voidEnvelope = new docusign.VoidEnvelope();
      voidEnvelope.setVoidedReason(voidReason);

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.update(this.accountId, envelopeId, { voidEnvelope });

      // Update document status
      await query(
        'UPDATE documents SET esignature_status = $1 WHERE esignature_envelope_id = $2',
        ['cancelled', envelopeId]
      );

      return results;
    } catch (error) {
      console.error('Error voiding envelope:', error);
      throw new Error(`Failed to void envelope: ${error.message}`);
    }
  }

  /**
   * Get envelope recipients
   */
  async getEnvelopeRecipients(envelopeId) {
    try {
      if (!this.apiClient) {
        throw new Error('DocuSign API client not configured');
      }

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.listRecipients(this.accountId, envelopeId);

      return results.signers.map(signer => ({
        recipientId: signer.recipientId,
        name: signer.name,
        email: signer.email,
        status: signer.status,
        signedDateTime: signer.signedDateTime,
        deliveredDateTime: signer.deliveredDateTime,
        declinedDateTime: signer.declinedDateTime
      }));
    } catch (error) {
      console.error('Error getting envelope recipients:', error);
      throw new Error(`Failed to get envelope recipients: ${error.message}`);
    }
  }

  /**
   * Check if DocuSign is configured
   */
  isConfigured() {
    return !!(this.clientId && this.accountId && this.apiClient);
  }
}

module.exports = new DocuSignService();