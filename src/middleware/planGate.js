const db = require('../config/database');
const PlanService = require('../services/PlanService');
const { forbidden } = require('../utils/apiResponse');

// Fallback when DB lookup fails — default to free-tier limits
const FALLBACK_LIMITS = {
  patients: 50,
  appointmentsPerMonth: 30,
  seats: 2,
  referralsPerMonth: 5,
  reportUploads: false,
  billing: false,
  inventory: false,
  mrManagement: false,
  labCommunication: false,
};

const planGate = (featureKey) => (req, res, next) => {
  const planSlug = req.plan || 'free';
  let config = PlanService.getPlanConfig(planSlug);

  if (!config) {
    config = { modules: FALLBACK_LIMITS, limits: FALLBACK_LIMITS };
  }

  const limits = config.limits || {};
  const modules = config.modules || {};

  const numericKeys = ['patients', 'appointmentsPerMonth', 'seats', 'referralsPerMonth'];
  const isNumeric = numericKeys.includes(featureKey);

  if (!isNumeric) {
    const enabled = modules[featureKey] === true;
    if (!enabled) {
      return res.status(403).json({
        success: false,
        code: 'PLAN_LIMIT',
        message: 'Upgrade to Pro to unlock this feature.',
        feature: featureKey,
      });
    }
    return next();
  }

  const clinicId = req.clinicId;
  if (!clinicId) return next();

  if (featureKey === 'patients') {
    const limit = limits.patients ?? FALLBACK_LIMITS.patients;
    if (limit !== Infinity && limit !== -1) {
      const { count } = db.get(
        `SELECT COUNT(*) as count FROM patients WHERE clinic_id = ? AND deleted_at IS NULL`,
        [clinicId]
      );
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT',
          message: `Patient limit of ${limit} reached. Upgrade to Pro.`,
          feature: 'patients',
        });
      }
    }
  }

  if (featureKey === 'appointmentsPerMonth') {
    const limit = limits.appointmentsPerMonth ?? FALLBACK_LIMITS.appointmentsPerMonth;
    if (limit !== Infinity && limit !== -1) {
      const { count } = db.get(
        `SELECT COUNT(*) as count FROM appointments
         WHERE clinic_id = ? AND deleted_at IS NULL
         AND strftime('%m', created_at) = strftime('%m', 'now')
         AND strftime('%Y', created_at) = strftime('%Y', 'now')`,
        [clinicId]
      );
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT',
          message: `Monthly appointment limit of ${limit} reached. Upgrade to Pro.`,
          feature: 'appointmentsPerMonth',
        });
      }
    }
  }

  if (featureKey === 'referralsPerMonth') {
    const limit = limits.referralsPerMonth ?? FALLBACK_LIMITS.referralsPerMonth;
    if (limit !== Infinity && limit !== -1) {
      const { count } = db.get(
        `SELECT COUNT(*) as count FROM lab_referrals
         WHERE clinic_id = ? AND deleted_at IS NULL
         AND strftime('%m', created_at) = strftime('%m', 'now')
         AND strftime('%Y', created_at) = strftime('%Y', 'now')`,
        [clinicId]
      );
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT',
          message: `Monthly referral limit of ${limit} reached. Upgrade to Pro.`,
          feature: 'referralsPerMonth',
        });
      }
    }
  }

  if (featureKey === 'seats') {
    const limit = limits.seats ?? FALLBACK_LIMITS.seats;
    if (limit !== Infinity && limit !== -1) {
      const { count } = db.get(
        `SELECT COUNT(*) as count FROM clinic_members
         WHERE clinic_id = ? AND is_active = 1 AND deleted_at IS NULL`,
        [clinicId]
      );
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT',
          message: `Seat limit of ${limit} reached. Upgrade to Pro.`,
          feature: 'seats',
        });
      }
    }
  }

  next();
};

module.exports = planGate;
