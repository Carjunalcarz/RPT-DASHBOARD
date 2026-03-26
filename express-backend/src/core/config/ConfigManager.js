class ConfigManager {
  constructor() {
    this.config = {
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      dbType: process.env.DB_TYPE || 'prisma', // e.g., 'prisma', 'supabase', 'mssql'
    };
  }

  get(key) {
    return this.config[key];
  }
}

module.exports = ConfigManager;
