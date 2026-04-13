const service = require('../services/actualUseCustomSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class ActualUseCustomController {
  async list(req, res, next) {
    try {
      const search = req.query?.search ? String(req.query.search).trim() : '';
      const mainClass = req.query?.mainClass ? String(req.query.mainClass).trim() : '';
      const data = await service.list({ search, mainClass });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(new AppError('Failed to fetch custom actual uses: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { mainClassCode, code, description } = req.body || {};
      const main = String(mainClassCode || '').trim();
      const c = String(code || '').trim().toUpperCase();
      const d = String(description || '').trim();

      if (!main) return next(new AppError('Main Class Code is required', 400));
      if (!c) return next(new AppError('Code is required', 400));
      if (!d) return next(new AppError('Description is required', 400));

      const saved = await service.upsert(main, c, d);
      res.status(200).json({ status: 'success', data: saved });
    } catch (error) {
      next(new AppError('Failed to save custom actual use: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const uuid = String(id || '').trim();
      if (!uuid) return next(new AppError('id is required', 400));

      await service.deleteById(uuid);
      res.status(200).json({ status: 'success', message: 'Actual Use deleted successfully' });
    } catch (error) {
      next(new AppError('Failed to delete custom actual use: ' + error.message, 500));
    }
  }
}

module.exports = new ActualUseCustomController();
