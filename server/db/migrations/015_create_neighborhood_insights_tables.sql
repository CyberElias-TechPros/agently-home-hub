-- Neighborhood Insights Database Schema
-- This migration creates tables for neighborhood data, demographics, schools, amenities, and transportation

-- Neighborhoods table
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    description TEXT,
    center_point GEOGRAPHY(POINT, 4326) NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    population INTEGER,
    area_sq_km DECIMAL(10,2),
    established_year INTEGER,
    median_income DECIMAL(12,2),
    median_age DECIMAL(4,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood demographics table
CREATE TABLE IF NOT EXISTS neighborhood_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    population_density DECIMAL(10,2), -- people per sq km
    median_household_income DECIMAL(12,2),
    median_home_value DECIMAL(12,2),
    renter_percentage DECIMAL(5,2), -- percentage of renters
    owner_percentage DECIMAL(5,2), -- percentage of owners
    family_percentage DECIMAL(5,2), -- percentage of families with children
    bachelor_degree_or_higher DECIMAL(5,2), -- percentage with bachelor's degree or higher
    unemployment_rate DECIMAL(5,2),
    poverty_rate DECIMAL(5,2),
    median_commute_time DECIMAL(5,2), -- minutes
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('elementary', 'middle', 'high', 'charter', 'private')),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    grades_served VARCHAR(50), -- e.g., "K-5", "6-8", "9-12"
    student_count INTEGER,
    student_teacher_ratio DECIMAL(4,1),
    district VARCHAR(255),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Amenities table
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'grocery', 'restaurant', 'park', 'hospital', 'school', 'shopping', 
        'pharmacy', 'bank', 'gym', 'entertainment', 'gas_station', 
        'library', 'post_office', 'community_center'
    )),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4), -- 1=inexpensive, 4=very expensive
    opening_hours JSONB, -- Store opening hours as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Public transportation table
CREATE TABLE IF NOT EXISTS public_transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bus_stop', 'train_station', 'subway_station', 'ferry_terminal')),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    lines_served TEXT[], -- Array of line numbers/names
    accessibility_features BOOLEAN[], -- Array of accessibility features
    operating_hours JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood crime statistics table
CREATE TABLE IF NOT EXISTS neighborhood_crime_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_incidents INTEGER NOT NULL DEFAULT 0,
    property_crime INTEGER NOT NULL DEFAULT 0,
    violent_crime INTEGER NOT NULL DEFAULT 0,
    safety_score DECIMAL(5,2) CHECK (safety_score >= 0 AND safety_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id, year, month)
);

-- Neighborhood scores table (cached calculated scores)
CREATE TABLE IF NOT EXISTS neighborhood_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    walk_score DECIMAL(5,2) CHECK (walk_score >= 0 AND walk_score <= 100),
    transit_score DECIMAL(5,2) CHECK (transit_score >= 0 AND transit_score <= 100),
    bike_score DECIMAL(5,2) CHECK (bike_score >= 0 AND bike_score <= 100),
    school_score DECIMAL(5,2) CHECK (school_score >= 0 AND school_score <= 100),
    safety_score DECIMAL(5,2) CHECK (safety_score >= 0 AND safety_score <= 100),
    amenities_score DECIMAL(5,2) CHECK (amenities_score >= 0 AND amenities_score <= 100),
    overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id)
);

-- Property analytics table (for demand tracking)
CREATE TABLE IF NOT EXISTS property_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('view', 'inquiry', 'favorite', 'share')),
    metadata JSONB, -- Additional data about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_neighborhoods_center_point ON neighborhoods USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_boundary ON neighborhoods USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_location ON neighborhoods (city, state);

CREATE INDEX IF NOT EXISTS idx_schools_location ON schools USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools (type);
CREATE INDEX IF NOT EXISTS idx_schools_rating ON schools (rating DESC);

CREATE INDEX IF NOT EXISTS idx_amenities_location ON amenities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_amenities_type ON amenities (type);
CREATE INDEX IF NOT EXISTS idx_amenities_rating ON amenities (rating DESC);

CREATE INDEX IF NOT EXISTS idx_public_transport_location ON public_transport USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_public_transport_type ON public_transport (type);

CREATE INDEX IF NOT EXISTS idx_crime_stats_neighborhood_date ON neighborhood_crime_stats (neighborhood_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_property_analytics_property ON property_analytics (property_id);
CREATE INDEX IF NOT EXISTS idx_property_analytics_created ON property_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_analytics_action ON property_analytics (action_type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_neighborhoods_updated_at 
    BEFORE UPDATE ON neighborhoods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neighborhood_demographics_updated_at 
    BEFORE UPDATE ON neighborhood_demographics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at 
    BEFORE UPDATE ON schools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amenities_updated_at 
    BEFORE UPDATE ON amenities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_transport_updated_at 
    BEFORE UPDATE ON public_transport 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate neighborhood scores
CREATE OR REPLACE FUNCTION calculate_neighborhood_scores(neighborhood_uuid UUID)
RETURNS VOID AS $$
DECLARE
    walk_score_val DECIMAL;
    transit_score_val DECIMAL;
    school_score_val DECIMAL;
    safety_score_val DECIMAL;
    amenities_score_val DECIMAL;
    overall_score_val DECIMAL;
BEGIN
    -- Calculate walk score based on nearby amenities
    SELECT COALESCE(
        LEAST(100, (
            SELECT COUNT(*) * 10 
            FROM amenities a 
            WHERE ST_DWithin(
                a.location::geography,
                (SELECT center_point FROM neighborhoods WHERE id = neighborhood_uuid)::geography,
                500
            )
            AND a.type IN ('grocery', 'restaurant', 'pharmacy', 'bank')
        ) + 
        CASE WHEN EXISTS (
            SELECT 1 FROM public_transport pt 
            WHERE ST_DWithin(
                pt.location::geography,
                (SELECT center_point FROM neighborhoods WHERE id = neighborhood_uuid)::geography,
                400
            )
        ) THEN 20 ELSE 0 END
        ), 0
    ) INTO walk_score_val;

    -- Calculate transit score
    SELECT COALESCE(
        LEAST(100, (
            SELECT (COUNT(CASE WHEN type = 'bus_stop' THEN 1 END) * 20 + 
                   COUNT(CASE WHEN type = 'train_station' THEN 1 END) * 40)
            FROM public_transport 
            WHERE ST_DWithin(
                location::geography,
                (SELECT center_point FROM neighborhoods WHERE id = neighborhood_uuid)::geography,
                800
            )
        )), 0
    ) INTO transit_score_val;

    -- Calculate school score
    SELECT COALESCE(
        (SELECT AVG(rating) * 20 
         FROM schools 
         WHERE ST_DWithin(
             location::geography,
             (SELECT center_point FROM neighborhoods WHERE id = neighborhood_uuid)::geography,
             2000
         )), 0
    ) INTO school_score_val;

    -- Calculate safety score from crime statistics
    SELECT COALESCE(
        GREATEST(0, 100 - (AVG(total_incidents) * 2)),
        75
    ) INTO safety_score_val
    FROM neighborhood_crime_stats 
    WHERE neighborhood_id = neighborhood_uuid 
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND month >= EXTRACT(MONTH FROM CURRENT_DATE) - 2;

    -- Calculate amenities score
    SELECT COALESCE(
        LEAST(100, (
            SELECT AVG(rating) * 20 * LEAST(1, COUNT(*) / 20.0)
            FROM amenities 
            WHERE ST_DWithin(
                location::geography,
                (SELECT center_point FROM neighborhoods WHERE id = neighborhood_uuid)::geography,
                1000
            )
        )), 0
    ) INTO amenities_score_val;

    -- Calculate overall score
    overall_score_val := (walk_score_val + transit_score_val + school_score_val + safety_score_val + amenities_score_val) / 5;

    -- Insert or update scores
    INSERT INTO neighborhood_scores (
        neighborhood_id, walk_score, transit_score, school_score, 
        safety_score, amenities_score, overall_score, calculated_at
    ) VALUES (
        neighborhood_uuid, walk_score_val, transit_score_val, school_score_val,
        safety_score_val, amenities_score_val, overall_score_val, CURRENT_TIMESTAMP
    )
    ON CONFLICT (neighborhood_id) DO UPDATE SET
        walk_score = EXCLUDED.walk_score,
        transit_score = EXCLUDED.transit_score,
        school_score = EXCLUDED.school_score,
        safety_score = EXCLUDED.safety_score,
        amenities_score = EXCLUDED.amenities_score,
        overall_score = EXCLUDED.overall_score,
        calculated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Insert sample neighborhood data
INSERT INTO neighborhoods (name, city, state, description, center_point, boundary, population, area_sq_km) VALUES
('Downtown', 'San Francisco', 'CA', 'Vibrant urban center with excellent transit and walkability', 
 ST_GeomFromText('POINT(-122.4194 37.7749)', 4326),
 ST_GeomFromText('POLYGON((-122.4300 37.7850, -122.4100 37.7850, -122.4100 37.7650, -122.4300 37.7650, -122.4300 37.7850))', 4326),
 25000, 5.2),
('Mission District', 'San Francisco', 'CA', 'Culturally diverse neighborhood with great food scene',
 ST_GeomFromText('POINT(-122.4194 37.7649)', 4326),
 ST_GeomFromText('POLYGON((-122.4300 37.7750, -122.4100 37.7750, -122.4100 37.7550, -122.4300 37.7550, -122.4300 37.7750))', 4326),
 45000, 3.8),
('Pacific Heights', 'San Francisco', 'CA', 'Upscale residential area with stunning views',
 ST_GeomFromText('POINT(-122.4344 37.7929)', 4326),
 ST_GeomFromText('POLYGON((-122.4450 37.8030, -122.4250 37.8030, -122.4250 37.7830, -122.4450 37.7830, -122.4450 37.8030))', 4326),
 22000, 2.1)
ON CONFLICT DO NOTHING;

-- Insert sample demographic data
INSERT INTO neighborhood_demographics (neighborhood_id, population_density, median_household_income, median_home_value, renter_percentage, bachelor_degree_or_higher) VALUES
((SELECT id FROM neighborhoods WHERE name = 'Downtown'), 4807, 125000, 950000, 65, 78),
((SELECT id FROM neighborhoods WHERE name = 'Mission District'), 11842, 95000, 1200000, 72, 65),
((SELECT id FROM neighborhoods WHERE name = 'Pacific Heights'), 10476, 180000, 2200000, 35, 85)
ON CONFLICT DO NOTHING;

-- Insert sample schools
INSERT INTO schools (name, type, location, address, rating, grades_served, student_count, district) VALUES
('Lincoln High School', 'high', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), '1234 Market St, San Francisco, CA 94102', 4.2, '9-12', 1200, 'SFUSD'),
('Mission Elementary', 'elementary', ST_GeomFromText('POINT(-122.4194 37.7649)', 4326), '567 Valencia St, San Francisco, CA 94110', 3.8, 'K-5', 450, 'SFUSD'),
('Pacific Academy', 'private', ST_GeomFromText('POINT(-122.4344 37.7929)', 4326), '2100 Broadway, San Francisco, CA 94115', 4.7, 'K-8', 600, 'Private')
ON CONFLICT DO NOTHING;

-- Insert sample amenities
INSERT INTO amenities (name, type, location, address, rating, price_level) VALUES
('Whole Foods Market', 'grocery', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), '399 Market St, San Francisco, CA 94103', 4.1, 3),
('Golden Gate Park', 'park', ST_GeomFromText('POINT(-122.4344 37.7929)', 4326), '501 Stanyan St, San Francisco, CA 94117', 4.8, 1),
('SF General Hospital', 'hospital', ST_GeomFromText('POINT(-122.4194 37.7649)', 4326), '1001 Potrero Ave, San Francisco, CA 94110', 3.9, 2),
('Mission Market', 'grocery', ST_GeomFromText('POINT(-122.4194 37.7649)', 4326), '2350 Market St, San Francisco, CA 94114', 3.5, 2),
('Dolores Park', 'park', ST_GeomFromText('POINT(-122.4194 37.7649)', 4326), '19th St & Dolores St, San Francisco, CA 94114', 4.6, 1)
ON CONFLICT DO NOTHING;

-- Insert sample public transportation
INSERT INTO public_transport (name, type, location, address, lines_served) VALUES
('Montgomery St Station', 'subway_station', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), '1 Montgomery St, San Francisco, CA 94104', ARRAY['J', 'K', 'L', 'M', 'N', 'T']),
('16th St Mission BART', 'train_station', ST_GeomFromText('POINT(-122.4194 37.7649)', 4326), '2000 Mission St, San Francisco, CA 94110', ARRAY['Red', 'Blue', 'Green', 'Yellow']),
('Civic Center Station', 'subway_station', ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 'Grove St & Market St, San Francisco, CA 94102', ARRAY['J', 'K', 'L', 'M', 'N', 'T', 'S'])
ON CONFLICT DO NOTHING;

-- Insert sample crime statistics
INSERT INTO neighborhood_crime_stats (neighborhood_id, year, month, total_incidents, property_crime, violent_crime, safety_score) VALUES
((SELECT id FROM neighborhoods WHERE name = 'Downtown'), 2024, 10, 45, 32, 13, 75.5),
((SELECT id FROM neighborhoods WHERE name = 'Downtown'), 2024, 11, 42, 30, 12, 77.0),
((SELECT id FROM neighborhoods WHERE name = 'Mission District'), 2024, 10, 38, 28, 10, 78.5),
((SELECT id FROM neighborhoods WHERE name = 'Mission District'), 2024, 11, 35, 25, 10, 80.0),
((SELECT id FROM neighborhoods WHERE name = 'Pacific Heights'), 2024, 10, 15, 12, 3, 92.5),
((SELECT id FROM neighborhoods WHERE name = 'Pacific Heights'), 2024, 11, 12, 10, 2, 94.0)
ON CONFLICT (neighborhood_id, year, month) DO NOTHING;

-- Calculate initial scores for all neighborhoods
DO $$
DECLARE
    neighborhood_record RECORD;
BEGIN
    FOR neighborhood_record IN SELECT id FROM neighborhoods LOOP
        PERFORM calculate_neighborhood_scores(neighborhood_record.id);
    END LOOP;
END $$;
