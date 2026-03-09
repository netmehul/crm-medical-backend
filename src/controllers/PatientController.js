const PatientService = require('../services/PatientService');
const { success, created } = require('../utils/apiResponse');

class PatientController {
  async getAll(req, res) {
    const data = await PatientService.getPatients(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await PatientService.getPatient(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const data = await PatientService.createPatient(req.clinicId, req.userId, req.body);
    return created(res, data, 'Patient created successfully');
  }

  async update(req, res) {
    const data = await PatientService.updatePatient(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Patient updated successfully');
  }

  async delete(req, res) {
    await PatientService.deletePatient(req.params.id, req.clinicId);
    return success(res, null, 'Patient deleted successfully');
  }
}

module.exports = new PatientController();
