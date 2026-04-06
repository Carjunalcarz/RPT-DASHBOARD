const rptMastService = require('../services/rptMastService');
const { AppError } = require('../../../middleware/errorHandler');

/**
 * Controller for RPTMAST operations
 */
class RptMastController {
  /**
   * Get eligible migration records from RPTAS_AGUSAN
   * GET /api/rptmast/RPTAS_AGUSAN
   */
  async getAgusanMigrationData(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const searchField = req.query.searchField;
      const filterValue = req.query.filterValue;
      const municipalityCode = req.query.municipalityCode;
      const user = req.user;
      
      const result = await rptMastService.getAgusanMigrationData({ 
        page, 
        limit, 
        searchField, 
        filterValue,
        municipalityCode,
        user
      });
      
      res.status(200).json({
        success: true,
        count: result.data.length,
        pagination: result.pagination,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get distinct Tax Beginning Years
   * GET /api/rptmast/distinct/tax-beg-years
   */
  async getDistinctTaxBegYears(req, res, next) {
    try {
      const result = await rptMastService.getDistinctTaxBegYears();
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Signatory data
   * PUT /api/rptmast/signatories/:tdn
   */
  async updateSignatory(req, res, next) {
    try {
      const { tdn } = req.params;
      const data = req.body;
      
      const result = await rptMastService.updateSignatory(tdn, data);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get MASTEXTN data by TDN
   * GET /api/rptmast/mastextn/:tdn
   */
  async getMastExtn(req, res, next) {
    try {
      const { tdn } = req.params;
      const data = await rptMastService.getMastExtn(tdn);
      
      if (!data) {
        return res.status(404).json({ success: false, message: 'No extension data found' });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RptMastController();
