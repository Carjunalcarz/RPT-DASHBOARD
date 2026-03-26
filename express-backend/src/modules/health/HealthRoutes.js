const { Router } = require('express');

function createHealthRoutes({ healthController }) {
  const router = Router();
  router.get('/', healthController.getHealth);
  return router;
}

module.exports = createHealthRoutes;
