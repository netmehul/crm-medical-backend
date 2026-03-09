const AuthService = require('../services/AuthService');
const { success, created } = require('../utils/apiResponse');

class AuthController {
  async signup(req, res) {
    const { org_name, clinic_name, email, full_name, password, phone, address } = req.body;
    const data = await AuthService.signup(
      org_name || clinic_name, clinic_name || org_name,
      email, full_name, password, phone, address
    );
    return created(res, data, 'Organization registered successfully');
  }

  async login(req, res) {
    const { email, password } = req.body;
    const data = await AuthService.login(email, password);
    return success(res, data, 'Login successful');
  }

  async branchSelect(req, res) {
    const { clinicId } = req.body;
    const userId = req.userId || req.user?.id;
    const data = await AuthService.branchSelect(userId, clinicId);
    return success(res, data, 'Branch selected');
  }

  async getMe(req, res) {
    if (req.clinicId) {
      const data = await AuthService.getMeWithContext(req.userId, req.clinicId, req.role);
      return success(res, data);
    }
    const data = await AuthService.getMe(req.userId);
    return success(res, data);
  }

  async invite(req, res) {
    const data = await AuthService.inviteUser(
      req.orgId, req.clinicId, req.role, req.body
    );
    return created(res, data, 'User invited successfully');
  }
}

module.exports = new AuthController();
