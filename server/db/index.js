const { pool } = require('./config');

/**
 * Execute a query with optional parameters
 * @param {string} text - The SQL query text
 * @param {Array} params - The query parameters
 * @returns {Promise} - Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Client>} - Database client
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} - Connection status
 */
const testConnection = async () => {
  try {
    const res = await query('SELECT NOW()');
    console.log('Database connection successful:', res.rows[0]);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
};

/**
 * Close the database pool
 */
const closePool = async () => {
  await pool.end();
  console.log('Database pool has ended');
};

module.exports = {
  query,
  getClient,
  testConnection,
  closePool
};