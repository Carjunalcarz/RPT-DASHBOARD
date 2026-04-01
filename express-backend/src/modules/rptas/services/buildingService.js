const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class BuildingService {
  /**
   * Get all building types
   */
  async getAllBuildingTypes() {
    try {
      return await supabasePrisma.buildingType.findMany({
        orderBy: {
          code: 'asc'
        }
      });
    } catch (error) {
      logger.error('Error in BuildingService.getAllBuildingTypes:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Get building market values with filtering
   * @param {Object} params
   */
  async getMarketValues({ buildingTypeId, buildingTypeCode, ordinanceNo, page = 1, limit = 100 }) {
    try {
      const where = {};
      if (buildingTypeId) where.buildingTypeId = buildingTypeId;
      
      // Filter by building type code if provided
      if (buildingTypeCode) {
        where.buildingType = {
          code: buildingTypeCode
        };
      }

      if (ordinanceNo) where.ordinanceNo = ordinanceNo;

      const total = await supabasePrisma.buildingMarketValue.count({ where });
      
      const data = await supabasePrisma.buildingMarketValue.findMany({
        where,
        include: {
          buildingType: true
        },
        orderBy: [
          { buildingType: { code: 'asc' } },
          { structureClass: 'asc' },
          { subClass: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      return {
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in BuildingService.getMarketValues:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new BuildingService();
