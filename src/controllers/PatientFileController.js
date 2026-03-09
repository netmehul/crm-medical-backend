const PatientFileService = require('../services/PatientFileService');
const { success } = require('../utils/apiResponse');

class PatientFileController {
  async getFile(req, res) {
    const data = await PatientFileService.getFile(req.params.patientId, req.clinicId);
    return success(res, data);
  }

  async updateFile(req, res) {
    const data = await PatientFileService.updateFile(req.params.patientId, req.clinicId, req.body);
    return success(res, data, 'File updated successfully');
  }
}

module.exports = new PatientFileController();
