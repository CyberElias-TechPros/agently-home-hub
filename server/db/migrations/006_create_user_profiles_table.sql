-- Create user_profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    
    -- Address information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Professional information
    occupation VARCHAR(100),
    employer VARCHAR(100),
    annual_income DECIMAL(12,2),
    
    -- Preferences and settings
    bio TEXT,
    preferences JSONB, -- Store user preferences as JSON
    notification_settings JSONB, -- Email/SMS/push notification preferences
    
    -- Verification status
    phone_verified BOOLEAN DEFAULT FALSE,
    identity_verified BOOLEAN DEFAULT FALSE,
    background_check_completed BOOLEAN DEFAULT FALSE,
    background_check_date DATE,
    
    -- Profile completion
    profile_completion_percentage INTEGER DEFAULT 0,
    
    -- Social links
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_verified ON user_profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_identity_verified ON user_profiles(identity_verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completion ON user_profiles(profile_completion_percentage);
