const BaseRepository = require('./BaseRepository');

class MedicalRepRepository extends BaseRepository {
  constructor() {
    super('medical_reps');
  }

  search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR company LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, like, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR company LIKE ?)`,
      [clinicId, like, like]
    );
    return { rows, total };
  }

  findWithVisits(id, clinicId) {
    const rep = this.findById(id, clinicId);
    return rep;
  }
}

module.exports = new MedicalRepRepository();
