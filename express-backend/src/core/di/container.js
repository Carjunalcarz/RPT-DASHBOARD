const { createContainer, InjectionMode, asValue, asClass } = require('awilix');
const logger = require('../../utils/logger');
const PrismaDatabaseAdapter = require('../adapters/PrismaDatabaseAdapter');
const { supabasePrisma, mssqlPrisma } = require('../../modules/rptas/database/prisma');
const { supabase } = require('../../modules/rptas/database/supabase');

// Legacy services
const rptMastService = require('../../modules/rptas/services/rptMastService');
const rptAssService = require('../../modules/rptas/services/rptAssService');

// Create the DI container
const container = createContainer({
  injectionMode: InjectionMode.PROXY
});

// Register core dependencies
container.register({
  logger: asValue(logger),
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
