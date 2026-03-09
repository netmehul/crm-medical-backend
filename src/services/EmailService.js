const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class EmailService {

  async sendReferralLetter(referralId, sentByUserId, emailOverride = null) {
    const referral = db.get(
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

    if (!referral) throw { statusCode: 404, message: 'Referral not found' };
    if (!referral.letter_path) throw { statusCode: 400, message: 'Generate the letter first before sending' };

    const clinic  = db.get(`SELECT * FROM clinics WHERE id = ?`, [referral.clinic_id]);
    const toEmail = emailOverride || referral.lab_email;
    if (!toEmail) throw { statusCode: 400, message: 'Lab has no email address on record' };

    try {
      // In local/dev mode, we simulate a successful send
      console.log(`\u2709\uFE0F  [EMAIL MOCK] Referral letter for ${referral.patient_name} sent to ${toEmail}`);
      console.log(`   Ref: ${referral.reference_number} | Lab: ${referral.lab_name} | Doctor: Dr. ${referral.doctor_name}`);

      db.run(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_to, sent_by, status, sent_at)
         VALUES (?, ?, 'email', ?, ?, 'sent', datetime('now'))`,
        [generateId(), referralId, toEmail, sentByUserId]
      );

      db.run(
        `UPDATE lab_referrals SET email_sent_at = datetime('now'), email_sent_to = ?, status = 'sent', updated_at = datetime('now') WHERE id = ?`,
        [toEmail, referralId]
      );

      return { success: true, sentTo: toEmail, mock: true };
    } catch (err) {
      db.run(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_to, status, error_message, sent_at)
         VALUES (?, ?, 'email', ?, 'failed', ?, datetime('now'))`,
        [generateId(), referralId, toEmail, err.message]
      );
      throw { statusCode: 500, message: `Email failed: ${err.message}` };
    }
  }
}

module.exports = new EmailService();
