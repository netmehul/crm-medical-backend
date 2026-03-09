const PlanService = require('../services/PlanService');
const { success, created } = require('../utils/apiResponse');

class PlanController {

  async getPublic(req, res) {
    const plans = await PlanService.getPublicPlans();
    return success(res, plans);
  }

  async getAll(req, res) {
    const plans = await PlanService.getAllPlans();
    return success(res, plans);
  }

  async getOne(req, res) {
    const plan = await PlanService.getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return success(res, plan);
  }

  async create(req, res) {
    const plan = await PlanService.createPlan(req.body);
    return created(res, plan, 'Plan created');
  }

  async update(req, res) {
    const plan = await PlanService.updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return success(res, plan, 'Plan updated');
  }

  async duplicate(req, res) {
    const plan = await PlanService.duplicatePlan(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return created(res, plan, 'Plan duplicated');
  }

  async delete(req, res) {
    const ok = await PlanService.deletePlan(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Plan not found' });
    return success(res, { id: req.params.id }, 'Plan deleted');
  }
}

module.exports = new PlanController();
