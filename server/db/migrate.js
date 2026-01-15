const fs = require('fs');
const path = require('path');
const { query } = require('./index');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const executedMigrations = await query('SELECT name FROM migrations');
    const executedNames = executedMigrations.rows.map(row => row.name);

    // Run pending migrations
    for (const file of files) {
      if (!executedNames.includes(file)) {
        console.log(`Running migration: ${file}`);

        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await query(sql);

        // Record migration as executed
        await query('INSERT INTO migrations (name) VALUES ($1)', [file]);

        console.log(`✅ Migration ${file} completed`);
      } else {
        console.log(`⏭️  Migration ${file} already executed`);
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };