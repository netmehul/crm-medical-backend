const path = require('path');
const fs   = require('fs');
const db   = require('../config/database');

class LetterService {

  _buildLetterHTML(referral, clinic, patient, lab, doctor, tests) {
    const date = new Date(referral.referral_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const testRows = tests.map((t, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td>${t.test_name}${t.test_code ? ` (${t.test_code})` : ''}</td>
        <td>${t.instructions || '\u2014'}</td>
      </tr>`
    ).join('');

    const urgencyBadge = {
      routine:   { label: 'Routine',   color: '#059669' },
      urgent:    { label: 'Urgent',    color: '#D97706' },
      emergency: { label: 'Emergency', color: '#DC2626' },
    }[referral.urgency] || { label: 'Routine', color: '#059669' };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: white; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding: 32px 40px 24px; border-bottom: 3px solid #059669; background: linear-gradient(135deg, #f0fdf4, #ffffff); }
    .clinic-name { font-size: 22px; font-weight: 700; color: #059669; letter-spacing: -0.3px; }
    .clinic-details { font-size: 11px; color: #6b7280; margin-top: 4px; line-height: 1.6; }
    .ref-block { text-align: right; font-size: 11px; color: #6b7280; }
    .ref-number { font-size: 13px; font-weight: 600; color: #1a1a2e; font-family: 'Courier New', monospace; }
    .body { padding: 32px 40px; }
    .letter-title { font-size: 16px; font-weight: 700; text-align: center; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 28px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    .address-row { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .address-block { width: 48%; }
    .block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #059669; margin-bottom: 4px; }
    .block-content { font-size: 12px; line-height: 1.6; color: #374151; }
    .block-content strong { color: #1a1a2e; font-size: 13px; }
    .patient-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #059669; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
    .patient-box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #059669; margin-bottom: 10px; }
    .patient-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .patient-field label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
    .patient-field span { font-size: 12px; font-weight: 600; color: #1a1a2e; }
    .urgency-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: white; background: ${urgencyBadge.color}; margin-bottom: 16px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #374151; margin-bottom: 10px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #059669; color: white; }
    thead th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .notes-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; }
    .notes-box .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 6px; }
    .notes-box p { font-size: 12px; line-height: 1.6; color: #374151; }
    .signature-section { margin-top: 32px; display: flex; justify-content: flex-end; }
    .signature-block { text-align: center; width: 200px; }
    .signature-line { border-bottom: 1px solid #1a1a2e; margin-bottom: 6px; height: 40px; }
    .signature-name { font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .signature-title { font-size: 11px; color: #6b7280; }
    .footer { margin-top: 40px; padding: 16px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .footer-text { font-size: 10px; color: #9ca3af; }
    .footer-ref { font-size: 10px; color: #9ca3af; font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="letterhead">
    <div>
      <div class="clinic-name">${clinic.name || ''}</div>
      <div class="clinic-details">
        ${clinic.address || ''}<br>
        ${clinic.phone ? `Tel: ${clinic.phone}` : ''}${clinic.email ? ` &middot; ${clinic.email}` : ''}
      </div>
    </div>
    <div class="ref-block">
      <div>Reference No.</div>
      <div class="ref-number">${referral.reference_number}</div>
      <div style="margin-top:6px">Date: ${date}</div>
    </div>
  </div>
  <div class="body">
    <div class="letter-title">Medical Referral Letter</div>
    <div class="address-row">
      <div class="address-block">
        <div class="block-label">To</div>
        <div class="block-content">
          <strong>${lab.name}</strong><br>
          ${lab.contact_person ? `Attn: ${lab.contact_person}<br>` : ''}
          ${lab.address || ''}<br>
          ${lab.city || ''}${lab.pincode ? ` - ${lab.pincode}` : ''}
        </div>
      </div>
      <div class="address-block" style="text-align:right">
        <div class="block-label">Referred By</div>
        <div class="block-content">
          <strong>Dr. ${doctor.full_name}</strong><br>
          ${clinic.name || ''}
        </div>
      </div>
    </div>
    <div class="patient-box">
      <div class="patient-box-title">Patient Information</div>
      <div class="patient-grid">
        <div class="patient-field"><label>Full Name</label><span>${patient.full_name}</span></div>
        <div class="patient-field"><label>Patient ID</label><span>${patient.patient_code || patient.id.slice(0, 8).toUpperCase()}</span></div>
        <div class="patient-field"><label>Age / Gender</label><span>${patient.age || '\u2014'} yrs / ${patient.gender || '\u2014'}</span></div>
        <div class="patient-field"><label>Phone</label><span>${patient.phone || '\u2014'}</span></div>
        <div class="patient-field"><label>Blood Group</label><span>${patient.blood_group || '\u2014'}</span></div>
        <div class="patient-field"><label>Allergies</label><span>${patient.allergies || 'None known'}</span></div>
      </div>
    </div>
    <div class="urgency-badge">Priority: ${urgencyBadge.label}</div>
    <div class="section-title">Tests / Investigations Required</div>
    <table>
      <thead><tr><th style="width:40px">#</th><th>Test / Investigation</th><th>Special Instructions</th></tr></thead>
      <tbody>${testRows}</tbody>
    </table>
    ${referral.clinical_notes ? `<div class="notes-box"><div class="label">Clinical Notes / History</div><p>${referral.clinical_notes}</p></div>` : ''}
    ${referral.special_instructions ? `<div class="notes-box" style="background:#f0f9ff;border-color:#7dd3fc;"><div class="label" style="color:#075985">Special Instructions</div><p>${referral.special_instructions}</p></div>` : ''}
    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">Dr. ${doctor.full_name}</div>
        <div class="signature-title">${clinic.name || ''}</div>
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-text">This referral is valid for 30 days from the date of issue. For queries contact: ${clinic.phone || clinic.email || ''}</div>
    <div class="footer-ref">${referral.reference_number}</div>
  </div>
</body>
</html>`;
  }

  async generateReferralLetter(referralId) {
    const referral = db.get(
      `SELECT * FROM lab_referrals WHERE id = ?`, [referralId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    const patient = db.get(`SELECT * FROM patients WHERE id = ?`, [referral.patient_id]);
    const lab     = db.get(`SELECT * FROM external_labs WHERE id = ?`, [referral.lab_id]);
    const doctor  = db.get(`SELECT * FROM users WHERE id = ?`, [referral.referred_by]);
    const clinic  = db.get(`SELECT * FROM clinics WHERE id = ?`, [referral.clinic_id]);
    const tests   = db.all(
      `SELECT * FROM referral_tests WHERE referral_id = ? ORDER BY sort_order ASC`, [referralId]
    );

    const html = this._buildLetterHTML(referral, clinic || {}, patient, lab, doctor, tests);

    const uploadDir = path.join(__dirname, '../../public/uploads', `clinic_${referral.clinic_id}`, 'referrals');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName   = `referral_${referral.reference_number.replace(/\//g, '-')}.html`;
    const outputPath = path.join(uploadDir, fileName);

    fs.writeFileSync(outputPath, html, 'utf-8');

    db.run(
      `UPDATE lab_referrals SET letter_path = ?, letter_generated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [outputPath, referralId]
    );

    return {
      path: outputPath,
      fileName,
      url: `/uploads/clinic_${referral.clinic_id}/referrals/${fileName}`,
      html
    };
  }
}

module.exports = new LetterService();
