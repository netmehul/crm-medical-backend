/**
 * Seed plan-related tables
 */
const db = require('../config/database');
const { generateId } = require('../utils/uuid');

const plans = [
  {
    name: 'Free',
    slug: 'free',
    monthlyPriceCents: 0,
    tagline: 'Perfect for small clinics starting out.',
    isPopular: 0,
    showOnLanding: 1,
    displayOrder: 1,
    modules: {
      billing: false,
      inventory: false,
      mrManagement: false,
      labCommunication: false,
      reportUploads: false,
    },
    limits: {
      patients: 50,
      appointmentsPerMonth: 30,
      seats: 2,
      referralsPerMonth: 5,
    }
  },
  {
    name: 'Pro',
    slug: 'pro',
    monthlyPriceCents: 4900,
    tagline: 'Everything you need to grow your practice.',
    isPopular: 1,
    showOnLanding: 1,
    displayOrder: 2,
    modules: {
      billing: true,
      inventory: true,
      mrManagement: true,
      labCommunication: true,
      reportUploads: true,
    },
    limits: {
      patients: -1,
      appointmentsPerMonth: -1,
      seats: 10,
      referralsPerMonth: -1,
    }
  }
];

async function seedPlans() {
  const [existing] = await db.execute('SELECT id FROM plans LIMIT 1', []);
  if (existing.length > 0) return;

  console.log('🌱  Seeding plans...');

  for (const p of plans) {
    const id = generateId();
    await db.execute(
      `INSERT INTO plans (id, name, slug, monthly_price_cents, tagline, is_popular, show_on_landing, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, p.name, p.slug, p.monthlyPriceCents, p.tagline, p.isPopular, p.showOnLanding, p.displayOrder]
    );

    for (const [key, enabled] of Object.entries(p.modules)) {
      await db.execute(
        `INSERT INTO plan_modules (id, plan_id, module_key, is_enabled) VALUES (?, ?, ?, ?)`,
        [generateId(), id, key, enabled ? 1 : 0]
      );
    }

    for (const [key, val] of Object.entries(p.limits)) {
      await db.execute(
        `INSERT INTO plan_limits (id, plan_id, limit_key, limit_value) VALUES (?, ?, ?, ?)`,
        [generateId(), id, key, val]
      );
    }
  }

  console.log('✅  Plans seeded');
}

module.exports = seedPlans;
