const { AppError } = require('../../middleware/errorHandler');

class UserController {
  constructor({ userService }) {
    this.userService = userService;
  }

  getUsers = async (req, res, next) => {
    try {
      if (req.user.role !== 'admin') {
        return next(new AppError('Not authorized to view users', 403));
      }

      const mergedUsers = await this.userService.getAllUsers();

      res.status(200).json({
        status: 'success',
        results: mergedUsers.length,
        data: {
          users: mergedUsers
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req, res, next) => {
    try {
      const user = req.user;
      res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req, res, next) => {
    try {
      if (req.user.role !== 'admin') {
        return next(new AppError('Not authorized to update users', 403));
      }

      const { id } = req.params;
      const { role, municipalityCode, fullName, contactNo } = req.body;

      const updatedUser = await this.userService.updateUser(id, {
        role,
        municipalityCode,
        fullName,
        contactNo
      });

      res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = UserController;
