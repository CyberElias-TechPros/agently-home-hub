-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Lead information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    
    -- Lead source and origin
    source VARCHAR(50) NOT NULL CHECK (source IN ('website', 'referral', 'social_media', 'open_house', 'advertisement', 'cold_call', 'walk_in', 'other')),
    source_details TEXT, -- Additional details about the source
    campaign_id VARCHAR(255), -- Marketing campaign identifier
    
    -- Property interest
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    property_preferences JSONB, -- JSON object with property preferences
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    preferred_locations TEXT[], -- Array of preferred locations
    preferred_property_types TEXT[], -- Array of property types
    preferred_bedrooms INTEGER,
    preferred_bathrooms INTEGER,
    preferred_area_min INTEGER,
    preferred_area_max INTEGER,
    move_in_date DATE,
    lease_term_months INTEGER,
    
    -- Lead status and assignment
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'qualified', 'viewing_scheduled', 'viewing_completed', 'offer_made', 'negotiating', 'closed_won', 'closed_lost', 'inactive', 'archived')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Contact information
    preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'any')),
    best_contact_time VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Lead scoring
    lead_score INTEGER DEFAULT 0,
    score_factors JSONB, -- Factors that contributed to the score
    
    -- Notes and communication
    notes TEXT,
    last_contacted_at TIMESTAMP,
    next_follow_up_at TIMESTAMP,
    follow_up_notes TEXT,
    
    -- Conversion tracking
    conversion_probability INTEGER DEFAULT 0, -- 0-100 percentage
    estimated_close_date DATE,
    estimated_commission DECIMAL(10,2),
    
    -- Address information
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Additional demographics
    age_range VARCHAR(20), -- e.g., '25-35', '35-45', etc.
    occupation VARCHAR(100),
    employment_status VARCHAR(50),
    household_size INTEGER,
    income_range VARCHAR(20),
    pets BOOLEAN DEFAULT FALSE,
    smoking VARCHAR(20), -- 'yes', 'no', 'occasionally'
    
    -- Marketing and analytics
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    landing_page VARCHAR(255),
    referrer_url TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Status timestamps
    contacted_at TIMESTAMP,
    qualified_at TIMESTAMP,
    viewing_scheduled_at TIMESTAMP,
    viewing_completed_at TIMESTAMP,
    offer_made_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT valid_phone CHECK (phone ~* '^\+?[0-9\s\-\(\)]+$' OR phone IS NULL),
    CONSTRAINT valid_budget CHECK (budget_max >= budget_min OR budget_max IS NULL OR budget_min IS NULL),
    CONSTRAINT valid_area CHECK (area_max >= area_min OR area_max IS NULL OR area_min IS NULL),
    CONSTRAINT valid_score CHECK (lead_score BETWEEN 0 AND 100),
    CONSTRAINT valid_probability CHECK (conversion_probability BETWEEN 0 AND 100)
);

-- Create lead communications table
CREATE TABLE IF NOT EXISTS lead_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Communication details
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'phone', 'text', 'in_person', 'note', 'task', 'meeting')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Contact information
    contact_person VARCHAR(255),
    contact_method VARCHAR(20),
    contact_details JSONB,
    
    -- Status and outcome
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'failed', 'scheduled', 'completed', 'cancelled')),
    outcome TEXT,
    next_action_required BOOLEAN DEFAULT FALSE,
    next_action_details TEXT,
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Agent information
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 OR duration_minutes IS NULL)
);

-- Create lead activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Activity details
    type VARCHAR(30) NOT NULL CHECK (type IN ('created', 'status_change', 'assigned', 'contacted', 'viewing_scheduled', 'viewing_completed', 'offer_made', 'negotiation_started', 'closed_won', 'closed_lost', 'note_added', 'task_completed', 'email_sent', 'phone_call', 'meeting_scheduled', 'meeting_completed')),
    description TEXT NOT NULL,
    
    -- Activity data
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    
    -- Agent information
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lead tasks table
CREATE TABLE IF NOT EXISTS lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Task details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'follow_up' CHECK (type IN ('follow_up', 'call', 'email', 'meeting', 'viewing', 'documentation', 'negotiation', 'other')),
    
    -- Status and priority
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Assignment
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Scheduling
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Task details
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    
    -- Notes and outcomes
    notes TEXT,
    outcome TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_due_date CHECK (due_date > created_at OR due_date IS NULL)
);

-- Create lead documents table
CREATE TABLE IF NOT EXISTS lead_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Document details
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('agreement', 'application', 'id_proof', 'income_proof', 'reference', 'other')),
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected', 'expired')),
    verification_notes TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Create showings table
CREATE TABLE IF NOT EXISTS showings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Showing details
    title VARCHAR(255),
    description TEXT,
    type VARCHAR(20) DEFAULT 'viewing' CHECK (type IN ('viewing', 'open_house', 'virtual_tour', 'inspection')),
    
    -- Scheduling
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    end_time TIMESTAMP GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) STORED,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    
    -- Participants
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attendees TEXT[], -- Array of attendee names
    
    -- Location details
    meeting_point VARCHAR(255),
    access_instructions TEXT,
    parking_instructions TEXT,
    
    -- Feedback and outcomes
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_notes TEXT,
    next_steps TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP,
    follow_up_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes > 0),
    CONSTRAINT valid_end_time CHECK (end_time > scheduled_at)
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Commission details
    type VARCHAR(20) NOT NULL CHECK (type IN ('rental', 'sale', 'referral', 'bonus')),
    amount DECIMAL(10,2) NOT NULL,
    percentage_rate DECIMAL(5,2), -- Commission percentage
    base_amount DECIMAL(10,2), -- Base transaction amount
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'paid', 'cancelled', 'disputed')),
    earned_at TIMESTAMP,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    
    -- Split commissions
    split_type VARCHAR(20) CHECK (split_type IN ('none', 'percentage', 'fixed')),
    split_details JSONB, -- Details about commission splits
    
    -- Terms and conditions
    terms TEXT,
    conditions JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_percentage CHECK (percentage_rate BETWEEN 0 AND 100 OR percentage_rate IS NULL)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

CREATE INDEX IF NOT EXISTS idx_lead_communications_lead_id ON lead_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_communications_agent_id ON lead_communications(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_communications_created_at ON lead_communications(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_communications_scheduled_at ON lead_communications(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_agent_id ON lead_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(type);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_date ON lead_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_id ON lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_documents_type ON lead_documents(type);
CREATE INDEX IF NOT EXISTS idx_lead_documents_status ON lead_documents(status);

CREATE INDEX IF NOT EXISTS idx_showings_lead_id ON showings(lead_id);
CREATE INDEX IF NOT EXISTS idx_showings_property_id ON showings(property_id);
CREATE INDEX IF NOT EXISTS idx_showings_agent_id ON showings(agent_id);
CREATE INDEX IF NOT EXISTS idx_showings_scheduled_at ON showings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_showings_status ON showings(status);

CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead_id ON commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_commissions_property_id ON commissions(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_earned_at ON commissions(earned_at);

-- Create trigger to update updated_at timestamp for leads
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

-- Create trigger to update updated_at timestamp for lead_communications
CREATE OR REPLACE FUNCTION update_lead_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lead_communications_updated_at
    BEFORE UPDATE ON lead_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_communications_updated_at();

-- Create trigger to update updated_at timestamp for lead_tasks
CREATE OR REPLACE FUNCTION update_lead_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lead_tasks_updated_at
    BEFORE UPDATE ON lead_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_tasks_updated_at();

-- Create trigger to update updated_at timestamp for showings
CREATE OR REPLACE FUNCTION update_showings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_showings_updated_at
    BEFORE UPDATE ON showings
    FOR EACH ROW
    EXECUTE FUNCTION update_showings_updated_at();

-- Create trigger to update updated_at timestamp for commissions
CREATE OR REPLACE FUNCTION update_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_commissions_updated_at();

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    lead_record RECORD;
    score INTEGER := 0;
BEGIN
    SELECT * INTO lead_record 
    FROM leads 
    WHERE id = lead_uuid;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Base score for having contact information
    IF lead_record.email IS NOT NULL THEN score := score + 10; END IF;
    IF lead_record.phone IS NOT NULL THEN score := score + 10; END IF;
    
    -- Score for budget information
    IF lead_record.budget_min IS NOT NULL AND lead_record.budget_max IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Score for property preferences
    IF lead_record.preferred_locations IS NOT NULL AND array_length(lead_record.preferred_locations, 1) > 0 THEN
        score := score + 10;
    END IF;
    
    IF lead_record.preferred_property_types IS NOT NULL AND array_length(lead_record.preferred_property_types, 1) > 0 THEN
        score := score + 5;
    END IF;
    
    -- Score for move-in date
    IF lead_record.move_in_date IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    -- Score for engagement
    IF lead_record.last_contacted_at IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Score for high priority sources
    IF lead_record.source IN ('referral', 'open_house') THEN
        score := score + 10;
    END IF;
    
    -- Cap score at 100
    IF score > 100 THEN score := 100; END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to get lead statistics for an agent
CREATE OR REPLACE FUNCTION get_agent_lead_statistics(agent_user_id INTEGER)
RETURNS TABLE (
    total_leads INTEGER,
    new_leads INTEGER,
    contacted_leads INTEGER,
    qualified_leads INTEGER,
    closed_won_leads INTEGER,
    closed_lost_leads INTEGER,
    conversion_rate DECIMAL(5,2),
    avg_lead_score DECIMAL(5,2),
    total_commission DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'closed_won' THEN 1 END) as closed_won_leads,
        COUNT(CASE WHEN status = 'closed_lost' THEN 1 END) as closed_lost_leads,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN status = 'closed_won' THEN 1 END) * 100.0 / COUNT(*), 2)
            ELSE 0 
        END as conversion_rate,
        ROUND(AVG(lead_score), 2) as avg_lead_score,
        COALESCE(SUM(c.amount), 0) as total_commission
    FROM leads l
    LEFT JOIN commissions c ON l.id = c.lead_id AND c.status = 'paid'
    WHERE l.agent_id = agent_user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample lead data
INSERT INTO leads (
    first_name, last_name, email, phone, source, property_id, budget_min, budget_max,
    preferred_locations, preferred_property_types, preferred_bedrooms, preferred_bathrooms,
    move_in_date, status, priority, agent_id, lead_score, notes, created_by
) VALUES
(
    'John', 'Smith', 'john.smith@email.com', '(555) 123-4567', 'website', 1,
    2000.00, 3000.00,
    ARRAY['San Francisco', 'Oakland'],
    ARRAY['apartment', 'condo'],
    2, 2,
    '2024-12-01', 'new', 'medium', 1, 65,
    'Interested in 2-bedroom apartment in San Francisco area. Works in tech industry.',
    1
),
(
    'Sarah', 'Johnson', 'sarah.j@email.com', '(555) 987-6543', 'referral', 2,
    3500.00, 4500.00,
    ARRAY['New York', 'Brooklyn'],
    ARRAY['condo', 'townhouse'],
    3, 2,
    '2025-01-15', 'qualified', 'high', 2, 85,
    'Referred by current tenant. Looking for family-friendly neighborhood.',
    1
),
(
    'Michael', 'Brown', 'michael.b@email.com', '(555) 456-7890', 'open_house', 1,
    2500.00, 3500.00,
    ARRAY['San Francisco'],
    ARRAY['apartment'],
    1, 1,
    '2024-11-15', 'viewing_scheduled', 'medium', 1, 75,
    'Attended open house and requested private viewing.',
    1
);
