const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class WhatsAppService {

  _buildMessage(referral, patient, lab, clinic, tests) {
    const testList = tests.map((t, i) => `${i + 1}. ${t.test_name}`).join('\n');
    const date = new Date(referral.referral_date).toLocaleDateString('en-IN');

    return `*Medical Referral \u2014 ${clinic.name}*

Dear ${lab.contact_person || 'Team'},

Please be informed that the following patient has been referred to your facility.

*Patient Details:*
Name: ${patient.full_name}
ID: ${patient.patient_code || '\u2014'}
Age/Gender: ${patient.age || '\u2014'} yrs / ${patient.gender || '\u2014'}
Phone: ${patient.phone || '\u2014'}

*Reference No:* ${referral.reference_number}
*Date:* ${date}
*Priority:* ${referral.urgency.toUpperCase()}

*Tests Required:*
${testList}
${referral.clinical_notes ? `\n*Clinical Notes:*\n${referral.clinical_notes}\n` : ''}${referral.special_instructions ? `\n*Special Instructions:*\n${referral.special_instructions}\n` : ''}
Please find the detailed referral letter attached to the email sent to ${lab.email || 'your registered email'}.

For queries: ${clinic.phone || clinic.email || ''}

*\u2014 Dr. ${referral.doctor_name || ''}*
*${clinic.name}*`;
  }

  _generateDeepLink(phone, message) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  async prepareWhatsApp(referralId, sentByUserId, phoneOverride = null) {
    const [referralRows] = await db.execute(
      `SELECT r.*, p.full_name AS patient_name, p.patient_code, p.age, p.gender, p.phone AS patient_phone,
              l.name AS lab_name, l.contact_person AS lab_contact, l.email AS lab_email,
              l.phone AS lab_phone, l.whatsapp_number AS lab_whatsapp,
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

    const [clinicRows] = await db.execute(`SELECT * FROM clinics WHERE id = ?`, [referral.clinic_id]);
    const clinic = clinicRows[0];
    const [testRows] = await db.execute(
      `SELECT * FROM referral_tests WHERE referral_id = ? ORDER BY sort_order ASC`, [referralId]
    );

    const phone = phoneOverride || referral.lab_whatsapp || referral.lab_phone;
    if (!phone) throw { statusCode: 400, message: 'Lab has no WhatsApp/phone number on record' };

    const patient = { full_name: referral.patient_name, patient_code: referral.patient_code, age: referral.age, gender: referral.gender, phone: referral.patient_phone };
    const lab = { name: referral.lab_name, contact_person: referral.lab_contact, email: referral.lab_email };
    const message = this._buildMessage(referral, patient, lab, clinic, testRows);
    const deepLink = this._generateDeepLink(phone, message);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_to, sent_by, status, sent_at)
         VALUES (?, ?, 'whatsapp', ?, ?, 'sent', CURRENT_TIMESTAMP)`,
        [generateId(), referralId, phone, sentByUserId]
      );

      await conn.execute(
        `UPDATE lab_referrals SET whatsapp_sent_at = CURRENT_TIMESTAMP, whatsapp_sent_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [phone, referralId]
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return { deepLink, phone, message };
  }
}

module.exports = new WhatsAppService();
