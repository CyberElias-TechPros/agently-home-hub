// Test setup file for Jest
const { Pool } = require('pg');

// Test database configuration
const testDb = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'agently_home_hub_test',
  min: 0,
  max: 1,
});

// Global test setup
beforeAll(async () => {
  // Run database migrations for test database
  try {
    await testDb.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'tenant',
        verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await testDb.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        bedrooms INTEGER,
        bathrooms INTEGER,
        area INTEGER,
        year_built INTEGER,
        amenities TEXT[],
        status VARCHAR(20) DEFAULT 'available',
        landlord_id INTEGER REFERENCES users(id),
        available_from DATE,
        rules TEXT,
        featured BOOLEAN DEFAULT false,
        price_change DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await testDb.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        tenant_id INTEGER REFERENCES users(id),
        landlord_id INTEGER REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Test database setup completed');
  } catch (error) {
    console.error('Test database setup failed:', error);
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up test database
  try {
    await testDb.query('DROP TABLE IF EXISTS bookings CASCADE');
    await testDb.query('DROP TABLE IF EXISTS properties CASCADE');
    await testDb.query('DROP TABLE IF EXISTS users CASCADE');
    await testDb.end();
    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Test database cleanup failed:', error);
  }
});

// Global test hooks
beforeEach(async () => {
  // Clean up test data before each test
  await testDb.query('DELETE FROM bookings');
  await testDb.query('DELETE FROM properties');
  await testDb.query('DELETE FROM users');
});

afterEach(async () => {
  // Clean up test data after each test
  await testDb.query('DELETE FROM bookings');
  await testDb.query('DELETE FROM properties');
  await testDb.query('DELETE FROM users');
});

// Export test database for use in tests
module.exports = { testDb };
