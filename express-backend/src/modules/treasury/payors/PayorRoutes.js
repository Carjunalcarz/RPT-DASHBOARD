const { Router } = require('express');
const protect = require('../../../middleware/auth');

function createPayorRoutes({ payorController }) {
  const router = Router();

router.use(protect);
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

router.get('/search', (req, res, next) => payorController.search(req, res, next));
router.post('/', (req, res, next) => payorController.create(req, res, next));
router.post('/bulk', (req, res, next) => payorController.bulkCreate(req, res, next));

  return router;
}

module.exports = createPayorRoutes;
