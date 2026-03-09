const ReferralService = require('../services/ReferralService');
const LetterService   = require('../services/LetterService');
const { success, created, notFound } = require('../utils/apiResponse');
const fs = require('fs');

class ReferralController {

  async getAll(req, res) {
    const data = await ReferralService.getReferrals(req.clinicId, req.query);
    return success(res, data);
  }

  async getOne(req, res) {
    const data = ReferralService.getReferral(req.params.id, req.clinicId);
    return success(res, data);
  }

  async create(req, res) {
    const data = await ReferralService.createReferral(req.clinicId, req.userId, req.body);
    return created(res, data, 'Referral created successfully');
  }

  async update(req, res) {
    const data = ReferralService.updateStatus(req.params.id, req.clinicId, req.body.status);
    return success(res, data, 'Referral updated');
  }

  async delete(req, res) {
    const data = ReferralService.softDelete(req.params.id, req.clinicId);
    return success(res, data, 'Referral deleted');
  }

  async generateLetter(req, res) {
    const data = await LetterService.generateReferralLetter(req.params.id);
    return success(res, data, 'Letter generated');
  }

  async downloadLetter(req, res) {
    const referral = ReferralService.getReferral(req.params.id, req.clinicId);
    if (!referral?.letter_path) return notFound(res, 'Letter not yet generated');

    if (!fs.existsSync(referral.letter_path)) return notFound(res, 'Letter file not found');

    const ext = referral.letter_path.endsWith('.pdf') ? 'pdf' : 'html';
    const contentType = ext === 'pdf' ? 'application/pdf' : 'text/html';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="Referral_${referral.reference_number}.${ext}"`);
    fs.createReadStream(referral.letter_path).pipe(res);
  }

  async send(req, res) {
    const { channels = [], emailOverride, phoneOverride } = req.body;
    const data = await ReferralService.sendReferral(
      req.params.id, req.clinicId, req.userId, channels, { emailOverride, phoneOverride }
    );
    return success(res, data, 'Referral sent');
  }

  async updateStatus(req, res) {
    const data = ReferralService.updateStatus(req.params.id, req.clinicId, req.body.status);
    return success(res, data, 'Status updated');
  }

  async getCommunications(req, res) {
    const data = ReferralService.getCommunications(req.params.id, req.clinicId);
    return success(res, data);
  }
}

module.exports = new ReferralController();
