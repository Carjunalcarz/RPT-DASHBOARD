const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../../core/contracts/ModuleContract');
const AssessmentController = require('./AssessmentController');
const AssessmentService = require('./AssessmentService');
const createAssessmentRoutes = require('./AssessmentRoutes');

class AssessmentModule extends ModuleContract {
  get name() {
    return 'AssessmentModule';
  }

  register() {
    this.container.register({
      assessmentController: asClass(AssessmentController).singleton(),
      assessmentService: asClass(AssessmentService).singleton(),
      assessmentRoutes: asFunction(createAssessmentRoutes).singleton(),
    });
  }

  init(app) {
    const assessmentRoutes = this.container.resolve('assessmentRoutes');
    app.use('/api/v2/assessment', assessmentRoutes);
  }
}

module.exports = AssessmentModule;
