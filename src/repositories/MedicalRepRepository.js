const BaseRepository = require('./BaseRepository');

class MedicalRepRepository extends BaseRepository {
  constructor() {
    super('medical_reps');
  }

  async search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR company LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, like, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR company LIKE ?)`,
      [clinicId, like, like]
    );

    return { rows, total: countRows[0].total };
  }

  async findWithVisits(id, clinicId) {
    const rep = await this.findById(id, clinicId);
    return rep;
  }
}

module.exports = new MedicalRepRepository();
