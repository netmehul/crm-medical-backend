const PatientFileService = require('../services/PatientFileService');
const { success, created } = require('../utils/apiResponse');

class NoteController {
  async getAll(req, res) {
    const data = await PatientFileService.getNotes(req.params.patientId, req.clinicId, req.query);
    return success(res, data);
  }

  async create(req, res) {
    const data = await PatientFileService.addNote(
      req.params.patientId, req.clinicId, req.userId, req.body
    );
    return created(res, data, 'Note added successfully');
  }

  async update(req, res) {
    const data = await PatientFileService.updateNote(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Note updated successfully');
  }

  async delete(req, res) {
    await PatientFileService.deleteNote(req.params.id, req.clinicId);
    return success(res, null, 'Note deleted successfully');
  }
}

module.exports = new NoteController();
