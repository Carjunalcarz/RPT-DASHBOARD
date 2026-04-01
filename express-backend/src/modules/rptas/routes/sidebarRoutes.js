const express = require('express');
const router = express.Router();
const sidebarController = require('../controllers/sidebarController');
const protect = require('../../../middleware/auth');
const restrictTo = protect.restrictTo;

// Publicly available (but protected by auth)
router.get('/', protect, sidebarController.getAllSidebarItems);

// Management routes (restricted to admin)
router.get('/manage', protect, restrictTo('admin', 'administrator'), sidebarController.getManagementSidebarItems);
router.post('/', protect, restrictTo('admin', 'administrator'), sidebarController.createSidebarItem);
router.patch('/:id', protect, restrictTo('admin', 'administrator'), sidebarController.updateSidebarItem);
router.delete('/:id', protect, restrictTo('admin', 'administrator'), sidebarController.deleteSidebarItem);
router.post('/seed', protect, restrictTo('admin', 'administrator'), sidebarController.seedSidebarItems);

module.exports = router;
