const PlatformAdminService = require('../services/PlatformAdminService');
const { success } = require('../utils/apiResponse');

class PlatformAdminController {
  async dashboard(req, res) {
    const data = await PlatformAdminService.getDashboard();
    return success(res, data);
  }

  async listOrgs(req, res) {
    const data = await PlatformAdminService.getOrganizations(req.query);
    return success(res, data);
  }

  async getOrg(req, res) {
    const data = await PlatformAdminService.getOrganization(req.params.id);
    return success(res, data);
  }

  async updatePlan(req, res) {
    const data = await PlatformAdminService.updatePlan(req.params.id, req.body.plan);
    return success(res, data, 'Plan updated successfully');
  }

  async updateStatus(req, res) {
    const data = await PlatformAdminService.updateStatus(req.params.id, req.body.status);
    return success(res, data, 'Status updated successfully');
  }
}

module.exports = new PlatformAdminController();
