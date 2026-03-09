const MockPaymentService = require('../services/MockPaymentService');
const { success } = require('../utils/apiResponse');

class PaymentController {
  async upgrade(req, res) {
    const planSlug = req.body?.plan || 'pro';
    const data = await MockPaymentService.upgradeToPro(req.orgId, req.userId, planSlug);
    const planName = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
    return success(res, data, `Welcome to ${planName}! Your plan has been upgraded.`);
  }

  async getHistory(req, res) {
    const data = await MockPaymentService.getPaymentHistory(req.orgId);
    return success(res, data);
  }
}

module.exports = new PaymentController();
