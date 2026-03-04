const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class BuildingAppraisalService {
  /**
   * Get all building appraisals or filter by params
   * @param {Object} params
   */
  async getAppraisals({ classificationCode, buildingType, buildingSubClass }) {
    try {
      const where = {};
      if (classificationCode) where.classificationCode = classificationCode;
      if (buildingType) where.buildingType = buildingType;
      // Handle buildingSubClass explicitly, allowing filtering by null if needed or specific value
      if (buildingSubClass !== undefined) {
          where.buildingSubClass = buildingSubClass === 'null' ? null : buildingSubClass;
      }

      const appraisals = await supabasePrisma.buildingAppraisal.findMany({
        where,
        orderBy: [
            { classificationCode: 'asc' },
            { buildingType: 'asc' },
            { buildingSubClass: 'asc' }
        ]
      });

      return appraisals;
    } catch (error) {
      logger.error('Error in BuildingAppraisalService.getAppraisals:', error);
      throw new AppError(error.message, 500);
    }
  }

  async getAllClassifications() {
      try {
          const classifications = await supabasePrisma.buildingAppraisal.findMany({
              distinct: ['classificationCode', 'classification'],
              select: {
                  classificationCode: true,
                  classification: true
              },
              orderBy: {
                  classificationCode: 'asc'
              }
          });
          return classifications;
      } catch (error) {
        logger.error('Error in BuildingAppraisalService.getAllClassifications:', error);
        throw new AppError(error.message, 500);
      }
  }

  /**
   * Create a new building appraisal
   * @param {Object} data
   */
  async createAppraisal(data) {
    try {
      const appraisal = await supabasePrisma.buildingAppraisal.create({
        data: {
          classification: data.classification,
          classificationCode: data.classificationCode,
          buildingType: data.buildingType,
          buildingSubClass: data.buildingSubClass,
          rate: data.rate
        }
      });
      return appraisal;
    } catch (error) {
      logger.error('Error in BuildingAppraisalService.createAppraisal:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Update an existing building appraisal
   * @param {String} id
   * @param {Object} data
   */
  async updateAppraisal(id, data) {
    try {
      const appraisal = await supabasePrisma.buildingAppraisal.update({
        where: { id },
        data: {
          classification: data.classification,
          classificationCode: data.classificationCode,
          buildingType: data.buildingType,
          buildingSubClass: data.buildingSubClass,
          rate: data.rate,
          updatedAt: new Date()
        }
      });
      return appraisal;
    } catch (error) {
      logger.error('Error in BuildingAppraisalService.updateAppraisal:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Delete a building appraisal
   * @param {String} id
   */
  async deleteAppraisal(id) {
    try {
      await supabasePrisma.buildingAppraisal.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      logger.error('Error in BuildingAppraisalService.deleteAppraisal:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new BuildingAppraisalService();
