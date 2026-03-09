const AppointmentService = require('../services/AppointmentService');
const { success, created } = require('../utils/apiResponse');

class AppointmentController {
  async getAll(req, res) {
    const data = await AppointmentService.getAppointments(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = await AppointmentService.getAppointment(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const body = { ...req.body, doctor_id: req.body.doctor_id || req.userId };
    const data = await AppointmentService.createAppointment(req.clinicId, req.userId, body);
    return created(res, data, 'Appointment booked successfully');
  }

  async update(req, res) {
    const data = await AppointmentService.updateAppointment(req.params.id, req.clinicId, req.body);
    return success(res, data, 'Appointment updated successfully');
  }

  async delete(req, res) {
    await AppointmentService.deleteAppointment(req.params.id, req.clinicId);
    return success(res, null, 'Appointment deleted successfully');
  }
}

module.exports = new AppointmentController();
