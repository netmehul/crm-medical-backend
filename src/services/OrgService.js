const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class OrgService {
  async getBranches(orgId) {
    const branches = db.all(
      `SELECT c.*,
        (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id AND p.deleted_at IS NULL) AS patient_count,
        (SELECT COUNT(*) FROM clinic_members cm WHERE cm.clinic_id = c.id AND cm.is_active = 1 AND cm.deleted_at IS NULL) AS staff_count
       FROM clinics c
       WHERE c.organization_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at`,
      [orgId]
    );
    return branches;
  }

  async getBranch(orgId, branchId) {
    const branch = db.get(
      `SELECT c.*,
        (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id AND p.deleted_at IS NULL) AS patient_count,
        (SELECT COUNT(*) FROM clinic_members cm WHERE cm.clinic_id = c.id AND cm.is_active = 1 AND cm.deleted_at IS NULL) AS staff_count,
        (SELECT COUNT(*) FROM appointments a WHERE a.clinic_id = c.id AND a.deleted_at IS NULL) AS appointment_count
       FROM clinics c
       WHERE c.id = ? AND c.organization_id = ? AND c.deleted_at IS NULL`,
      [branchId, orgId]
    );
    if (!branch) throw { statusCode: 404, message: 'Branch not found' };

    const staff = db.all(
      `SELECT u.id, u.full_name, u.email, u.is_active, cm.role, cm.created_at AS assigned_at
       FROM clinic_members cm
       JOIN users u ON u.id = cm.user_id AND u.deleted_at IS NULL
       WHERE cm.clinic_id = ? AND cm.organization_id = ? AND cm.is_active = 1 AND cm.deleted_at IS NULL
       ORDER BY cm.created_at`,
      [branchId, orgId]
    );

    branch.staff = staff;
    return branch;
  }

  async createBranch(orgId, data) {
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, orgId, data.name, data.phone || null, data.email || null,
       data.address || null, data.city || null, now, now]
    );

    return db.get(`SELECT * FROM clinics WHERE id = ?`, [id]);
  }

  async updateBranch(orgId, branchId, data) {
    const branch = db.get(
      `SELECT * FROM clinics WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [branchId, orgId]
    );
    if (!branch) throw { statusCode: 404, message: 'Branch not found' };

    const allowed = {};
    for (const f of ['name', 'phone', 'email', 'address', 'city', 'is_active']) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (Object.keys(allowed).length === 0) return branch;

    allowed.updated_at = new Date().toISOString();
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE clinics SET ${setClause} WHERE id = ? AND organization_id = ?`,
      [...Object.values(allowed), branchId, orgId]
    );

    return db.get(`SELECT * FROM clinics WHERE id = ?`, [branchId]);
  }

  async getTeam(orgId) {
    const users = db.all(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at
       FROM users u
       WHERE u.organization_id = ? AND u.deleted_at IS NULL
       ORDER BY u.created_at`,
      [orgId]
    );

    return users.map(user => {
      const branches = db.all(
        `SELECT cm.role, cm.clinic_id, c.name AS clinic_name
         FROM clinic_members cm
         JOIN clinics c ON c.id = cm.clinic_id AND c.deleted_at IS NULL
         WHERE cm.user_id = ? AND cm.organization_id = ? AND cm.is_active = 1 AND cm.deleted_at IS NULL`,
        [user.id, orgId]
      );
      return { ...user, branches };
    });
  }

  async getTeamMember(orgId, userId) {
    const user = db.get(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, u.updated_at
       FROM users u
       WHERE u.id = ? AND u.organization_id = ? AND u.deleted_at IS NULL`,
      [userId, orgId]
    );
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const branches = db.all(
      `SELECT cm.role, cm.clinic_id, cm.is_active AS membership_active, cm.created_at AS assigned_at,
              c.name AS clinic_name, c.city AS clinic_city,
              (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id AND p.deleted_at IS NULL) AS clinic_patients
       FROM clinic_members cm
       JOIN clinics c ON c.id = cm.clinic_id AND c.deleted_at IS NULL
       WHERE cm.user_id = ? AND cm.organization_id = ? AND cm.deleted_at IS NULL`,
      [userId, orgId]
    );

    const stats = db.get(
      `SELECT
        (SELECT COUNT(*) FROM appointments a
         JOIN clinic_members cm ON cm.clinic_id = a.clinic_id AND cm.user_id = ?
         WHERE a.doctor_id = ? AND a.deleted_at IS NULL) AS total_appointments,
        (SELECT COUNT(*) FROM prescriptions pr
         WHERE pr.doctor_id = ? AND pr.deleted_at IS NULL) AS total_prescriptions`,
      [userId, userId, userId]
    );

    return { ...user, branches, stats };
  }

  async inviteUser(orgId, data) {
    const existing = db.get(`SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, [data.email]);
    if (existing) throw { statusCode: 409, message: 'Email already registered' };

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userId = generateId();
    const now = new Date().toISOString();

    const clinicIds = data.clinic_ids || [];
    const role = data.role || 'receptionist';

    const txn = db.transaction(() => {
      db.run(
        `INSERT INTO users (id, organization_id, full_name, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [userId, orgId, data.full_name, data.email, hashedPassword, now, now]
      );

      for (const clinicId of clinicIds) {
        db.run(
          `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [generateId(), userId, clinicId, orgId, role, now]
        );
      }
    });
    txn();

    return { id: userId, full_name: data.full_name, email: data.email, role };
  }

  async updateUser(orgId, userId, data) {
    const user = db.get(
      `SELECT * FROM users WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [userId, orgId]
    );
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const now = new Date().toISOString();

    if (data.full_name !== undefined) {
      db.run(`UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?`, [data.full_name, now, userId]);
    }

    if (data.clinic_assignments) {
      db.run(
        `UPDATE clinic_members SET is_active = 0, deleted_at = ? WHERE user_id = ? AND organization_id = ?`,
        [now, userId, orgId]
      );

      for (const assignment of data.clinic_assignments) {
        const existing = db.get(
          `SELECT id FROM clinic_members WHERE user_id = ? AND clinic_id = ?`,
          [userId, assignment.clinic_id]
        );

        if (existing) {
          db.run(
            `UPDATE clinic_members SET role = ?, is_active = 1, deleted_at = NULL WHERE id = ?`,
            [assignment.role, existing.id]
          );
        } else {
          db.run(
            `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [generateId(), userId, assignment.clinic_id, orgId, assignment.role, now]
          );
        }
      }
    }

    return { id: userId, updated: true };
  }

  async deactivateUser(orgId, userId) {
    const user = db.get(
      `SELECT * FROM users WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [userId, orgId]
    );
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const now = new Date().toISOString();
    db.run(`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`, [now, userId]);
    db.run(
      `UPDATE clinic_members SET is_active = 0, deleted_at = ? WHERE user_id = ? AND organization_id = ?`,
      [now, userId, orgId]
    );

    return { id: userId, deactivated: true };
  }

  async getBillingInfo(orgId) {
    const org = db.get(
      `SELECT id, name, plan, plan_status, plan_activated_at FROM organizations WHERE id = ? AND deleted_at IS NULL`,
      [orgId]
    );
    if (!org) throw { statusCode: 404, message: 'Organization not found' };

    const payments = db.all(
      `SELECT * FROM mock_payments WHERE organization_id = ? ORDER BY activated_at DESC`,
      [orgId]
    );

    return { organization: org, payments };
  }
}

module.exports = new OrgService();
