-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    data JSONB,
    
    -- Delivery status
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- Delivery details
    email_address VARCHAR(255),
    phone_number VARCHAR(20),
    
    -- Error tracking
    email_error TEXT,
    sms_error TEXT,
    push_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_id ON notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_email_sent ON notification_logs(email_sent);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sms_sent ON notification_logs(sms_sent);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_notification_logs_updated_at
    BEFORE UPDATE ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_logs_updated_at();
