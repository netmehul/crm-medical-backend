const LabService = require('../services/LabService');
const { success, created } = require('../utils/apiResponse');

class LabController {

  async getAll(req, res) {
    const data = await LabService.getLabs(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await LabService.getLab(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const data = await LabService.createLab(req.clinicId, req.body);
    return created(res, data, 'Lab added successfully');
  }

  async update(req, res) {
    const data = await LabService.updateLab(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Lab updated successfully');
  }

  async delete(req, res) {
    const data = await LabService.deleteLab(req.params.id, req.clinicId);
    return success(res, data, 'Lab deleted successfully');
  }

  async getAllActive(req, res) {
    const data = await LabService.getAllActive(req.clinicId);
    return success(res, data);
  }
}

module.exports = new LabController();
