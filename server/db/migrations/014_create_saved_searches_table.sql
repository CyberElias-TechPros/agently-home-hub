-- Create saved searches table for advanced search functionality
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL,
    notifications BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create search history table for tracking user search behavior
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT,
    filters JSONB,
    results_count INTEGER,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create search suggestions table for autocomplete
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('city', 'neighborhood', 'amenity', 'property_type')),
    suggestion_text VARCHAR(255) NOT NULL,
    popularity_score INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notifications ON saved_searches(notifications) WHERE notifications = TRUE;

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_session_id ON search_history(session_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_query ON search_history USING gin(to_tsvector('english', search_query));

CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_popularity ON search_suggestions(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions USING gin(to_tsvector('english', suggestion_text));

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search suggestions based on user searches
CREATE OR REPLACE FUNCTION update_search_suggestions()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract cities from search and update suggestions
    IF NEW.filters->>'city' IS NOT NULL THEN
        INSERT INTO search_suggestions (suggestion_type, suggestion_text, popularity_score)
        VALUES ('city', NEW.filters->>'city', 1)
        ON CONFLICT (suggestion_type, suggestion_text) 
        DO UPDATE SET 
            popularity_score = search_suggestions.popularity_score + 1,
            last_used = CURRENT_TIMESTAMP;
    END IF;

    -- Extract neighborhoods from search and update suggestions
    IF NEW.filters->>'neighborhood' IS NOT NULL THEN
        INSERT INTO search_suggestions (suggestion_type, suggestion_text, popularity_score)
        VALUES ('neighborhood', NEW.filters->>'neighborhood', 1)
        ON CONFLICT (suggestion_type, suggestion_text) 
        DO UPDATE SET 
            popularity_score = search_suggestions.popularity_score + 1,
            last_used = CURRENT_TIMESTAMP;
    END IF;

    -- Extract amenities from search and update suggestions
    IF NEW.filters->>'amenities' IS NOT NULL THEN
        INSERT INTO search_suggestions (suggestion_type, suggestion_text, popularity_score)
        SELECT 'amenity', amenity, 1
        FROM unnest(string_to_array(NEW.filters->>'amenities', ',')) as amenity
        ON CONFLICT (suggestion_type, suggestion_text) 
        DO UPDATE SET 
            popularity_score = search_suggestions.popularity_score + 1,
            last_used = CURRENT_TIMESTAMP;
    END IF;

    -- Extract property types from search and update suggestions
    IF NEW.filters->>'type' IS NOT NULL AND NEW.filters->>'type' != 'all' THEN
        INSERT INTO search_suggestions (suggestion_type, suggestion_text, popularity_score)
        VALUES ('property_type', NEW.filters->>'type', 1)
        ON CONFLICT (suggestion_type, suggestion_text) 
        DO UPDATE SET 
            popularity_score = search_suggestions.popularity_score + 1,
            last_used = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_suggestions_trigger AFTER INSERT ON search_history
    FOR EACH ROW EXECUTE FUNCTION update_search_suggestions();

-- Function to log search results
CREATE OR REPLACE FUNCTION log_search_results()
RETURNS TRIGGER AS $$
BEGIN
    -- Update run count for saved searches
    IF TG_TABLE_NAME = 'saved_searches' THEN
        UPDATE saved_searches 
        SET 
            run_count = run_count + 1,
            last_run_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END IF;

    -- Log to search history
    INSERT INTO search_history (user_id, search_query, filters, results_count, session_id, ip_address, user_agent)
    VALUES (
        NEW.user_id,
        COALESCE(NEW.filters->>'query', ''),
        NEW.filters,
        COALESCE(NEW.results_count, 0),
        COALESCE(NEW.session_id, session_id),
        COALESCE(NEW.ip_address, client_addr()),
        COALESCE(NEW.user_agent, current_setting('request.headers')::json->>'user-agent')
    );

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Insert sample search suggestions
INSERT INTO search_suggestions (suggestion_type, suggestion_text, popularity_score) VALUES
('city', 'San Francisco', 150),
('city', 'New York', 142),
('city', 'Los Angeles', 98),
('city', 'Chicago', 87),
('city', 'Boston', 76),
('neighborhood', 'Mission District', 45),
('neighborhood', 'SoHo', 38),
('neighborhood', 'Williamsburg', 32),
('neighborhood', 'Beverly Hills', 28),
('neighborhood', 'Greenwich Village', 25),
('amenity', 'Parking', 180),
('amenity', 'Gym', 156),
('amenity', 'Pool', 134),
('amenity', 'Pet-friendly', 98),
('amenity', 'Laundry', 87),
('amenity', 'Doorman', 76),
('amenity', 'Elevator', 65),
('amenity', 'Balcony', 54),
('amenity', 'Storage', 43),
('amenity', 'Air Conditioning', 32),
('property_type', 'apartment', 245),
('property_type', 'house', 189),
('property_type', 'condo', 156),
('property_type', 'townhouse', 98),
('property_type', 'studio', 67)
ON CONFLICT (suggestion_type, suggestion_text) DO NOTHING;
