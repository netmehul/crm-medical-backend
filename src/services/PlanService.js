const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { MODULES, LIMIT_KEYS, buildFeatureBullets } = require('../config/planRegistry');

// In-memory cache: slug -> { limits, modules }
let planConfigCache = null;

function invalidateCache() {
  planConfigCache = null;
}

async function _buildPlanConfig() {
  const [plans] = await db.execute(
    `SELECT id, slug, name FROM plans WHERE deleted_at IS NULL AND status = 'active'`
  );
  const config = {};
  for (const p of plans) {
    const [modules] = await db.execute(
      `SELECT module_key, is_enabled FROM plan_modules WHERE plan_id = ?`,
      [p.id]
    );
    const [limits] = await db.execute(
      `SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = ?`,
      [p.id]
    );
    const modMap = {};
    for (const m of modules) {
      modMap[m.module_key] = m.is_enabled === 1;
    }
    const limMap = {};
    for (const l of limits) {
      limMap[l.limit_key] = l.limit_value === -1 ? Infinity : l.limit_value;
    }
    config[p.slug] = { modules: modMap, limits: limMap };
  }
  return config;
}

async function getPlanConfig(planSlug) {
  if (!planConfigCache) planConfigCache = await _buildPlanConfig();
  const cfg = planConfigCache[planSlug];
  if (!cfg) return null;
  return cfg;
}

function _computeAnnualCents(monthlyCents, discountPercent) {
  if (!monthlyCents || monthlyCents <= 0) return 0;
  const pct = Math.max(0, Math.min(100, discountPercent || 0));
  return Math.round(monthlyCents * 12 * (100 - pct) / 100);
}

async function _getModulesAndLimits(planId) {
  const [modules] = await db.execute(`SELECT module_key, is_enabled FROM plan_modules WHERE plan_id = ?`, [planId]);
  const [limits] = await db.execute(`SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = ?`, [planId]);
  const modMap = modules.reduce((acc, m) => ({ ...acc, [m.module_key]: m.is_enabled === 1 }), {});
  const limMap = limits.reduce((acc, l) => ({ ...acc, [l.limit_key]: l.limit_value === -1 ? Infinity : l.limit_value }), {});
  return { modules: modMap, limits: limMap };
}

async function getPublicPlans() {
  const [rows] = await db.execute(
    `SELECT id, name, slug, monthly_price_cents, annual_price_cents, annual_discount_percent, tagline, is_popular, display_order
     FROM plans
     WHERE deleted_at IS NULL AND status = 'active' AND show_on_landing = 1
     ORDER BY display_order ASC, name ASC`
  );

  const results = [];
  for (const p of rows) {
    const { modules, limits } = await _getModulesAndLimits(p.id);
    const bullets = buildFeatureBullets(modules, limits);
    const annualCents = p.annual_price_cents ?? _computeAnnualCents(p.monthly_price_cents, p.annual_discount_percent);
    const limitsForApi = Object.fromEntries(
      Object.entries(limits).map(([k, v]) => [k, v === Infinity ? -1 : v])
    );
    results.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      monthlyPriceCents: p.monthly_price_cents,
      annualPriceCents: annualCents,
      annualDiscountPercent: p.annual_discount_percent ?? 0,
      tagline: p.tagline,
      featureBullets: bullets,
      limits: limitsForApi,
      modules: modules,
      isPopular: p.is_popular === 1,
      displayOrder: p.display_order,
    });
  }
  return results;
}

async function getAllPlans() {
  const [rows] = await db.execute(
    `SELECT p.*,
       (SELECT COUNT(*) FROM organizations o WHERE o.plan = p.slug AND o.deleted_at IS NULL) AS org_count
     FROM plans p
     WHERE p.deleted_at IS NULL
     ORDER BY p.display_order ASC, p.name ASC`
  );

  const results = [];
  for (const p of rows) {
    const { modules, limits } = await _getModulesAndLimits(p.id);
    const bullets = buildFeatureBullets(modules, limits);
    results.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      monthlyPriceCents: p.monthly_price_cents,
      annualPriceCents: p.annual_price_cents ?? _computeAnnualCents(p.monthly_price_cents, p.annual_discount_percent),
      annualDiscountPercent: p.annual_discount_percent ?? 0,
      tagline: p.tagline,
      featureBullets: bullets,
      isPopular: p.is_popular === 1,
      showOnLanding: p.show_on_landing === 1,
      displayOrder: p.display_order,
      status: p.status,
      orgCount: p.org_count || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    });
  }
  return results;
}

async function getPlanById(id) {
  const [plans] = await db.execute(`SELECT * FROM plans WHERE id = ? AND deleted_at IS NULL`, [id]);
  const p = plans[0];
  if (!p) return null;

  const [modules] = await db.execute(`SELECT module_key, is_enabled FROM plan_modules WHERE plan_id = ?`, [id]);
  const [limits] = await db.execute(`SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = ?`, [id]);
  const [orgCountRow] = await db.execute(
    `SELECT COUNT(*) AS c FROM organizations WHERE plan = ? AND deleted_at IS NULL`,
    [p.slug]
  );

  const annualCents = p.annual_price_cents ?? _computeAnnualCents(p.monthly_price_cents, p.annual_discount_percent);
  const modMap = modules.reduce((acc, m) => ({ ...acc, [m.module_key]: m.is_enabled === 1 }), {});
  const limMap = limits.reduce((acc, l) => ({ ...acc, [l.limit_key]: l.limit_value === -1 ? Infinity : l.limit_value }), {});
  const bullets = buildFeatureBullets(modMap, limMap);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    monthlyPriceCents: p.monthly_price_cents,
    annualPriceCents: annualCents,
    annualDiscountPercent: p.annual_discount_percent ?? 0,
    tagline: p.tagline,
    featureBullets: bullets,
    isPopular: p.is_popular === 1,
    showOnLanding: p.show_on_landing === 1,
    displayOrder: p.display_order,
    status: p.status,
    orgCount: orgCountRow[0]?.c || 0,
    modules: modules.reduce((acc, m) => ({ ...acc, [m.module_key]: m.is_enabled === 1 }), {}),
    limits: limits.reduce((acc, l) => ({ ...acc, [l.limit_key]: l.limit_value }), {}),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

async function createPlan(data) {
  const id = generateId();
  const slug = (data.slug || data.name?.toLowerCase().replace(/\s+/g, '_')) || 'plan';
  const monthlyCents = data.monthlyPriceCents ?? 0;
  const discountPct = data.annualDiscountPercent ?? 0;
  const annualCents = data.annualPriceCents ?? _computeAnnualCents(monthlyCents, discountPct);

  await db.execute(
    `INSERT INTO plans (id, name, slug, monthly_price_cents, annual_price_cents, annual_discount_percent, tagline, feature_bullets, is_popular, show_on_landing, display_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      slug,
      monthlyCents,
      annualCents,
      discountPct,
      data.tagline || null,
      data.featureBullets ? JSON.stringify(data.featureBullets) : null,
      data.isPopular ? 1 : 0,
      data.showOnLanding !== false ? 1 : 0,
      data.displayOrder ?? 0,
      data.status || 'draft',
    ]
  );

  await _saveModules(id, data.modules || {});
  await _saveLimits(id, data.limits || {});
  invalidateCache();
  return getPlanById(id);
}

async function updatePlan(id, data) {
  const [exists] = await db.execute(`SELECT id FROM plans WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!exists.length) return null;

  if (data.isPopular) {
    await db.execute(`UPDATE plans SET is_popular = 0 WHERE id != ?`, [id]);
  }

  const [currentRows] = await db.execute('SELECT monthly_price_cents, annual_discount_percent FROM plans WHERE id = ?', [id]);
  const current = currentRows[0];
  const monthlyCents = data.monthlyPriceCents ?? current?.monthly_price_cents ?? 0;
  const discountPct = data.annualDiscountPercent ?? current?.annual_discount_percent ?? 0;

  const updates = [];
  const params = [];
  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.slug !== undefined) { updates.push('slug = ?'); params.push(data.slug); }
  if (data.monthlyPriceCents !== undefined) { updates.push('monthly_price_cents = ?'); params.push(data.monthlyPriceCents); }
  if (data.annualDiscountPercent !== undefined) { updates.push('annual_discount_percent = ?'); params.push(data.annualDiscountPercent); }
  if (data.monthlyPriceCents !== undefined || data.annualDiscountPercent !== undefined) {
    updates.push('annual_price_cents = ?');
    params.push(_computeAnnualCents(monthlyCents, discountPct));
  }
  if (data.tagline !== undefined) { updates.push('tagline = ?'); params.push(data.tagline); }
  if (data.featureBullets !== undefined) { updates.push('feature_bullets = ?'); params.push(JSON.stringify(data.featureBullets)); }
  if (data.isPopular !== undefined) { updates.push('is_popular = ?'); params.push(data.isPopular ? 1 : 0); }
  if (data.showOnLanding !== undefined) { updates.push('show_on_landing = ?'); params.push(data.showOnLanding ? 1 : 0); }
  if (data.displayOrder !== undefined) { updates.push('display_order = ?'); params.push(data.displayOrder); }
  if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }

  if (updates.length) {
    params.push(id);
    await db.execute(`UPDATE plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  }
  if (data.modules) await _saveModules(id, data.modules);
  if (data.limits) await _saveLimits(id, data.limits);
  invalidateCache();
  return getPlanById(id);
}

async function _saveModules(planId, modules) {
  await db.execute(`DELETE FROM plan_modules WHERE plan_id = ?`, [planId]);
  for (const [key, enabled] of Object.entries(modules)) {
    if (enabled === true || enabled === false) {
      await db.execute(
        `INSERT INTO plan_modules (id, plan_id, module_key, is_enabled) VALUES (?, ?, ?, ?)`,
        [generateId(), planId, key, enabled ? 1 : 0]
      );
    }
  }
}

async function _saveLimits(planId, limits) {
  await db.execute(`DELETE FROM plan_limits WHERE plan_id = ?`, [planId]);
  for (const [key, val] of Object.entries(limits)) {
    const v = val === Infinity || val === -1 ? -1 : parseInt(val, 10);
    if (!isNaN(v)) {
      await db.execute(
        `INSERT INTO plan_limits (id, plan_id, limit_key, limit_value) VALUES (?, ?, ?, ?)`,
        [generateId(), planId, key, v]
      );
    }
  }
}

async function duplicatePlan(id) {
  const src = await getPlanById(id);
  if (!src) return null;
  const { id: _id, orgCount: _oc, createdAt: _c, updatedAt: _u, ...rest } = src;
  rest.name = `${src.name} (Copy)`;
  rest.slug = `${src.slug}_copy_${Date.now().toString(36)}`;
  rest.status = 'draft';
  rest.isPopular = false;
  return createPlan(rest);
}

async function deletePlan(id) {
  const [plans] = await db.execute(`SELECT id FROM plans WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!plans.length) return false;
  await db.execute(`UPDATE plans SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  invalidateCache();
  return true;
}

module.exports = {
  getPlanConfig,
  getPublicPlans,
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  duplicatePlan,
  deletePlan,
  invalidateCache,
};
