const MedicalRepService = require('../services/MedicalRepService');
const { success, created } = require('../utils/apiResponse');

class MedicalRepController {
  async getAll(req, res) {
    const data = await MedicalRepService.getMedicalReps(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await MedicalRepService.getMedicalRep(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const data = await MedicalRepService.createMedicalRep(req.clinicId, req.body);
    return created(res, data, 'Medical rep added successfully');
  }

  async update(req, res) {
    const data = await MedicalRepService.updateMedicalRep(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Medical rep updated successfully');
  }

  async delete(req, res) {
    await MedicalRepService.deleteMedicalRep(req.params.id, req.clinicId);
    return success(res, null, 'Medical rep deleted successfully');
  }

  async logVisit(req, res) {
    const data = await MedicalRepService.logVisit(
      req.params.id, req.clinicId, req.userId, req.body
    );
    return created(res, data, 'Visit logged successfully');
  }

  async getVisits(req, res) {
    const data = await MedicalRepService.getVisits(req.params.id, req.clinicId, req.query);
    return success(res, data);
  }
}

module.exports = new MedicalRepController();
