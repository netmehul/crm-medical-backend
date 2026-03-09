require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { generateId } = require('../utils/uuid');
const seedPlans = require('./seedPlans');

const seed = async () => {
  try {
    console.log('🌱 Starting seed...\n');

    const db = require('../config/database');

    // Drop all existing tables for a clean slate
    const [tables] = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = (SELECT DATABASE())
    `, []);

    await db.execute('SET FOREIGN_KEY_CHECKS = 0;', []);
    for (const t of tables) {
      await db.execute(`DROP TABLE IF EXISTS \`${t.TABLE_NAME || t.table_name}\`;`, []);
    }
    await db.execute('SET FOREIGN_KEY_CHECKS = 1;', []);
    console.log('  🗑️  Old tables dropped');

    // Load schema.sql and execute it
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    const queries = schemaSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    for (const query of queries) {
      await db.execute(query, []);
    }
    console.log('  ✅ Schema created');

    // Seed Plans
    await seedPlans();

    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // ─── TIER 1: Platform Admin ─────────────────────────────
    const platformAdminId = generateId();
    await db.execute(
      `INSERT INTO platform_admins (id, full_name, email, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [platformAdminId, 'Platform Admin', 'admin@medicrm.com', passwordHash, now, now]
    );
    console.log('  ✅ Platform admin created');

    // ─── TIER 2: Organization ───────────────────────────────
    const orgId = generateId();
    await db.execute(
      `INSERT INTO organizations (id, name, owner_email, phone, address, plan, plan_status, plan_activated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pro', 'active', ?, ?, ?)`,
      [orgId, 'MediPoint Group', 'owner@demo.com', '+91-9876543210', '123 Health Street, Mumbai, India', now, now, now]
    );
    console.log('  ✅ Organization created');

    // ─── TIER 3: Two Clinic Branches ────────────────────────
    const clinicAhmedabadId = generateId();
    const clinicSuratId = generateId();

    await db.execute(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [clinicAhmedabadId, orgId, 'MediPoint — Ahmedabad', '+91-79-12345678', 'ahmedabad@medipoint.com', 'SG Highway, Ahmedabad', 'Ahmedabad', now, now]
    );
    await db.execute(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [clinicSuratId, orgId, 'MediPoint — Surat', '+91-261-7654321', 'surat@medipoint.com', 'Ring Road, Surat', 'Surat', now, now]
    );
    console.log('  ✅ Clinic branches created (2)');

    // ─── TIER 4: Users + Clinic Members ─────────────────────
    const ownerId = generateId();
    const doctorId = generateId();
    const receptionistId = generateId();

    const userData = [
      [ownerId, orgId, 'Dr. Mehul Bagaria', 'owner@demo.com', passwordHash],
      [doctorId, orgId, 'Dr. Priya Sharma', 'doctor@demo.com', passwordHash],
      [receptionistId, orgId, 'Anita Desai', 'receptionist@demo.com', passwordHash],
    ];
    for (const u of userData) {
      await db.execute(
        `INSERT INTO users (id, organization_id, full_name, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [...u, now, now]
      );
    }

    // Owner → org_admin at BOTH branches
    await db.execute(
      `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'org_admin', 1, ?)`,
      [generateId(), ownerId, clinicAhmedabadId, orgId, now]
    );
    await db.execute(
      `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'org_admin', 1, ?)`,
      [generateId(), ownerId, clinicSuratId, orgId, now]
    );

    // Doctor → org_admin at Ahmedabad only
    await db.execute(
      `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'org_admin', 1, ?)`,
      [generateId(), doctorId, clinicAhmedabadId, orgId, now]
    );

    // Receptionist → receptionist at Ahmedabad only
    await db.execute(
      `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'receptionist', 1, ?)`,
      [generateId(), receptionistId, clinicAhmedabadId, orgId, now]
    );
    console.log('  ✅ Users created (3) with branch assignments');

    // ─── Patients (Ahmedabad branch) ────────────────────────
    const patients = [];
    const patientNames = [
      { name: 'Riya Mehta', dob: '1990-05-14', gender: 'female', blood: 'B+', phone: '+91-9001000001' },
      { name: 'Arjun Patel', dob: '1985-11-22', gender: 'male', blood: 'O+', phone: '+91-9001000002' },
      { name: 'Sneha Kapoor', dob: '1995-03-08', gender: 'female', blood: 'A+', phone: '+91-9001000003' },
      { name: 'Vikram Singh', dob: '1978-07-30', gender: 'male', blood: 'AB-', phone: '+91-9001000004' },
      { name: 'Pooja Nair', dob: '2000-01-15', gender: 'female', blood: 'O-', phone: '+91-9001000005' },
      { name: 'Rahul Verma', dob: '1988-09-12', gender: 'male', blood: 'A-', phone: '+91-9001000006' },
      { name: 'Kavita Reddy', dob: '1992-12-25', gender: 'female', blood: 'B-', phone: '+91-9001000007' },
      { name: 'Amit Joshi', dob: '1975-04-03', gender: 'male', blood: 'AB+', phone: '+91-9001000008' },
      { name: 'Divya Gupta', dob: '1998-06-20', gender: 'female', blood: 'O+', phone: '+91-9001000009' },
      { name: 'Suresh Kumar', dob: '1982-10-10', gender: 'male', blood: 'B+', phone: '+91-9001000010' },
    ];

    for (let i = 0; i < patientNames.length; i++) {
      const p = patientNames[i];
      const patientId = generateId();
      const fileId = generateId();
      const code = `PAT-${String(i + 1).padStart(4, '0')}`;
      const fileNum = `FILE-2026-${String(i + 1).padStart(4, '0')}`;

      await db.execute(
        `INSERT INTO patients (id, clinic_id, patient_code, full_name, date_of_birth, gender, blood_group, phone, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, clinicAhmedabadId, code, p.name, p.dob, p.gender, p.blood, p.phone, ownerId, now, now]
      );

      await db.execute(
        `INSERT INTO patient_files (id, clinic_id, patient_id, file_number, assigned_doctor, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [fileId, clinicAhmedabadId, patientId, fileNum, doctorId, now, now]
      );

      patients.push({ id: patientId, fileId, name: p.name });
    }

    // 3 patients for Surat branch
    for (let i = 0; i < 3; i++) {
      const names = ['Neha Tiwari', 'Raj Malhotra', 'Simran Kaur'];
      const patientId = generateId();
      const fileId = generateId();

      await db.execute(
        `INSERT INTO patients (id, clinic_id, patient_code, full_name, gender, phone, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, clinicSuratId, `PAT-${String(i + 1).padStart(4, '0')}`, names[i], i === 2 ? 'female' : 'male', `+91-900200000${i + 1}`, ownerId, now, now]
      );
      await db.execute(
        `INSERT INTO patient_files (id, clinic_id, patient_id, file_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [fileId, clinicSuratId, patientId, `FILE-2026-${String(i + 1).padStart(4, '0')}`, now, now]
      );
    }
    console.log('  ✅ Patients created (13 total) with files');

    // ─── Appointments ───────────────────────────────────────
    const today = new Date();
    const appointmentTypes = ['general', 'follow_up', 'procedure', 'general', 'follow_up'];

    for (let i = 0; i < 5; i++) {
      const aptDate = new Date(today);
      aptDate.setDate(aptDate.getDate() + i);
      aptDate.setHours(9 + i, 0, 0, 0);
      const scheduledAtStr = aptDate.toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, file_id, scheduled_at, type, status, reason, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(), clinicAhmedabadId, patients[i].id, doctorId, patients[i].fileId,
          scheduledAtStr, appointmentTypes[i],
          i < 2 ? 'completed' : 'scheduled',
          `Consultation for ${patients[i].name}`,
          receptionistId, now, now,
        ]
      );
    }
    console.log('  ✅ Appointments created (5)');

    // ─── Prescriptions ──────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      const rxId = generateId();
      const rxDate = new Date(today);
      rxDate.setDate(rxDate.getDate() - i);

      await db.execute(
        `INSERT INTO prescriptions (id, clinic_id, patient_id, file_id, doctor_id, visit_date, diagnosis, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'finalized', ?, ?)`,
        [rxId, clinicAhmedabadId, patients[i].id, patients[i].fileId, doctorId,
          rxDate.toISOString().split('T')[0], `Diagnosis for ${patients[i].name}`, now, now]
      );

      const meds = [
        { drug: 'Amoxicillin 500mg', dosage: '500mg', freq: 'Twice daily', duration: '7 days', instr: 'After food', qty: '14' },
        { drug: 'Paracetamol 650mg', dosage: '650mg', freq: 'As needed', duration: '5 days', instr: 'Max 3/day', qty: '15' },
      ];
      for (let j = 0; j < meds.length; j++) {
        const m = meds[j];
        await db.execute(
          `INSERT INTO prescription_medications (id, prescription_id, drug_name, dosage, frequency, duration, instructions, quantity, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), rxId, m.drug, m.dosage, m.freq, m.duration, m.instr, m.qty, j]
        );
      }
    }
    console.log('  ✅ Prescriptions created (3) with medications');

    // ─── Patient Notes ──────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      await db.execute(
        `INSERT INTO patient_notes (id, clinic_id, patient_id, file_id, note_type, title, content, visit_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'visit_note', ?, ?, ?, ?, ?, ?)`,
        [
          generateId(), clinicAhmedabadId, patients[i].id, patients[i].fileId,
          `Visit Note — ${patients[i].name}`,
          'Patient presented with symptoms. Examination completed. Follow-up recommended in 2 weeks.',
          today.toISOString().split('T')[0], doctorId, now, now,
        ]
      );
    }
    console.log('  ✅ Patient notes created (3)');

    // ─── Billing ────────────────────────────────────────────
    for (let i = 0; i < 2; i++) {
      await db.execute(
        `INSERT INTO patient_billing
           (id, clinic_id, patient_id, file_id, invoice_number, invoice_date,
            subtotal, tax_percent, tax_amount, discount_amount, total_amount,
            payment_status, paid_amount, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(), clinicAhmedabadId, patients[i].id, patients[i].fileId,
          `INV-2026-${String(i + 1).padStart(4, '0')}`,
          today.toISOString().split('T')[0],
          500, 18, 90, 0, 590,
          i === 0 ? 'paid' : 'sent', i === 0 ? 590 : 0,
          ownerId, now, now,
        ]
      );
    }
    console.log('  ✅ Invoices created (2)');

    // ─── Inventory ──────────────────────────────────────────
    const inventoryItems = [
      { name: 'Amoxicillin 500mg', cat: 'medicine', qty: 200, unit: 'tablets', threshold: 50 },
      { name: 'Paracetamol 650mg', cat: 'medicine', qty: 500, unit: 'tablets', threshold: 100 },
      { name: 'Surgical Gloves (L)', cat: 'consumable', qty: 80, unit: 'pairs', threshold: 20 },
      { name: 'Digital Thermometer', cat: 'equipment', qty: 5, unit: 'units', threshold: 2 },
      { name: 'Bandage Roll 4 inch', cat: 'consumable', qty: 8, unit: 'rolls', threshold: 10 },
      { name: 'Ibuprofen 400mg', cat: 'medicine', qty: 150, unit: 'tablets', threshold: 30 },
    ];
    for (const item of inventoryItems) {
      await db.execute(
        `INSERT INTO inventory (id, clinic_id, item_name, category, quantity, unit, low_stock_threshold, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), clinicAhmedabadId, item.name, item.cat, item.qty, item.unit, item.threshold, now, now]
      );
    }
    console.log('  ✅ Inventory items created (6)');

    // ─── Medical Reps ───────────────────────────────────────
    const mrData = [
      { name: 'Rajesh Pillai', company: 'Sun Pharma', phone: '+91-9801000001', email: 'rajesh@sunpharma.com' },
      { name: 'Neha Agarwal', company: 'Cipla Ltd', phone: '+91-9801000002', email: 'neha@cipla.com' },
      { name: 'Deepak Malhotra', company: "Dr. Reddy's", phone: '+91-9801000003', email: 'deepak@drreddy.com' },
    ];
    for (const mr of mrData) {
      const mrId = generateId();
      await db.execute(
        `INSERT INTO medical_reps (id, clinic_id, full_name, company, phone, email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mrId, clinicAhmedabadId, mr.name, mr.company, mr.phone, mr.email, now, now]
      );
      await db.execute(
        `INSERT INTO mr_visits (id, clinic_id, mr_id, visit_date, purpose, notes, logged_by, created_at)
         VALUES (?, ?, ?, ?, 'product_presentation', ?, ?, ?)`,
        [generateId(), clinicAhmedabadId, mrId, today.toISOString().split('T')[0], `Visit from ${mr.name}`, receptionistId, now]
      );
    }
    console.log('  ✅ Medical reps created (3) with visits');

    // ─── Second Organization (Free plan) ────────────────────
    const org2Id = generateId();
    const clinic2Id = generateId();
    const owner2Id = generateId();

    await db.execute(
      `INSERT INTO organizations (id, name, owner_email, plan, plan_status, created_at, updated_at)
       VALUES (?, ?, ?, 'free', 'active', ?, ?)`,
      [org2Id, 'City Clinic', 'cityclinic@demo.com', now, now]
    );
    await db.execute(
      `INSERT INTO clinics (id, organization_id, name, city, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [clinic2Id, org2Id, 'City Clinic — Main', 'Pune', now, now]
    );
    await db.execute(
      `INSERT INTO users (id, organization_id, full_name, email, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [owner2Id, org2Id, 'Dr. Arun Patil', 'cityclinic@demo.com', passwordHash, now, now]
    );
    await db.execute(
      `INSERT INTO clinic_members (id, user_id, clinic_id, organization_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'org_admin', 1, ?)`,
      [generateId(), owner2Id, clinic2Id, org2Id, now]
    );
    console.log('  ✅ Second org created (City Clinic — Free plan)');

    console.log('\n🎉 Seed completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
};

seed();
