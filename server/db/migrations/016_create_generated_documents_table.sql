-- Create generated_documents table
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,

    -- Generation data
    variables JSONB NOT NULL,
    content TEXT NOT NULL,
    pdf_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'signed', 'expired')),

    -- Constraints
    CONSTRAINT valid_variables CHECK (jsonb_typeof(variables) = 'object')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_by ON generated_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON generated_documents(status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at ON generated_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_documents_pdf_document_id ON generated_documents(pdf_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_documents_updated_at();