-- Create leases table
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    landlord_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Lease terms
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) NOT NULL,
    rent_due_day INTEGER DEFAULT 1,
    
    -- Template information
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    variables JSONB, -- Variables used in template generation
    
    -- Status and signatures
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'executed', 'expired', 'terminated')),
    tenant_signed BOOLEAN DEFAULT FALSE,
    landlord_signed BOOLEAN DEFAULT FALSE,
    tenant_signed_at TIMESTAMP,
    landlord_signed_at TIMESTAMP,
    
    -- E-signature integration
    esignature_envelope_id VARCHAR(255),
    esignature_status VARCHAR(20) DEFAULT 'none' CHECK (esignature_status IN ('none', 'sent', 'signed', 'completed', 'declined', 'expired')),
    esignature_url TEXT,
    
    -- Additional terms
    custom_terms JSONB,
    notes TEXT,
    
    -- Renewal information
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 30,
    renewal_terms JSONB,
    
    -- Termination information
    termination_date DATE,
    termination_reason VARCHAR(255),
    termination_notice_given BOOLEAN DEFAULT FALSE,
    
    -- Financial tracking
    rent_paid_through DATE,
    deposit_returned BOOLEAN DEFAULT FALSE,
    deposit_deductions JSONB,
    deposit_return_date DATE,
    
    -- Compliance and legal
    legal_jurisdiction VARCHAR(100),
    governing_law VARCHAR(100),
    compliance_checks JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_rent CHECK (rent_amount > 0),
    CONSTRAINT valid_deposit CHECK (security_deposit >= 0),
    CONSTRAINT valid_due_day CHECK (rent_due_day BETWEEN 1 AND 31)
);

-- Create lease amendments table for tracking changes
CREATE TABLE IF NOT EXISTS lease_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    
    -- Amendment details
    amendment_type VARCHAR(50) NOT NULL CHECK (amendment_type IN ('rent_change', 'term_extension', 'pet_addition', 'policy_change', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Amendment content
    old_values JSONB,
    new_values JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'proposed', 'negotiating', 'accepted', 'rejected', 'executed')),
    
    -- Signatures
    tenant_signed BOOLEAN DEFAULT FALSE,
    landlord_signed BOOLEAN DEFAULT FALSE,
    tenant_signed_at TIMESTAMP,
    landlord_signed_at TIMESTAMP,
    
    -- Effective date
    effective_date DATE,
    
    -- Created by
    created_by INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

-- Create lease payments table for tracking rent payments
CREATE TABLE IF NOT EXISTS lease_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'late_fee', 'utility', 'other')),
    
    -- Payment method
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online', 'auto_debit')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'partial', 'overdue', 'cancelled')),
    
    -- Payment processing
    transaction_id VARCHAR(255),
    processor VARCHAR(50),
    processed_at TIMESTAMP,
    
    -- Late fees and penalties
    late_fee_applied DECIMAL(10,2) DEFAULT 0,
    late_fee_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Created by
    recorded_by INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lease inspections table
CREATE TABLE IF NOT EXISTS lease_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    
    -- Inspection details
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('move_in', 'move_out', 'routine', 'emergency')),
    inspection_date DATE NOT NULL,
    inspector_id INTEGER REFERENCES users(id),
    
    -- Inspection results
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
    findings TEXT,
    issues_identified JSONB,
    
    -- Photos and documents
    photos TEXT[], -- Array of photo URLs
    documents TEXT[], -- Array of document IDs
    
    -- Actions required
    actions_required JSONB,
    completion_deadline DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leases_document_id ON leases(document_id);
CREATE INDEX IF NOT EXISTS idx_leases_booking_id ON leases(booking_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_start_date ON leases(start_date);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date);
CREATE INDEX IF NOT EXISTS idx_leases_created_at ON leases(created_at);
CREATE INDEX IF NOT EXISTS idx_leases_template_id ON leases(template_id);

CREATE INDEX IF NOT EXISTS idx_lease_amendments_lease_id ON lease_amendments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_amendments_status ON lease_amendments(status);
CREATE INDEX IF NOT EXISTS idx_lease_amendments_created_at ON lease_amendments(created_at);

CREATE INDEX IF NOT EXISTS idx_lease_payments_lease_id ON lease_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_payment_date ON lease_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_lease_payments_status ON lease_payments(status);
CREATE INDEX IF NOT EXISTS idx_lease_payments_created_at ON lease_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_lease_inspections_lease_id ON lease_inspections(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_inspections_type ON lease_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_lease_inspections_date ON lease_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_lease_inspections_status ON lease_inspections(status);

-- Create trigger to update updated_at timestamp for leases
CREATE OR REPLACE FUNCTION update_leases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW
    EXECUTE FUNCTION update_leases_updated_at();

-- Create trigger to update updated_at timestamp for amendments
CREATE OR REPLACE FUNCTION update_lease_amendments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lease_amendments_updated_at
    BEFORE UPDATE ON lease_amendments
    FOR EACH ROW
    EXECUTE FUNCTION update_lease_amendments_updated_at();

-- Create trigger to update updated_at timestamp for payments
CREATE OR REPLACE FUNCTION update_lease_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lease_payments_updated_at
    BEFORE UPDATE ON lease_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_lease_payments_updated_at();

-- Create trigger to update updated_at timestamp for inspections
CREATE OR REPLACE FUNCTION update_lease_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lease_inspections_updated_at
    BEFORE UPDATE ON lease_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_lease_inspections_updated_at();

-- Function to check if lease is active
CREATE OR REPLACE FUNCTION is_lease_active(lease_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    lease_record RECORD;
BEGIN
    SELECT * INTO lease_record 
    FROM leases 
    WHERE id = lease_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if lease is signed and within date range
    IF lease_record.status != 'signed' AND lease_record.status != 'executed' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if lease has expired
    IF CURRENT_DATE > lease_record.end_date THEN
        RETURN FALSE;
    END IF;
    
    -- Check if lease has been terminated
    IF lease_record.termination_date IS NOT NULL AND CURRENT_DATE >= lease_record.termination_date THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next rent due date
CREATE OR REPLACE FUNCTION get_next_rent_due_date(lease_uuid UUID)
RETURNS DATE AS $$
DECLARE
    lease_record RECORD;
    next_due_date DATE;
BEGIN
    SELECT * INTO lease_record 
    FROM leases 
    WHERE id = lease_uuid AND is_lease_active(lease_uuid);
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Calculate next due date based on rent due day
    next_due_date := DATE_TRUNC('month', CURRENT_DATE);
    next_due_date := next_due_date + (lease_record.rent_due_day - 1) * INTERVAL '1 day';
    
    -- If the calculated date has passed this month, move to next month
    IF next_due_date < CURRENT_DATE THEN
        next_due_date := next_due_date + INTERVAL '1 month';
    END IF;
    
    RETURN next_due_date;
END;
$$ LANGUAGE plpgsql;

-- Sample lease data (for testing)
INSERT INTO leases (
    document_id, booking_id, property_id, tenant_id, landlord_id,
    start_date, end_date, rent_amount, security_deposit,
    template_id, variables, status
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000', -- Sample document ID
    1, -- Sample booking ID
    1, -- Sample property ID
    2, -- Sample tenant ID
    1, -- Sample landlord ID
    '2024-12-01',
    '2025-12-01',
    2500.00,
    2500.00,
    '550e8400-e29b-41d4-a716-446655440001', -- Sample template ID
    '{"property_address": "123 Main Street, San Francisco, CA 94102", "landlord_name": "John Doe", "tenant_name": "Jane Smith"}',
    'pending'
);
