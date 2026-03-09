/**
 * Module Registry — Single source of truth for all plan modules.
 * Keys must match sidebar routing and plan gating.
 */

const MODULE_GROUPS = {
  patients: 'Patients',
  operations: 'Operations',
  management: 'Management',
};

const MODULES = [
  { key: 'patients', name: 'Patients', group: 'patients', description: 'Patient records and profiles' },
  { key: 'appointments', name: 'Appointments', group: 'patients', description: 'Calendar and appointment scheduling' },
  { key: 'prescriptions', name: 'Prescriptions', group: 'patients', description: 'Prescription management' },
  { key: 'follow_ups', name: 'Follow-ups', group: 'patients', description: 'Follow-up tracking' },
  { key: 'medical_reps', name: 'Medical Reps', group: 'operations', description: 'Medical representative management' },
  { key: 'inventory', name: 'Inventory', group: 'operations', description: 'Stock management with low-stock alerts' },
  { key: 'external_labs', name: 'External Labs', group: 'operations', description: 'Lab referrals and report management' },
  { key: 'branches', name: 'Branches', group: 'management', description: 'Multi-branch management' },
  { key: 'team', name: 'Team', group: 'management', description: 'Team and user management' },
];

/**
 * Limit keys — numeric limits per plan.
 * -1 means unlimited.
 */
const LIMIT_KEYS = [
  { key: 'patients', label: 'Max patients', description: 'Maximum number of patients per clinic', bulletLabel: 'patients' },
  { key: 'appointmentsPerMonth', label: 'Appointments per month', description: 'Monthly appointment limit', bulletLabel: 'appointments/month' },
  { key: 'seats', label: 'Team seats', description: 'Maximum team members per clinic', bulletLabel: 'team members' },
  { key: 'referralsPerMonth', label: 'Lab referrals per month', description: 'Monthly lab referral limit', bulletLabel: 'lab referrals/month' },
];

/**
 * Boolean feature keys (stored as plan_modules with is_enabled).
 * These map to the old PLAN_LIMITS boolean keys.
 */
const BOOLEAN_MODULE_KEYS = [
  'reportUploads',
  'billing',
  'inventory',
  'mrManagement',
  'labCommunication',
];

const BOOLEAN_DISPLAY_NAMES = {
  reportUploads: 'Report uploads',
  billing: 'Billing & invoicing',
  inventory: 'Inventory management',
  mrManagement: 'MR management',
  labCommunication: 'Lab communication',
};

function buildFeatureBullets(modules, limits) {
  const bullets = [];
  const added = new Set();
  for (const m of MODULES) {
    if (modules[m.key]) { bullets.push(m.name); added.add(m.key); }
  }
  for (const k of BOOLEAN_MODULE_KEYS) {
    if (modules[k] && !added.has(k)) bullets.push(BOOLEAN_DISPLAY_NAMES[k] || k);
  }
  for (const lk of LIMIT_KEYS) {
    const val = limits[lk.key];
    if (val === undefined) continue;
    const isUnlimited = val === -1 || val === Infinity;
    const label = lk.bulletLabel || lk.label;
    bullets.push(isUnlimited ? `Unlimited ${label}` : `Up to ${val} ${label}`);
  }
  return bullets;
}

module.exports = { MODULES, MODULE_GROUPS, LIMIT_KEYS, BOOLEAN_MODULE_KEYS, buildFeatureBullets };
