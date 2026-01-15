-- Create maintenance table for repair requests
CREATE TABLE IF NOT EXISTS maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    
    -- Assignment details
    assigned_to VARCHAR(255), -- Contractor name or ID
    contractor_contact VARCHAR(255),
    
    -- Resolution details
    resolution_notes TEXT,
    completion_date DATE,
    cost DECIMAL(10,2),
    
    -- Attachments
    images TEXT[], -- Array of image URLs
    documents TEXT[], -- Array of document URLs
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_category ON maintenance(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON maintenance(created_at);
