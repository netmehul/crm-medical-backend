const db = require('../config/database');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PlatformAdminService {
  async getDashboard() {
    const [totalOrgsRow] = await db.execute(
      `SELECT COUNT(*) AS count FROM organizations WHERE deleted_at IS NULL`,
      []
    );
    const totalOrgs = totalOrgsRow[0].count;

    const [suspendedOrgsRow] = await db.execute(
      `SELECT COUNT(*) AS count FROM organizations WHERE plan_status = 'suspended' AND deleted_at IS NULL`,
      []
    );
    const suspendedOrgs = suspendedOrgsRow[0].count;

    const [totalUsersRow] = await db.execute(
      `SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND is_active = 1`,
      []
    );
    const totalUsers = totalUsersRow[0].count;

    const [totalClinicsRow] = await db.execute(
      `SELECT COUNT(*) AS count FROM clinics WHERE deleted_at IS NULL AND is_active = 1`,
      []
    );
    const totalClinics = totalClinicsRow[0].count;

    const [totalPatientsRow] = await db.execute(
      `SELECT COUNT(*) AS count FROM patients WHERE deleted_at IS NULL`,
      []
    );
    const totalPatients = totalPatientsRow[0].count;

    const [planRows] = await db.execute(
      `SELECT o.plan AS slug, COUNT(*) AS count,
              COALESCE(p.monthly_price_cents, 0) AS monthly_price_cents,
              COALESCE(p.name, o.plan) AS plan_name
       FROM organizations o
       LEFT JOIN plans p ON p.slug = o.plan AND p.deleted_at IS NULL AND p.status = 'active'
       WHERE o.deleted_at IS NULL AND o.plan_status != 'suspended'
       GROUP BY o.plan`,
      []
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
    const { page, limit, offset, sqlLimit, sqlOffset } = getPagination(query);

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

    const [rows] = await db.execute(
      `SELECT o.id, o.name, o.slug, o.owner_email, o.plan, o.plan_status, o.created_at,
        (SELECT COUNT(*) FROM clinics c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) AS branch_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL) AS user_count
       FROM organizations o
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, sqlLimit, sqlOffset]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM organizations o WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getOrganization(idOrSlug) {
    const [orgRows] = await db.execute(
      `SELECT * FROM organizations WHERE (id = ? OR slug = ?) AND deleted_at IS NULL`,
      [idOrSlug, idOrSlug]
    );
    const org = orgRows[0];
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const orgId = org.id; // Use primary key for joins

    const [clinics] = await db.execute(
      `SELECT * FROM clinics WHERE organization_id = ? AND deleted_at IS NULL ORDER BY created_at`,
      [orgId]
    );

    const [users] = await db.execute(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at
       FROM users u
       WHERE u.organization_id = ? AND u.deleted_at IS NULL
       ORDER BY u.created_at`,
      [orgId]
    );

    const usersWithBranches = [];
    for (const user of users) {
      const [memberships] = await db.execute(
        `SELECT cm.role, cm.clinic_id, c.name AS clinic_name
         FROM clinic_members cm
         JOIN clinics c ON c.id = cm.clinic_id
         WHERE cm.user_id = ? AND cm.deleted_at IS NULL AND cm.is_active = 1`,
        [user.id]
      );
      usersWithBranches.push({ ...user, branches: memberships });
    }

    const [payments] = await db.execute(
      `SELECT * FROM mock_payments WHERE organization_id = ? ORDER BY activated_at DESC`,
      [orgId]
    );

    const [patientCountRows] = await db.execute(
      `SELECT COUNT(*) AS count FROM patients p
       JOIN clinics c ON c.id = p.clinic_id
       WHERE c.organization_id = ? AND p.deleted_at IS NULL`,
      [orgId]
    );

    return {
      ...org,
      clinics,
      users: usersWithBranches,
      payments,
      totalPatients: patientCountRows[0].count,
    };
  }

  async updatePlan(orgId, plan) {
    const [existing] = await db.execute(`SELECT id FROM organizations WHERE id = ? AND deleted_at IS NULL`, [orgId]);
    if (!existing.length) throw { statusCode: 404, message: 'Organization not found' };

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `UPDATE organizations SET plan = ?, plan_activated_at = ?, updated_at = ? WHERE id = ?`,
      [plan, now, now, orgId]
    );

    const [updated] = await db.execute(`SELECT * FROM organizations WHERE id = ?`, [orgId]);
    return updated[0];
  }

  async updateStatus(orgId, status) {
    const [existing] = await db.execute(`SELECT id FROM organizations WHERE id = ? AND deleted_at IS NULL`, [orgId]);
    if (!existing.length) throw { statusCode: 404, message: 'Organization not found' };

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `UPDATE organizations SET plan_status = ?, updated_at = ? WHERE id = ?`,
      [status, now, orgId]
    );

    const [updated] = await db.execute(`SELECT * FROM organizations WHERE id = ?`, [orgId]);
    return updated[0];
  }
}

module.exports = new PlatformAdminService();
