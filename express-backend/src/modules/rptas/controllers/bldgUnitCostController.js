const bldgUnitCostService = require('../services/bldgUnitCostService');
const bldgUnitCostSetService = require('../services/bldgUnitCostSetService');
const { AppError } = require('../../../middleware/errorHandler');

class BldgUnitCostController {
  async getAll(req, res, next) {
    try {
      const { page, limit, strucType, bldgCode, city } = req.query;
      const effDate = req.query.effDate || req.query.eff_date;
      const result = await bldgUnitCostService.getAll({ 
        page, 
        limit, 
        strucType, 
        bldgCode,
        city,
        effDate
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUnitCost(req, res, next) {
    try {
      const { strucType, bldgCode, city } = req.query;
      if (!strucType || !bldgCode) {
        throw new AppError('strucType and bldgCode are required', 400);
      }
      const result = await bldgUnitCostService.getUnitCost(strucType, bldgCode, city);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Unit cost not found' });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDistinctEffDates(req, res, next) {
    try {
      const { strucType, bldgCode, city } = req.query;
      const result = await bldgUnitCostService.getDistinctEffDates({ strucType, bldgCode, city });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createUnitCostSet(req, res, next) {
    try {
      const { ordinanceNo, ordinanceDate, ordinanceText, items } = req.body || {};
      const createdBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.createSet({
        ordinanceNo,
        ordinanceDate,
        ordinanceText,
        items,
        createdBy,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUnitCostSet(req, res, next) {
    try {
      const { id } = req.params || {};
      const { ordinanceNo, ordinanceDate, ordinanceText } = req.body || {};
      const updatedBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.updateSet({
        id,
        ordinanceNo,
        ordinanceDate,
        ordinanceText,
        updatedBy,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listUnitCostSets(req, res, next) {
    try {
      const { page, limit, city, ordinanceNo, includeDeleted } = req.query || {};
      const result = await bldgUnitCostSetService.listSets({
        page,
        limit,
        city,
        ordinanceNo,
        includeDeleted: String(includeDeleted || '').toLowerCase() === 'true',
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUnitCostSet(req, res, next) {
    try {
      const { id } = req.params || {};
      const { includeDeleted } = req.query || {};
      const result = await bldgUnitCostSetService.getSetById({
        id,
        includeDeleted: String(includeDeleted || '').toLowerCase() === 'true',
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listUnitCostSetItems(req, res, next) {
    try {
      const { id } = req.params || {};
      const { page, limit, includeDeleted, search } = req.query || {};
      const result = await bldgUnitCostSetService.listSetItems({
        setId: id,
        page,
        limit,
        includeDeleted: String(includeDeleted || '').toLowerCase() === 'true',
        search,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createUnitCostSetItem(req, res, next) {
    try {
      const { id } = req.params || {};
      const createdBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.createSetItem({ setId: id, item: req.body || {}, createdBy });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUnitCostSetItem(req, res, next) {
    try {
      const { id, itemId } = req.params || {};
      const updatedBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.updateSetItem({ setId: id, itemId, item: req.body || {}, updatedBy });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteUnitCostSetItem(req, res, next) {
    try {
      const { id, itemId } = req.params || {};
      const { mode } = req.query || {};
      const deletedBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.deleteSetItem({ setId: id, itemId, mode, deletedBy });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteUnitCostSet(req, res, next) {
    try {
      const { id } = req.params || {};
      const { mode } = req.query || {};
      const deletedBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.deleteSet({ id, mode, deletedBy });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async restoreUnitCostSet(req, res, next) {
    try {
      const { id } = req.params || {};
      const restoredBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.restoreSet({ id, restoredBy });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async restoreUnitCostSetItem(req, res, next) {
    try {
      const { id, itemId } = req.params || {};
      const restoredBy = req.user?.id || req.user?.email || 'system';
      const result = await bldgUnitCostSetService.restoreSetItem({ setId: id, itemId, restoredBy });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BldgUnitCostController();
