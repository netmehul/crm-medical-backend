const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class LabService {

  async getLabs(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'clinic_id = ? AND deleted_at IS NULL';
    const params = [clinicId];

    if (query.search) {
      where += ' AND (name LIKE ? OR city LIKE ? OR contact_person LIKE ?)';
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }

    if (query.type && query.type !== 'all') {
      where += ' AND type = ?';
      params.push(query.type);
    }

    if (query.active !== undefined) {
      where += ' AND is_active = ?';
      params.push(query.active === 'true' ? 1 : 0);
    }

    const [rows] = await db.execute(
      `SELECT * FROM external_labs WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM external_labs WHERE ${where}`,
      params
    );

    const enriched = [];
    for (const lab of rows) {
      const [referralCountRows] = await db.execute(
        `SELECT COUNT(*) AS count FROM lab_referrals WHERE lab_id = ? AND deleted_at IS NULL`,
        [lab.id]
      );
      enriched.push({ ...lab, referral_count: referralCountRows[0].count });
    }

    return paginatedResponse(enriched, countRows[0].total, page, limit);
  }

  async getLab(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT * FROM external_labs WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    const lab = rows[0];
    if (!lab) throw { statusCode: 404, message: 'Lab not found' };

    const [referralCountRows] = await db.execute(
      `SELECT COUNT(*) AS count FROM lab_referrals WHERE lab_id = ? AND deleted_at IS NULL`,
      [id]
    );

    return { ...lab, referral_count: referralCountRows[0].count };
  }

  async createLab(clinicId, data) {
    const id = generateId();
    await db.execute(
      `INSERT INTO external_labs (id, clinic_id, name, type, contact_person, phone, whatsapp_number, email, address, city, pincode, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clinicId, data.name, data.type || 'lab', data.contact_person || null,
        data.phone || null, data.whatsapp_number || null, data.email || null,
        data.address || null, data.city || null, data.pincode || null, data.notes || null]
    );
    return await this.getLab(id, clinicId);
  }

  async updateLab(id, clinicId, data) {
    const [existingRows] = await db.execute(
      `SELECT id FROM external_labs WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!existingRows.length) throw { statusCode: 404, message: 'Lab not found' };

    await db.execute(
      `UPDATE external_labs SET
        name = ?, type = ?, contact_person = ?, phone = ?, whatsapp_number = ?,
        email = ?, address = ?, city = ?, pincode = ?, notes = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ?`,
      [data.name, data.type || 'lab', data.contact_person || null,
      data.phone || null, data.whatsapp_number || null, data.email || null,
      data.address || null, data.city || null, data.pincode || null,
      data.notes || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        id, clinicId]
    );
    return await this.getLab(id, clinicId);
  }

  async deleteLab(id, clinicId) {
    const [existingRows] = await db.execute(
      `SELECT id FROM external_labs WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!existingRows.length) throw { statusCode: 404, message: 'Lab not found' };

    await db.execute(
      `UPDATE external_labs SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return { id };
  }

  async getAllActive(clinicId) {
    const [rows] = await db.execute(
      `SELECT id, name, type, contact_person, phone, whatsapp_number, email, city
       FROM external_labs WHERE clinic_id = ? AND is_active = 1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [clinicId]
    );
    return rows;
  }
}

module.exports = new LabService();
