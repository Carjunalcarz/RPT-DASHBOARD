/**
 * Interface for Database Adapters
 */
class DatabaseAdapter {
  async connect() {
    throw new Error('Not implemented');
  }

  async disconnect() {
    throw new Error('Not implemented');
  }

  getClient() {
    throw new Error('Not implemented');
  }
}

module.exports = DatabaseAdapter;
