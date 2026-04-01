const buildingService = require('../services/buildingService');

const getAllBuildingTypes = async (req, res, next) => {
  try {
    const result = await buildingService.getAllBuildingTypes();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getMarketValues = async (req, res, next) => {
  try {
    const { buildingTypeId, buildingTypeCode, ordinanceNo, page, limit } = req.query;
    const result = await buildingService.getMarketValues({
      buildingTypeId,
      buildingTypeCode,
      ordinanceNo,
      page,
      limit
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBuildingTypes,
  getMarketValues
};
