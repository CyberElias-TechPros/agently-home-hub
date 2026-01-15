-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    path TEXT NOT NULL,
    s3_key TEXT, -- S3 object key for cloud storage

    -- Document classification
    document_type VARCHAR(50) NOT NULL DEFAULT 'general',
    category VARCHAR(50),
    
    -- Ownership and associations
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    maintenance_request_id INTEGER REFERENCES maintenance_requests(id) ON DELETE SET NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Metadata
    description TEXT,
    tags TEXT[], -- Array of tags for better organization
    keywords TEXT[], -- Search keywords
    
    -- Template system
    is_template BOOLEAN DEFAULT FALSE,
    template_variables JSONB, -- Variables that can be replaced in templates
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_latest_version BOOLEAN DEFAULT TRUE,
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private' CHECK (access_level IN ('public', 'private', 'restricted')),
    allowed_users INTEGER[], -- Array of user IDs who can access
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    
    -- E-signature integration
    esignature_status VARCHAR(20) DEFAULT 'none' CHECK (esignature_status IN ('none', 'pending', 'signed', 'expired', 'cancelled')),
    esignature_provider VARCHAR(50),
    esignature_envelope_id VARCHAR(255),
    esignature_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_filename UNIQUE (filename),
    CONSTRAINT valid_size CHECK (size > 0),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- Create document versions table for tracking changes
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Version details
    change_description TEXT,
    changed_by INTEGER REFERENCES users(id),
    change_type VARCHAR(50) CHECK (change_type IN ('create', 'update', 'delete', 'sign', 'expire')),
    
    -- File information for this version
    filename VARCHAR(255),
    path TEXT,
    size BIGINT,
    checksum VARCHAR(64), -- SHA-256 hash for integrity
    
    -- Metadata snapshot
    metadata_snapshot JSONB,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Create document access logs table
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Access details
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'download', 'upload', 'update', 'delete', 'sign')),
    ip_address INET,
    user_agent TEXT,
    
    -- Additional context
    context JSONB,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    
    -- Template content
    template_content TEXT NOT NULL, -- Template with variable placeholders
    template_type VARCHAR(50) NOT NULL, -- lease, contract, notice, etc.
    
    -- Variable definitions
    variables JSONB, -- Definition of variables that can be replaced
    
    -- Template configuration
    default_format VARCHAR(20) DEFAULT 'pdf' CHECK (default_format IN ('pdf', 'docx', 'html')),
    header_content TEXT,
    footer_content TEXT,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    
    -- Ownership
    created_by INTEGER REFERENCES users(id),
    is_system_template BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(is_template);
CREATE INDEX IF NOT EXISTS idx_documents_parent_document_id ON documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_latest_version ON documents(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_esignature_status ON documents(esignature_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON document_access_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_document_templates_template_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);

-- Create trigger to update updated_at timestamp for documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Create trigger to update updated_at timestamp for templates
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_updated_at();

-- Create trigger to log document access
CREATE OR REPLACE FUNCTION log_document_access()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called from application code to log access
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get latest version of a document
CREATE OR REPLACE FUNCTION get_latest_document_version(document_uuid UUID)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    filename VARCHAR(255),
    path TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT dv.id, dv.version_number, dv.filename, dv.path, dv.created_at
    FROM document_versions dv
    WHERE dv.document_id = document_uuid
    ORDER BY dv.version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insert sample document templates
INSERT INTO document_templates (
    name, description, category, template_content, template_type, variables, created_by, is_system_template
) VALUES
(
    'Standard Residential Lease',
    'Standard lease agreement template for residential properties',
    'lease',
    '# RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Lease") is made and entered into on {{lease_date}} by and between:

**Landlord:** {{landlord_name}}
{{landlord_address}}

**Tenant:** {{tenant_name}}
{{tenant_address}}

## 1. PREMISES
Landlord agrees to rent to Tenant and Tenant agrees to rent from Landlord the residential premises located at:
{{property_address}}
(the "Premises").

## 2. TERM
The lease term shall begin on {{start_date}} and end on {{end_date}}.

## 3. RENT
Tenant shall pay rent in the amount of ${{rent_amount}} per month, payable on the {{rent_due_day}} day of each month.

## 4. SECURITY DEPOSIT
Tenant shall pay a security deposit of ${{security_deposit}}.

## 5. UTILITIES
{{utilities_clause}}

## 6. MAINTENANCE AND REPAIRS
{{maintenance_clause}}

## 7. USE OF PREMISES
The Premises shall be used as a private residence only.

## 8. PETS
{{pets_clause}}

## 9. TERMINATION
{{termination_clause}}

IN WITNESS WHEREOF, the parties have executed this Lease as of the date first written above.

_________________________     _________________________
{{landlord_name}}              {{tenant_name}}
Landlord                        Tenant',
    'lease',
    '{"lease_date": {"type": "date", "label": "Lease Date"}, "landlord_name": {"type": "text", "label": "Landlord Name"}, "landlord_address": {"type": "textarea", "label": "Landlord Address"}, "tenant_name": {"type": "text", "label": "Tenant Name"}, "tenant_address": {"type": "textarea", "label": "Tenant Address"}, "property_address": {"type": "text", "label": "Property Address"}, "start_date": {"type": "date", "label": "Lease Start Date"}, "end_date": {"type": "date", "label": "Lease End Date"}, "rent_amount": {"type": "number", "label": "Monthly Rent"}, "rent_due_day": {"type": "number", "label": "Rent Due Day"}, "security_deposit": {"type": "number", "label": "Security Deposit"}, "utilities_clause": {"type": "textarea", "label": "Utilities Clause"}, "maintenance_clause": {"type": "textarea", "label": "Maintenance Clause"}, "pets_clause": {"type": "textarea", "label": "Pets Clause"}, "termination_clause": {"type": "textarea", "label": "Termination Clause"}}',
    1,
    true
),
(
    'Maintenance Request Form',
    'Template for documenting maintenance requests',
    'maintenance',
    '# MAINTENANCE REQUEST

**Request ID:** {{request_id}}
**Date:** {{request_date}}
**Property:** {{property_address}}

**Tenant Information:**
Name: {{tenant_name}}
Phone: {{tenant_phone}}
Email: {{tenant_email}}

**Issue Details:**
Category: {{category}}
Priority: {{priority}}
Area Affected: {{area_affected}}

**Description:**
{{description}}

**Access Instructions:**
{{access_instructions}}

**Landlord Notes:**
{{landlord_notes}}

**Contractor Assignment:**
{{contractor_assignment}}

**Resolution:**
{{resolution_details}}',
    'maintenance',
    '{"request_id": {"type": "text", "label": "Request ID"}, "request_date": {"type": "date", "label": "Request Date"}, "property_address": {"type": "text", "label": "Property Address"}, "tenant_name": {"type": "text", "label": "Tenant Name"}, "tenant_phone": {"type": "text", "label": "Tenant Phone"}, "tenant_email": {"type": "email", "label": "Tenant Email"}, "category": {"type": "select", "label": "Category", "options": ["plumbing", "electrical", "hvac", "appliance", "structural", "pest_control", "cleaning", "other"]}, "priority": {"type": "select", "label": "Priority", "options": ["low", "medium", "high", "urgent"]}, "area_affected": {"type": "text", "label": "Area Affected"}, "description": {"type": "textarea", "label": "Description"}, "access_instructions": {"type": "textarea", "label": "Access Instructions"}, "landlord_notes": {"type": "textarea", "label": "Landlord Notes"}, "contractor_assignment": {"type": "textarea", "label": "Contractor Assignment"}, "resolution_details": {"type": "textarea", "label": "Resolution Details"}}',
    1,
    true
),
(
    'Notice to Vacate',
    'Template for tenant notice to vacate',
    'notice',
    '# NOTICE TO VACATE

**Date:** {{notice_date}}

**To:** {{landlord_name}}
{{landlord_address}}

**From:** {{tenant_name}}
{{tenant_address}}

**Subject:** Notice to Vacate

Please accept this letter as formal notification that I will be vacating the premises at:

{{property_address}}

on or before {{vacate_date}}.

**Reason for Vacating:**
{{vacate_reason}}

**Forwarding Address:**
{{forwarding_address}}

I understand that I am responsible for:
- Paying rent through the vacate date
- Leaving the premises in clean condition
- Returning all keys
- Completing a move-out inspection

Please contact me to arrange the move-out inspection and key return.

Sincerely,

{{tenant_name}}
{{tenant_phone}}
{{tenant_email}}',
    'notice',
    '{"notice_date": {"type": "date", "label": "Notice Date"}, "landlord_name": {"type": "text", "label": "Landlord Name"}, "landlord_address": {"type": "textarea", "label": "Landlord Address"}, "tenant_name": {"type": "text", "label": "Tenant Name"}, "tenant_address": {"type": "textarea", "label": "Tenant Address"}, "property_address": {"type": "text", "label": "Property Address"}, "vacate_date": {"type": "date", "label": "Vacate Date"}, "vacate_reason": {"type": "textarea", "label": "Reason for Vacating"}, "forwarding_address": {"type": "textarea", "label": "Forwarding Address"}, "tenant_phone": {"type": "text", "label": "Tenant Phone"}, "tenant_email": {"type": "email", "label": "Tenant Email"}}',
    1,
    true
);
