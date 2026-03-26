const { createContainer, InjectionMode, asValue, asClass } = require('awilix');
const logger = require('../../utils/logger');
const ConfigManager = require('../config/ConfigManager');
const PrismaDatabaseAdapter = require('../adapters/PrismaDatabaseAdapter');
const { supabasePrisma, mssqlPrisma } = require('../../database/prisma');
const { supabase } = require('../../database/supabase');

// Legacy services
const rptMastService = require('../../services/rptMastService');
const rptAssService = require('../../services/rptAssService');

// Create the DI container
const container = createContainer({
  injectionMode: InjectionMode.PROXY
});

// Register core dependencies
container.register({
  logger: asValue(logger),
  configManager: asClass(ConfigManager).singleton(),
  dbAdapter: asClass(PrismaDatabaseAdapter).singleton(),
  
  // Legacy or Direct Clients
  supabasePrisma: asValue(supabasePrisma),
  mssqlPrisma: asValue(mssqlPrisma),
  supabaseClient: asValue(supabase),

  // Legacy Services (To be refactored later)
  rptMastService: asValue(rptMastService),
  rptAssService: asValue(rptAssService)
});

module.exports = container;
