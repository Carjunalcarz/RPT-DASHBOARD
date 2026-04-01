const DB_SCHEMA = process.env.DB_SCHEMA || 'rptas';

// Validate the schema name to prevent SQL injection vulnerabilities
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_SCHEMA)) {
  throw new Error(`Invalid DB_SCHEMA name: ${DB_SCHEMA}. Must be a valid PostgreSQL schema name.`);
}

module.exports = {
  DB_SCHEMA
};
