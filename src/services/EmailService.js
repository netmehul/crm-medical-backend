const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class EmailService {

  async sendReferralLetter(referralId, sentByUserId, emailOverride = null) {
    const [referralRows] = await db.execute(
      `SELECT r.*, p.full_name AS patient_name, p.patient_code,
              l.name AS lab_name, l.contact_person AS lab_contact, l.email AS lab_email,
              u.full_name AS doctor_name
       FROM lab_referrals r
       JOIN patients p ON p.id = r.patient_id
       JOIN external_labs l ON l.id = r.lab_id
       JOIN users u ON u.id = r.referred_by
       WHERE r.id = ?`,
      [referralId]
    );
    const referral = referralRows[0];

    if (!referral) throw { statusCode: 404, message: 'Referral not found' };
    if (!referral.letter_path) throw { statusCode: 400, message: 'Generate the letter first before sending' };

    const [clinicRows] = await db.execute(`SELECT * FROM clinics WHERE id = ?`, [referral.clinic_id]);
    const toEmail = emailOverride || referral.lab_email;
    if (!toEmail) throw { statusCode: 400, message: 'Lab has no email address on record' };

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // In local/dev mode, we simulate a successful send
      console.log(`\u2709\uFE0F  [EMAIL MOCK] Referral letter for ${referral.patient_name} sent to ${toEmail}`);
      console.log(`   Ref: ${referral.reference_number} | Lab: ${referral.lab_name} | Doctor: Dr. ${referral.doctor_name}`);

      await conn.execute(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_to, sent_by, status, sent_at)
         VALUES (?, ?, 'email', ?, ?, 'sent', CURRENT_TIMESTAMP)`,
        [generateId(), referralId, toEmail, sentByUserId]
      );

      await conn.execute(
        `UPDATE lab_referrals SET email_sent_at = CURRENT_TIMESTAMP, email_sent_to = ?, status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [toEmail, referralId]
      );

      await conn.commit();
      return { success: true, sentTo: toEmail, mock: true };
    } catch (err) {
      await conn.rollback();

      await db.execute(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_to, status, error_message, sent_at)
         VALUES (?, ?, 'email', ?, 'failed', ?, CURRENT_TIMESTAMP)`,
        [generateId(), referralId, toEmail, err.message]
      );
      throw { statusCode: 500, message: `Email failed: ${err.message}` };
    } finally {
      conn.release();
    }
  }
}

module.exports = new EmailService();
