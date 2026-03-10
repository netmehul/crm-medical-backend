const SupplierService = require('../services/SupplierService');
const { success, created, notFound } = require('../utils/apiResponse');

class SupplierController {
  async list(req, res) {
    const suppliers = await SupplierService.getAllSuppliers(req.clinicId);
    return success(res, suppliers);
  }

  async create(req, res) {
    const supplier = await SupplierService.createSupplier({
      ...req.body,
      clinic_id: req.clinicId
    });
    return created(res, supplier, 'Supplier added successfully');
  }

  async detail(req, res) {
    const supplier = await SupplierService.getSupplierById(req.params.id, req.clinicId);
    if (!supplier) return notFound(res, 'Supplier not found');
    return success(res, supplier);
  }

  async update(req, res) {
    const supplier = await SupplierService.updateSupplier(req.params.id, req.clinicId, req.body);
    return success(res, supplier, 'Supplier updated successfully');
  }

  async delete(req, res) {
    await SupplierService.deleteSupplier(req.params.id, req.clinicId);
    return success(res, null, 'Supplier deleted successfully');
  }

  async logVisit(req, res) {
    const visit = await SupplierService.logVisit(req.params.id, req.clinicId, {
      ...req.body,
      logged_by: req.user.id
    });
    return created(res, visit, 'Visit logged successfully');
  }

  async getVisits(req, res) {
    const visits = await SupplierService.getVisitHistory(req.params.id, req.clinicId);
    return success(res, visits);
  }

  async getBalance(req, res) {
    const balance = await SupplierService.getSupplierBalance(req.params.id, req.clinicId);
    return success(res, balance);
  }
}

module.exports = new SupplierController();
