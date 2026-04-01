const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class OrdinanceService {
  /**
   * Get all ordinance schedule values with optional filtering
   */
  async getAll({ page = 1, limit = 100, buildingTypeCode, structureClass, subClass }) {
    try {
      // Build where clause
      const where = {};
      
      if (buildingTypeCode) {
        where.buildingType = {
          code: buildingTypeCode
        };
      }
      if (structureClass) {
        where.structureClass = structureClass;
      }
      if (subClass) {
        where.subClass = subClass;
      }

      // Pagination
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        supabasePrisma.buildingMarketValue.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: [
            { buildingType: { code: 'asc' } },
            { structureClass: 'desc' }
          ],
          include: {
            buildingType: true
          }
        }),
        supabasePrisma.buildingMarketValue.count({ where })
      ]);

      return {
        success: true,
        data: data.map(item => ({
          id: item.id,
          ordinanceNo: item.ordinanceNo,
          effectivityDate: item.effectivityDate,
          structureClass: item.structureClass,
          subClass: item.subClass,
          unitValue: parseFloat(item.unitValue), // Prisma Decimal to float
          buildingType: {
            code: item.buildingType.code,
            name: item.buildingType.name
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error in OrdinanceService.getAll:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Get lookup value
   */
  async getUnitValue(buildingTypeCode, structureClass, subClass) {
    try {
      const data = await supabasePrisma.buildingMarketValue.findFirst({
        where: {
          buildingType: {
            code: buildingTypeCode
          },
          structureClass: structureClass,
          subClass: subClass
        },
        include: {
          buildingType: true
        }
      });

      if (!data) return null;

      return {
        unit_value: parseFloat(data.unitValue)
      };
    } catch (error) {
      logger.error('Error in OrdinanceService.getUnitValue:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new OrdinanceService();