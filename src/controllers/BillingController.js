const BillingService = require('../services/BillingService');
const { success, created } = require('../utils/apiResponse');

class BillingController {
  async getAll(req, res) {
    const data = await BillingService.getInvoices(req.params.patientId, req.clinicId, req.query);
    return success(res, data);
  }

  async getClinicInvoices(req, res) {
    const data = await BillingService.getClinicInvoices(req.clinicId, req.query);
    return success(res, data);
  }

  async create(req, res) {
    const data = await BillingService.createInvoice(
      req.params.patientId, req.clinicId, req.user.id, req.body
    );
    return created(res, data, 'Invoice created successfully');
  }

  async update(req, res) {
    const data = await BillingService.updateInvoice(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Invoice updated successfully');
  }

  async recordPayment(req, res) {
    const data = await BillingService.recordPayment(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Payment recorded successfully');
  }

  async delete(req, res) {
    await BillingService.deleteInvoice(req.params.id, req.clinicId);
    return success(res, null, 'Invoice deleted successfully');
  }
}

module.exports = new BillingController();
