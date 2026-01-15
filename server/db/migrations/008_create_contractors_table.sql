-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business information
    business_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    
    -- Contact information
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Services offered
    services TEXT[], -- Array of service categories (plumbing, electrical, etc.)
    
    -- Service area
    service_areas TEXT[], -- Array of cities/regions served
    
    -- Professional details
    years_experience INTEGER,
    specialties TEXT[], -- Array of specializations
    
    -- Business hours
    business_hours JSONB, -- JSON object with daily hours
    
    -- Pricing
    hourly_rate DECIMAL(10,2),
    service_call_fee DECIMAL(10,2),
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    background_checked BOOLEAN DEFAULT FALSE,
    insured BOOLEAN DEFAULT FALSE,
    
    -- Ratings
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Availability
    available BOOLEAN DEFAULT TRUE,
    max_jobs_per_day INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_contractor UNIQUE (user_id)
);

-- Create contractor assignments table
CREATE TABLE IF NOT EXISTS contractor_assignments (
    id SERIAL PRIMARY KEY,
    maintenance_request_id INTEGER REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Assignment details
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    
    -- Timeline
    estimated_start_date DATE,
    estimated_completion_date DATE,
    actual_start_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    
    -- Cost
    quoted_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    
    -- Communication
    contractor_notes TEXT,
    landlord_notes TEXT,
    
    -- Materials and labor
    materials_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    other_costs DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_request_assignment UNIQUE (maintenance_request_id)
);

-- Create contractor availability table
CREATE TABLE IF NOT EXISTS contractor_availability (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Date and time
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    available BOOLEAN DEFAULT TRUE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_contractor_datetime UNIQUE (contractor_id, date, start_time)
);

-- Create contractor reviews table
CREATE TABLE IF NOT EXISTS contractor_reviews (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    maintenance_request_id INTEGER REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Review details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    -- Review categories
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_review_per_request UNIQUE (maintenance_request_id, reviewer_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_services ON contractors USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_contractors_service_areas ON contractors USING GIN(service_areas);
CREATE INDEX IF NOT EXISTS idx_contractors_rating ON contractors(rating);
CREATE INDEX IF NOT EXISTS idx_contractors_available ON contractors(available);
CREATE INDEX IF NOT EXISTS idx_contractors_verified ON contractors(verified);

CREATE INDEX IF NOT EXISTS idx_assignments_maintenance_request_id ON contractor_assignments(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_assignments_contractor_id ON contractor_assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON contractor_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON contractor_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_availability_contractor_id ON contractor_availability(contractor_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON contractor_availability(date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON contractor_availability(available);

CREATE INDEX IF NOT EXISTS idx_reviews_contractor_id ON contractor_reviews(contractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON contractor_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON contractor_reviews(created_at);

-- Create trigger to update updated_at timestamp for contractors
CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_contractors_updated_at
    BEFORE UPDATE ON contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_contractors_updated_at();

-- Create trigger to update updated_at timestamp for assignments
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_assignments_updated_at
    BEFORE UPDATE ON contractor_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_assignments_updated_at();

-- Create trigger to update contractor rating when review is added
CREATE OR REPLACE FUNCTION update_contractor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE contractors 
    SET rating = (
        SELECT COALESCE(AVG(rating), 0) 
        FROM contractor_reviews 
        WHERE contractor_id = NEW.contractor_id
    ),
    review_count = (
        SELECT COUNT(*) 
        FROM contractor_reviews 
        WHERE contractor_id = NEW.contractor_id
    )
    WHERE id = NEW.contractor_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_contractor_rating
    AFTER INSERT OR UPDATE ON contractor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_rating();

-- Insert sample contractor data
INSERT INTO contractors (
    user_id, business_name, license_number, insurance_number, insurance_expiry,
    phone, website, services, service_areas, years_experience, specialties,
    business_hours, hourly_rate, service_call_fee, verified, background_checked, insured
) VALUES
(
    5, 'John Plumbing Services', 'PL123456', 'INS789012', '2025-12-31',
    '(555) 123-4567', 'https://johnplumbing.com', 
    ARRAY['plumbing', 'hvac'], 
    ARRAY['San Francisco', 'Oakland', 'Berkeley'],
    15, 
    ARRAY['emergency_repairs', 'pipe_installation', 'water_heaters'],
    '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}, "saturday": {"start": "09:00", "end": "15:00"}, "sunday": {"closed": true}}',
    85.00, 75.00, true, true, true
),
(
    6, 'Bay Area Electrical', 'EL987654', 'INS345678', '2025-06-30',
    '(555) 987-6543', 'https://bayareaelectrical.com',
    ARRAY['electrical'],
    ARRAY['San Francisco', 'San Jose', 'Palo Alto'],
    12,
    ARRAY['panel_upgrades', 'wiring', 'lighting_installation'],
    '{"monday": {"start": "07:00", "end": "19:00"}, "tuesday": {"start": "07:00", "end": "19:00"}, "wednesday": {"start": "07:00", "end": "19:00"}, "thursday": {"start": "07:00", "end": "19:00"}, "friday": {"start": "07:00", "end": "19:00"}, "saturday": {"start": "08:00", "end": "16:00"}, "sunday": {"closed": true}}',
    95.00, 85.00, true, true, true
);

-- Insert sample contractor reviews
INSERT INTO contractor_reviews (
    contractor_id, maintenance_request_id, reviewer_id, rating, title, comment,
    professionalism_rating, quality_rating, timeliness_rating, communication_rating, value_rating
) VALUES
(1, 1, 1, 5, 'Excellent service!', 'John was professional and fixed our plumbing issue quickly.', 5, 5, 5, 5, 4),
(2, 2, 1, 4, 'Good work', 'Electrical work was done well, though they were a bit late.', 4, 5, 3, 4, 4);
