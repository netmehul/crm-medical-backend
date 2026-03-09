const PatientFileService = require('../services/PatientFileService');
const { success, created } = require('../utils/apiResponse');

class ReportController {
  async getAll(req, res) {
    const data = await PatientFileService.getReports(req.params.patientId, req.clinicId, req.query);
    return success(res, data);
  }

  async upload(req, res) {
    const reportData = { ...req.body };

    if (req.file) {
      // Store relative path from public/uploads for easier serving
      const relativePath = req.file.path.split('public/uploads/')[1] ||
        req.file.path.split('public\\uploads\\')[1] ||
        req.file.filename;
      reportData.file_path = relativePath.replace(/\\/g, '/');
      reportData.file_name = req.file.originalname;
      reportData.file_type = req.file.mimetype;
      reportData.file_size_kb = Math.round(req.file.size / 1024);
    }

    const data = await PatientFileService.addReport(
      req.params.patientId, req.clinicId, req.userId, reportData
    );
    return created(res, data, 'Report uploaded successfully');
  }

  async delete(req, res) {
    await PatientFileService.deleteReport(req.params.id, req.clinicId);
    return success(res, null, 'Report deleted successfully');
  }
}

module.exports = new ReportController();
