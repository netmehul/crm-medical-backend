const PrescriptionService = require('../services/PrescriptionService');
const { success, created } = require('../utils/apiResponse');

class PrescriptionController {
  async getAll(req, res) {
    const data = await PrescriptionService.getPrescriptions(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await PrescriptionService.getPrescription(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const body = { ...req.body, doctor_id: req.body.doctor_id || req.userId };
    const data = await PrescriptionService.createPrescription(req.clinicId, body);
    return created(res, data, 'Prescription created successfully');
  }

  async update(req, res) {
    const data = await PrescriptionService.updatePrescription(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Prescription updated successfully');
  }

  async delete(req, res) {
    await PrescriptionService.deletePrescription(req.params.id, req.clinicId);
    return success(res, null, 'Prescription deleted successfully');
  }
}

module.exports = new PrescriptionController();
