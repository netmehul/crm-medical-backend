/**
 * Seeds plans, plan_modules, plan_limits with Free and Pro.
 * Run once after schema. Idempotent — skips if plans exist.
 */
const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { MODULES, LIMIT_KEYS, BOOLEAN_MODULE_KEYS } = require('../config/planRegistry');

const FREE_PLAN = {
  name: 'Free',
  slug: 'free',
  monthly_price_cents: 0,
  annual_price_cents: 0,
  tagline: 'For solo practitioners',
  feature_bullets: JSON.stringify([
    'Up to 50 patients',
    'Up to 30 appointments/month',
    'Appointments & calendar',
    'Basic prescriptions',
    '2 team members',
  ]),
  is_popular: 0,
  show_on_landing: 1,
  display_order: 0,
  status: 'active',
  modules: ['patients', 'appointments', 'prescriptions', 'follow_ups', 'branches', 'team'],
  limits: { patients: 50, appointmentsPerMonth: 30, seats: 2, referralsPerMonth: 5 },
  booleans: { reportUploads: false, billing: false, inventory: false, mrManagement: false, labCommunication: false },
};

const PRO_PLAN = {
  name: 'Pro',
  slug: 'pro',
  monthly_price_cents: 499,
  annual_discount_percent: 20,
  tagline: 'For growing clinics',
  feature_bullets: JSON.stringify([
    'Unlimited patients',
    'Unlimited appointments',
    'All modules included',
    'Up to 5 team members',
    'Report uploads',
    'Billing & invoicing',
    'Inventory & MR management',
    'External labs & referrals',
  ]),
  is_popular: 1,
  show_on_landing: 1,
  display_order: 1,
  status: 'active',
  modules: ['patients', 'appointments', 'prescriptions', 'follow_ups', 'medical_reps', 'inventory', 'external_labs', 'branches', 'team'],
  limits: { patients: -1, appointmentsPerMonth: -1, seats: 5, referralsPerMonth: -1 },
  booleans: { reportUploads: true, billing: true, inventory: true, mrManagement: true, labCommunication: true },
};

function seedPlans() {
  const existing = db.get('SELECT id FROM plans LIMIT 1');
  if (existing) {
    console.log('  ⏭️  Plans already seeded');
    return;
  }

  const plans = [FREE_PLAN, PRO_PLAN];
  for (const p of plans) {
    const planId = generateId();
    const annualCents = p.annual_price_cents ?? Math.round((p.monthly_price_cents || 0) * 12 * (100 - (p.annual_discount_percent || 0)) / 100);
    db.run(
      `INSERT INTO plans (id, name, slug, monthly_price_cents, annual_price_cents, annual_discount_percent, tagline, feature_bullets, is_popular, show_on_landing, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, p.name, p.slug, p.monthly_price_cents, annualCents, p.annual_discount_percent ?? 0, p.tagline, p.feature_bullets, p.is_popular, p.show_on_landing, p.display_order, p.status]
    );

    // Merge modules + booleans into single set (modules take precedence for overlap, e.g. inventory)
    const allModuleKeys = new Set([...p.modules, ...Object.keys(p.booleans)]);
    for (const modKey of allModuleKeys) {
      const isEnabled = p.modules.includes(modKey) ? 1 : (p.booleans[modKey] ? 1 : 0);
      db.run(
        `INSERT INTO plan_modules (id, plan_id, module_key, is_enabled) VALUES (?, ?, ?, ?)`,
        [generateId(), planId, modKey, isEnabled]
      );
    }

    for (const [limitKey, val] of Object.entries(p.limits)) {
      db.run(
        `INSERT INTO plan_limits (id, plan_id, limit_key, limit_value) VALUES (?, ?, ?, ?)`,
        [generateId(), planId, limitKey, val]
      );
    }
  }
  console.log('  ✅ Plans seeded (Free, Pro)');
}

module.exports = seedPlans;
