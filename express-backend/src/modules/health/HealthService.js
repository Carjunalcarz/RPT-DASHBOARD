class HealthService {
  constructor({ dbAdapter }) {
    this.dbAdapter = dbAdapter;
  }

  async checkHealth() {
    let dbStatus = 'disconnected';
    try {
      // simple check
      const client = this.dbAdapter.getClient();
      await client.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}

module.exports = HealthService;
