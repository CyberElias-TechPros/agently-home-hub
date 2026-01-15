-- Create maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    landlord_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contractor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Request details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'other')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected')),
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Location details
    area_affected VARCHAR(255),
    access_instructions TEXT,
    
    -- Media attachments
    images TEXT[], -- Array of image URLs
    documents TEXT[], -- Array of document URLs
    
    -- Communication
    tenant_notes TEXT,
    landlord_notes TEXT,
    contractor_notes TEXT,
    
    -- Cost tracking
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT idx_maintenance_property_id FOREIGN KEY (property_id) REFERENCES properties(id),
    CONSTRAINT idx_maintenance_tenant_id FOREIGN KEY (tenant_id) REFERENCES users(id),
    CONSTRAINT idx_maintenance_landlord_id FOREIGN KEY (landlord_id) REFERENCES users(id),
    CONSTRAINT idx_maintenance_contractor_id FOREIGN KEY (contractor_id) REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_landlord_id ON maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contractor_id ON maintenance_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_category ON maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON maintenance_requests(created_at);

-- Create maintenance request history table for tracking changes
CREATE TABLE IF NOT EXISTS maintenance_request_history (
    id SERIAL PRIMARY KEY,
    maintenance_request_id INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    
    -- Change details
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'status_changed', 'assigned', 'note_added', 'cost_updated')),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Who made the change
    changed_by INTEGER REFERENCES users(id),
    changed_by_role VARCHAR(50),
    
    -- Additional details
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for history table
CREATE INDEX IF NOT EXISTS idx_maintenance_history_request_id ON maintenance_request_history(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_created_at ON maintenance_request_history(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_maintenance_request_updated_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_request_updated_at();

-- Insert sample data for testing
INSERT INTO maintenance_requests (
    property_id, tenant_id, landlord_id, title, description, category, priority, status, area_affected, access_instructions, tenant_notes
) VALUES
(1, 2, 1, 'Leaking Kitchen Faucet', 'The kitchen faucet is leaking from the base and needs to be repaired or replaced.', 'plumbing', 'medium', 'pending', 'Kitchen', 'Please call before entering, tenant works from home.', 'Leak started yesterday evening and getting worse.'),
(2, 3, 1, 'AC Not Cooling', 'The air conditioning unit is not cooling properly. Temperature is not dropping below 78°F.', 'hvac', 'high', 'pending', 'Living Room', 'Key available in lockbox. Code: 1234', 'AC has been making strange noises for a week.'),
(3, 4, 1, 'Broken Dishwasher', 'Dishwasher is not draining properly and water is pooling at the bottom.', 'appliance', 'medium', 'pending', 'Kitchen', 'Available weekdays after 6pm.', 'Dishwasher stopped draining 2 days ago.');
