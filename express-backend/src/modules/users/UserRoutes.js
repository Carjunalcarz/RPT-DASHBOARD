const { Router } = require('express');
const protect = require('../../middleware/auth');

function createUserRoutes({ userController }) {
  const router = Router();
  
  // Protect all user routes
  router.use(protect);

  router.get('/', userController.getUsers);
  router.get('/me', userController.getMe);
  router.put('/:id', userController.updateUser);

  return router;
}

module.exports = createUserRoutes;
