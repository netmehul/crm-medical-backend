const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const PlanService = require('./PlanService');

class AuthService {
  _generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  _sanitizeUser(user) {
    return { id: user.id, full_name: user.full_name, email: user.email };
  }

  async signup(orgName, branchName, ownerEmail, fullName, password, phone, address) {
    const existing = db.get(
      `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, [ownerEmail]
    );
    if (existing) throw { statusCode: 409, message: 'Email already registered' };

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const orgId    = generateId();
    const clinicId = generateId();
    const userId   = generateId();
    const memberId = generateId();

    const txn = db.transaction(() => {
      db.run(
        `INSERT INTO organizations (id, name, owner_email, phone, address, plan, plan_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'free', 'active', ?, ?)`,
        [orgId, orgName, ownerEmail, phone || null, address || null, now, now]
      );

      db.run(
        `INSERT INTO clinics (id, organization_id, name, phone, address, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [clinicId, orgId, branchName || orgName, phone || null, address || null, now, now]
      );

      db.run(
        `INSERT INTO users (id, organization_id, full_name, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [userId, orgId, fullName, ownerEmail, hashedPassword, now, now]
      );

      db.run(
        `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
         VALUES (?, ?, ?, ?, 'org_admin', 1, ?)`,
        [memberId, userId, clinicId, orgId, now]
      );
    });
    txn();

    const token = this._generateToken({
      tier:     'app',
      userId,
      orgId,
      clinicId,
      role:     'org_admin',
      plan:     'free',
    });

    const planConfig = PlanService.getPlanConfig('free') || { modules: {}, limits: {} };
    return {
      token,
      user:   { id: userId, full_name: fullName, email: ownerEmail, role: 'org_admin' },
      clinic: { id: clinicId, name: branchName || orgName, plan: 'free', planModules: planConfig.modules || {} },
    };
  }

  async login(email, password) {
    // Step 1: check platform_admins
    const admin = db.get(
      `SELECT * FROM platform_admins WHERE email = ? AND deleted_at IS NULL AND is_active = 1`,
      [email]
    );

    if (admin) {
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) throw { statusCode: 401, message: 'Invalid email or password' };

      const token = this._generateToken({
        tier:    'platform',
        adminId: admin.id,
        email:   admin.email,
      });

      return {
        tier:  'platform',
        token,
        user:  { id: admin.id, full_name: admin.full_name, email: admin.email },
        redirect: '/admin',
      };
    }

    // Step 2: check app users
    const user = db.get(
      `SELECT u.*, o.name AS org_name, o.plan, o.plan_status
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = ? AND u.deleted_at IS NULL AND u.is_active = 1`,
      [email]
    );

    if (!user) throw { statusCode: 401, message: 'Invalid email or password' };
    if (user.plan_status === 'suspended') {
      throw { statusCode: 403, message: 'Your organization has been suspended. Contact support.' };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw { statusCode: 401, message: 'Invalid email or password' };

    // Get user's active branches
    const branches = db.all(
      `SELECT cm.id AS member_id, cm.role, cm.clinic_id,
              c.name AS clinic_name, c.city, c.is_active
       FROM clinic_members cm
       JOIN clinics c ON c.id = cm.clinic_id AND c.deleted_at IS NULL
       WHERE cm.user_id = ? AND cm.is_active = 1 AND cm.deleted_at IS NULL AND c.is_active = 1`,
      [user.id]
    );

    if (branches.length === 0) {
      throw { statusCode: 403, message: 'No active branch assignments found' };
    }

    if (branches.length === 1) {
      const branch = branches[0];
      const token = this._generateToken({
        tier:     'app',
        userId:   user.id,
        orgId:    user.organization_id,
        clinicId: branch.clinic_id,
        role:     branch.role,
        plan:     user.plan,
      });

      const planConfig = PlanService.getPlanConfig(user.plan) || { modules: {}, limits: {} };
      return {
        tier:     'app',
        token,
        user:     { id: user.id, full_name: user.full_name, email: user.email, role: branch.role },
        clinic:   { id: branch.clinic_id, name: branch.clinic_name, plan: user.plan, planModules: planConfig.modules || {} },
        redirect: '/app/dashboard',
      };
    }

    // Multiple branches — issue a partial token (no clinicId yet)
    const token = this._generateToken({
      tier:   'app',
      userId: user.id,
      orgId:  user.organization_id,
      plan:   user.plan,
    });

    return {
      tier:     'app',
      token,
      user:     { id: user.id, full_name: user.full_name, email: user.email },
      branches: branches.map(b => ({
        clinicId:   b.clinic_id,
        clinicName: b.clinic_name,
        city:       b.city,
        role:       b.role,
      })),
      redirect: '/app/branch-select',
    };
  }

  async branchSelect(userId, clinicId) {
    const member = db.get(
      `SELECT cm.*, c.name AS clinic_name, o.plan, o.plan_status
       FROM clinic_members cm
       JOIN clinics c ON c.id = cm.clinic_id AND c.deleted_at IS NULL
       JOIN organizations o ON o.id = cm.organization_id
       WHERE cm.user_id = ? AND cm.clinic_id = ? AND cm.is_active = 1 AND cm.deleted_at IS NULL`,
      [userId, clinicId]
    );

    if (!member) throw { statusCode: 403, message: 'You are not assigned to this branch' };
    if (member.plan_status === 'suspended') {
      throw { statusCode: 403, message: 'Your organization has been suspended.' };
    }

    const user = db.get(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`, [userId]);

    const token = this._generateToken({
      tier:     'app',
      userId:   user.id,
      orgId:    user.organization_id,
      clinicId: member.clinic_id,
      role:     member.role,
      plan:     member.plan,
    });

    const planConfig = PlanService.getPlanConfig(member.plan) || { modules: {}, limits: {} };
    return {
      token,
      user:   { id: user.id, full_name: user.full_name, email: user.email, role: member.role },
      clinic: { id: member.clinic_id, name: member.clinic_name, plan: member.plan, planModules: planConfig.modules || {} },
    };
  }

  async getMe(userId) {
    const user = db.get(
      `SELECT u.id, u.full_name, u.email, u.organization_id, o.name AS org_name, o.plan
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [userId]
    );
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const branches = db.all(
      `SELECT cm.role, cm.clinic_id, c.name AS clinic_name, c.city
       FROM clinic_members cm
       JOIN clinics c ON c.id = cm.clinic_id AND c.deleted_at IS NULL
       WHERE cm.user_id = ? AND cm.is_active = 1 AND cm.deleted_at IS NULL`,
      [userId]
    );

    return {
      user: this._sanitizeUser(user),
      organization: { id: user.organization_id, name: user.org_name, plan: user.plan },
      branches,
    };
  }

  async getMeWithContext(userId, clinicId, role) {
    const user = db.get(
      `SELECT u.id, u.full_name, u.email, u.organization_id, o.name AS org_name, o.plan
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [userId]
    );
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const clinic = clinicId ? db.get(
      `SELECT id, name, phone, address, city FROM clinics WHERE id = ? AND deleted_at IS NULL`,
      [clinicId]
    ) : null;

    const planConfig = user.plan ? (PlanService.getPlanConfig(user.plan) || { modules: {}, limits: {} }) : { modules: {} };
    return {
      user: { ...this._sanitizeUser(user), role },
      clinic: clinic ? { id: clinic.id, name: clinic.name, plan: user.plan, planModules: planConfig.modules || {} } : null,
    };
  }

  async inviteUser(orgId, clinicId, inviterRole, { email, full_name, password, role, clinic_ids }) {
    if (inviterRole !== 'org_admin') {
      throw { statusCode: 403, message: 'Only org admins can invite users' };
    }

    const existing = db.get(`SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, [email]);
    if (existing) throw { statusCode: 409, message: 'Email already registered' };

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();
    const now = new Date().toISOString();

    const targetClinics = clinic_ids || [clinicId];

    const txn = db.transaction(() => {
      db.run(
        `INSERT INTO users (id, organization_id, full_name, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [userId, orgId, full_name, email, hashedPassword, now, now]
      );

      for (const cId of targetClinics) {
        db.run(
          `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [generateId(), userId, cId, orgId, role || 'receptionist', now]
        );
      }
    });
    txn();

    return { id: userId, full_name, email, role: role || 'receptionist' };
  }
}

module.exports = new AuthService();
