const express = require('express');
const protect = require('../../../middleware/auth');
const controller = require('../controllers/payorController');

const router = express.Router();

router.use(protect);
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

router.get('/search', controller.search);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/bulk', controller.bulkCreate);
router.post('/id-image', controller.uploadIdImage);
router.get('/id-image/signed-url', controller.getIdImageSignedUrl);

module.exports = router;
