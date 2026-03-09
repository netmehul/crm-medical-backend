const db = require('../config/database');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PlatformAdminService {
  async getDashboard() {
    const totalOrgs = db.get(
      `SELECT COUNT(*) AS count FROM organizations WHERE deleted_at IS NULL`
    ).count;

    const suspendedOrgs = db.get(
      `SELECT COUNT(*) AS count FROM organizations WHERE plan_status = 'suspended' AND deleted_at IS NULL`
    ).count;

    const totalUsers = db.get(
      `SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND is_active = 1`
    ).count;

    const totalClinics = db.get(
      `SELECT COUNT(*) AS count FROM clinics WHERE deleted_at IS NULL AND is_active = 1`
    ).count;

    const totalPatients = db.get(
      `SELECT COUNT(*) AS count FROM patients WHERE deleted_at IS NULL`
    ).count;

    const planRows = db.all(
      `SELECT o.plan AS slug, COUNT(*) AS count,
              COALESCE(p.monthly_price_cents, 0) AS monthly_price_cents,
              COALESCE(p.name, o.plan) AS plan_name
       FROM organizations o
       LEFT JOIN plans p ON p.slug = o.plan AND p.deleted_at IS NULL AND p.status = 'active'
       WHERE o.deleted_at IS NULL AND o.plan_status != 'suspended'
       GROUP BY o.plan`
    );

    const planCounts = {};
    let mrr = 0;
    let freeOrgs = 0;
    let payingOrgs = 0;

    for (const row of planRows) {
      const slug = row.slug || 'free';
      const count = row.count || 0;
      const priceCents = row.monthly_price_cents || 0;
      const priceUsd = priceCents / 100;

      planCounts[slug] = {
        name: row.plan_name || slug,
        count,
        monthlyPriceCents: priceCents,
        monthlyPriceUsd: priceUsd,
        contribution: count * priceUsd,
      };

      if (priceCents <= 0) {
        freeOrgs += count;
      } else {
        payingOrgs += count;
        mrr += count * priceUsd;
      }
    }

    return {
      totalOrgs,
      proOrgs: payingOrgs,
      freeOrgs,
      suspendedOrgs,
      totalUsers,
      totalClinics,
      totalPatients,
      mrr: Math.round(mrr * 100) / 100,
      planCounts,
    };
  }

  async getOrganizations(query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'o.deleted_at IS NULL';
    const params = [];

    if (query.search) {
      where += ' AND (o.name LIKE ? OR o.owner_email LIKE ?)';
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    if (query.plan) {
      where += ' AND o.plan = ?';
      params.push(query.plan);
    }
    if (query.status) {
      where += ' AND o.plan_status = ?';
      params.push(query.status);
    }

    const rows = db.all(
      `SELECT o.*,
        (SELECT COUNT(*) FROM clinics c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) AS branch_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL) AS user_count
       FROM organizations o
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM organizations o WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async getOrganization(orgId) {
    const org = db.get(
      `SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL`,
      [orgId]
    );
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const clinics = db.all(
      `SELECT * FROM clinics WHERE organization_id = ? AND deleted_at IS NULL ORDER BY created_at`,
      [orgId]
    );

    const users = db.all(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at
       FROM users u
       WHERE u.organization_id = ? AND u.deleted_at IS NULL
       ORDER BY u.created_at`,
      [orgId]
    );

    const userBranches = {};
    for (const user of users) {
      userBranches[user.id] = db.all(
        `SELECT cm.role, cm.clinic_id, c.name AS clinic_name
         FROM clinic_members cm
         JOIN clinics c ON c.id = cm.clinic_id
         WHERE cm.user_id = ? AND cm.deleted_at IS NULL AND cm.is_active = 1`,
        [user.id]
      );
    }

    const payments = db.all(
      `SELECT * FROM mock_payments WHERE organization_id = ? ORDER BY activated_at DESC`,
      [orgId]
    );

    const totalPatients = db.get(
      `SELECT COUNT(*) AS count FROM patients p
       JOIN clinics c ON c.id = p.clinic_id
       WHERE c.organization_id = ? AND p.deleted_at IS NULL`,
      [orgId]
    ).count;

    return {
      ...org,
      clinics,
      users: users.map(u => ({ ...u, branches: userBranches[u.id] || [] })),
      payments,
      totalPatients,
    };
  }

  async updatePlan(orgId, plan) {
    const org = db.get(`SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL`, [orgId]);
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const now = new Date().toISOString();
    db.run(
      `UPDATE organizations SET plan = ?, plan_activated_at = ?, updated_at = ? WHERE id = ?`,
      [plan, now, now, orgId]
    );

    return db.get(`SELECT * FROM organizations WHERE id = ?`, [orgId]);
  }

  async updateStatus(orgId, status) {
    const org = db.get(`SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL`, [orgId]);
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const now = new Date().toISOString();
    db.run(
      `UPDATE organizations SET plan_status = ?, updated_at = ? WHERE id = ?`,
      [status, now, orgId]
    );

    return db.get(`SELECT * FROM organizations WHERE id = ?`, [orgId]);
  }
}

module.exports = new PlatformAdminService();
