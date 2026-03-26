class HealthController {
  constructor({ healthService }) {
    this.healthService = healthService;
  }

  getHealth = async (req, res) => {
    const status = await this.healthService.checkHealth();
    res.status(200).json(status);
  };
}

module.exports = HealthController;
