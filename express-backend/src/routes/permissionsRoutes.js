const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissionsController');
const protect = require('../middleware/auth');
const restrictTo = protect.restrictTo;

router.get('/me', protect, permissionsController.getMyPermissions);
router.get('/users/:id', protect, restrictTo('admin', 'administrator'), permissionsController.getUserPermissions);
router.get('/users/:id/sidebar-visibility', protect, restrictTo('admin', 'administrator'), permissionsController.getUserSidebarVisibility);
router.put('/users/:id/sidebar-visibility', protect, restrictTo('admin', 'administrator'), permissionsController.setUserSidebarVisibility);

module.exports = router;

