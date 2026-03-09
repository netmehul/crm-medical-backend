const OrgService = require('../services/OrgService');
const { success, created } = require('../utils/apiResponse');

class OrgController {
  async getBranches(req, res) {
    const data = await OrgService.getBranches(req.orgId);
    return success(res, data);
  }

  async getBranch(req, res) {
    const data = await OrgService.getBranch(req.orgId, req.params.id);
    return success(res, data);
  }

  async createBranch(req, res) {
    const data = await OrgService.createBranch(req.orgId, req.body);
    return created(res, data, 'Branch created successfully');
  }

  async updateBranch(req, res) {
    const data = await OrgService.updateBranch(req.orgId, req.params.id, req.body);
    return success(res, data, 'Branch updated successfully');
  }

  async getTeam(req, res) {
    const data = await OrgService.getTeam(req.orgId);
    return success(res, data);
  }

  async getTeamMember(req, res) {
    const data = await OrgService.getTeamMember(req.orgId, req.params.userId);
    return success(res, data);
  }

  async inviteUser(req, res) {
    const data = await OrgService.inviteUser(req.orgId, req.body);
    return created(res, data, 'User invited successfully');
  }

  async updateUser(req, res) {
    const data = await OrgService.updateUser(req.orgId, req.params.userId, req.body);
    return success(res, data, 'User updated successfully');
  }

  async deactivateUser(req, res) {
    const data = await OrgService.deactivateUser(req.orgId, req.params.userId);
    return success(res, data, 'User deactivated');
  }

  async getBilling(req, res) {
    const data = await OrgService.getBillingInfo(req.orgId);
    return success(res, data);
  }
}

module.exports = new OrgController();
