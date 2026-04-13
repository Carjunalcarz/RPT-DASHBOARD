const service = require('../services/mainClassCustomSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class MainClassCustomController {
  async list(req, res, next) {
    try {
      const search = req.query?.search ? String(req.query.search).trim() : '';
      const data = await service.list({ search });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(new AppError('Failed to fetch custom main classes: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { code, description } = req.body || {};
      const c = String(code || '').trim().toUpperCase();
      const d = String(description || '').trim();

      if (!c) return next(new AppError('Code is required', 400));
      if (!d) return next(new AppError('Description is required', 400));

      const saved = await service.upsert(c, d);
      res.status(200).json({ status: 'success', data: saved });
    } catch (error) {
      next(new AppError('Failed to save custom main class: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { code } = req.params;
      const c = String(code || '').trim().toUpperCase();
      if (!c) return next(new AppError('Code is required', 400));
      await service.deleteByCode(c);
      res.status(200).json({ status: 'success', message: 'Main Class deleted successfully' });
    } catch (error) {
      next(new AppError('Failed to delete custom main class: ' + error.message, 500));
    }
  }
}

module.exports = new MainClassCustomController();
