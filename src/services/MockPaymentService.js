const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class MockPaymentService {
  async upgradeToPro(orgId, userId, planSlug = 'pro') {
    const org = db.get(
      `SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL`,
      [orgId]
    );
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const targetPlan = planSlug || 'pro';
    const planExists = db.get(`SELECT id FROM plans WHERE slug = ? AND deleted_at IS NULL AND status = 'active'`, [targetPlan]);
    const effectivePlan = planExists ? targetPlan : 'pro';

    if (org.plan === effectivePlan) {
      throw { statusCode: 400, message: `Already on ${effectivePlan} plan` };
    }

    const planRow = db.get(`SELECT monthly_price_cents FROM plans WHERE slug = ? AND deleted_at IS NULL`, [effectivePlan]);
    const amountUsd = planRow ? (planRow.monthly_price_cents / 100) : 5.00;

    const now = new Date().toISOString();
    const paymentId = generateId();
    const receiptNum = `MOCK-TXN-${String(Date.now()).slice(-5)}`;

    db.run(
      `INSERT INTO mock_payments (id, organization_id, plan, amount_usd, status, mock_receipt, activated_at)
       VALUES (?, ?, ?, ?, 'success', ?, ?)`,
      [paymentId, orgId, effectivePlan, amountUsd, receiptNum, now]
    );

    db.run(
      `UPDATE organizations SET plan = ?, plan_status = 'active', plan_activated_at = ?, updated_at = ? WHERE id = ?`,
      [effectivePlan, now, now, orgId]
    );

    const user = db.get(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`, [userId]);
    const member = db.get(
      `SELECT * FROM clinic_members WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
      [userId]
    );

    const token = jwt.sign({
      tier:     'app',
      userId:   user.id,
      orgId:    orgId,
      clinicId: member?.clinic_id,
      role:     member?.role || 'org_admin',
      plan:     effectivePlan,
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    return {
      token,
      receipt: receiptNum,
      plan:    effectivePlan,
      clinic:  { id: member?.clinic_id, plan: effectivePlan },
    };
  }

  async getPaymentHistory(orgId) {
    return db.all(
      `SELECT * FROM mock_payments WHERE organization_id = ? ORDER BY activated_at DESC`,
      [orgId]
    );
  }
}

module.exports = new MockPaymentService();
