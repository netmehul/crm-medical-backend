const InventoryService = require('../services/InventoryService');
const { success, created } = require('../utils/apiResponse');

class InventoryController {
  async getAll(req, res) {
    const data = await InventoryService.getItems(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await InventoryService.getItem(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const data = await InventoryService.createItem(req.clinicId, req.body, req.userId);
    return created(res, data, 'Item added to inventory');
  }

  async update(req, res) {
    const data = await InventoryService.updateItem(req.params.id, req.clinicId, req.body, req.userId);
    return success(res, data, 'Item updated successfully');
  }

  async delete(req, res) {
    await InventoryService.deleteItem(req.params.id, req.clinicId);
    return success(res, null, 'Item deleted successfully');
  }

  async stockTransaction(req, res) {
    const data = await InventoryService.stockTransaction(
      req.params.id, req.clinicId, req.userId, req.body
    );
    return success(res, data, 'Stock updated successfully');
  }

  async getLowStock(req, res) {
    const data = await InventoryService.getLowStock(req.clinicId);
    return success(res, data);
  }

  async markAsPaid(req, res) {
    const data = await InventoryService.markAsPaid(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Payment recorded successfully');
  }

  async getSupplierReport(req, res) {
    const data = await InventoryService.getSupplierReport(req.clinicId);
    return success(res, data);
  }

  async getPaymentSummary(req, res) {
    const data = await InventoryService.getPaymentSummary(req.clinicId);
    return success(res, data);
  }
}

module.exports = new InventoryController();
