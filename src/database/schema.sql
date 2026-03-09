-- MediCRM SQLite Schema — 4-Tier Architecture
-- All IDs are TEXT (UUID). All tables use deleted_at for soft delete.

-- ─────────────────────────────────────────
-- TIER 1: PLATFORM ADMINS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  id            TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     INTEGER DEFAULT 1,
  deleted_at    TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- TIER 2: ORGANIZATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  owner_email       TEXT NOT NULL UNIQUE,
  phone             TEXT,
  address           TEXT,
  plan              TEXT DEFAULT 'free',
  plan_status       TEXT DEFAULT 'active',
  plan_activated_at TEXT,
  mock_customer_id  TEXT,
  deleted_at        TEXT DEFAULT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- TIER 3: CLINICS / BRANCHES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  is_active       INTEGER DEFAULT 1,
  deleted_at      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ─────────────────────────────────────────
-- TIER 4: USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  is_active       INTEGER DEFAULT 1,
  deleted_at      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Maps users to clinic branches with their role at each branch
CREATE TABLE IF NOT EXISTS clinic_members (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  clinic_id       TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role            TEXT NOT NULL,
  is_active       INTEGER DEFAULT 1,
  deleted_at      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)         REFERENCES users(id),
  FOREIGN KEY (clinic_id)       REFERENCES clinics(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  UNIQUE(user_id, clinic_id)
);

-- ─────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL,
  patient_code       TEXT,
  full_name          TEXT NOT NULL,
  date_of_birth      TEXT,
  age                INTEGER,
  gender             TEXT,
  blood_group        TEXT,
  phone              TEXT,
  email              TEXT,
  address            TEXT,
  allergies          TEXT,
  chronic_conditions TEXT,
  created_by         TEXT,
  deleted_at         TEXT DEFAULT NULL,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PATIENT FILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_files (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL,
  patient_id         TEXT NOT NULL UNIQUE,
  file_number        TEXT,
  assigned_doctor    TEXT,
  status             TEXT DEFAULT 'active',
  last_visit_at      TEXT,
  next_followup_at   TEXT,
  deleted_at         TEXT DEFAULT NULL,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ─────────────────────────────────────────
-- PATIENT REPORTS (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_reports (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  file_id      TEXT NOT NULL,
  report_name  TEXT NOT NULL,
  report_type  TEXT DEFAULT 'other',
  file_path    TEXT,
  file_name    TEXT,
  file_type    TEXT,
  file_size_kb INTEGER,
  report_date  TEXT,
  notes        TEXT,
  uploaded_by  TEXT,
  deleted_at   TEXT DEFAULT NULL,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)   REFERENCES clinics(id),
  FOREIGN KEY (patient_id)  REFERENCES patients(id),
  FOREIGN KEY (file_id)     REFERENCES patient_files(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PATIENT NOTES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_notes (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  file_id    TEXT NOT NULL,
  note_type  TEXT DEFAULT 'visit_note',
  title      TEXT,
  content    TEXT NOT NULL,
  visit_date TEXT,
  is_private INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  deleted_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id             TEXT PRIMARY KEY,
  clinic_id      TEXT NOT NULL,
  patient_id     TEXT NOT NULL,
  doctor_id      TEXT NOT NULL,
  file_id        TEXT,
  scheduled_at   TEXT NOT NULL,
  duration_mins  INTEGER DEFAULT 30,
  type           TEXT DEFAULT 'general',
  status         TEXT DEFAULT 'scheduled',
  reason         TEXT,
  notes          TEXT,
  created_by     TEXT,
  deleted_at     TEXT DEFAULT NULL,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id)
);

-- ─────────────────────────────────────────
-- PRESCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id             TEXT PRIMARY KEY,
  clinic_id      TEXT NOT NULL,
  patient_id     TEXT NOT NULL,
  file_id        TEXT NOT NULL,
  appointment_id TEXT,
  doctor_id      TEXT NOT NULL,
  visit_date     TEXT NOT NULL,
  diagnosis      TEXT,
  notes          TEXT,
  status         TEXT DEFAULT 'finalized',
  deleted_at     TEXT DEFAULT NULL,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)      REFERENCES clinics(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id),
  FOREIGN KEY (file_id)        REFERENCES patient_files(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_id)      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescription_medications (
  id              TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL,
  drug_name       TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  duration        TEXT,
  instructions    TEXT,
  quantity        TEXT,
  sort_order      INTEGER DEFAULT 0,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- BILLING (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_billing (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL,
  patient_id      TEXT NOT NULL,
  file_id         TEXT NOT NULL,
  appointment_id  TEXT,
  invoice_number  TEXT,
  invoice_date    TEXT NOT NULL,
  due_date        TEXT,
  line_items      TEXT,
  subtotal        REAL DEFAULT 0,
  tax_percent     REAL DEFAULT 0,
  tax_amount      REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_amount    REAL NOT NULL,
  payment_status  TEXT DEFAULT 'draft',
  payment_method  TEXT,
  paid_amount     REAL DEFAULT 0,
  paid_at         TEXT,
  notes           TEXT,
  created_by      TEXT,
  deleted_at      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)      REFERENCES clinics(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id),
  FOREIGN KEY (file_id)        REFERENCES patient_files(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- ─────────────────────────────────────────
-- INVENTORY (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id                  TEXT PRIMARY KEY,
  clinic_id           TEXT NOT NULL,
  item_name           TEXT NOT NULL,
  category            TEXT DEFAULT 'other',
  quantity            INTEGER DEFAULT 0,
  unit                TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  notes               TEXT,
  deleted_at          TEXT DEFAULT NULL,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  type         TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  reason       TEXT,
  performed_by TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)    REFERENCES clinics(id),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- MEDICAL REPS (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_reps (
  id        TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company   TEXT,
  phone     TEXT,
  email     TEXT,
  notes     TEXT,
  deleted_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS mr_visits (
  id        TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  mr_id     TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  purpose   TEXT DEFAULT 'other',
  notes     TEXT,
  logged_by TEXT,
  deleted_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (mr_id)     REFERENCES medical_reps(id),
  FOREIGN KEY (logged_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mr_products (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL,
  mr_id        TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category     TEXT,
  notes        TEXT,
  deleted_at   TEXT DEFAULT NULL,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (mr_id)     REFERENCES medical_reps(id)
);

-- ─────────────────────────────────────────
-- EXTERNAL LABS & REFERRALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_labs (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT DEFAULT 'lab',
  contact_person  TEXT,
  phone           TEXT,
  whatsapp_number TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  pincode         TEXT,
  notes           TEXT,
  is_active       INTEGER DEFAULT 1,
  deleted_at      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS lab_referrals (
  id                    TEXT PRIMARY KEY,
  clinic_id             TEXT NOT NULL,
  patient_id            TEXT NOT NULL,
  file_id               TEXT NOT NULL,
  lab_id                TEXT NOT NULL,
  referred_by           TEXT NOT NULL,
  reference_number      TEXT NOT NULL,
  referral_date         TEXT DEFAULT (datetime('now')),
  urgency               TEXT DEFAULT 'routine',
  clinical_notes        TEXT,
  special_instructions  TEXT,
  status                TEXT DEFAULT 'pending',
  letter_path           TEXT,
  letter_generated_at   TEXT,
  email_sent_at         TEXT,
  email_sent_to         TEXT,
  whatsapp_sent_at      TEXT,
  whatsapp_sent_to      TEXT,
  deleted_at            TEXT DEFAULT NULL,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id),
  FOREIGN KEY (lab_id)     REFERENCES external_labs(id),
  FOREIGN KEY (referred_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referral_tests (
  id           TEXT PRIMARY KEY,
  referral_id  TEXT NOT NULL,
  test_name    TEXT NOT NULL,
  test_code    TEXT,
  instructions TEXT,
  sort_order   INTEGER DEFAULT 0,
  FOREIGN KEY (referral_id) REFERENCES lab_referrals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_communications (
  id            TEXT PRIMARY KEY,
  referral_id   TEXT NOT NULL,
  channel       TEXT NOT NULL,
  sent_to       TEXT,
  sent_by       TEXT,
  status        TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referral_id) REFERENCES lab_referrals(id),
  FOREIGN KEY (sent_by)     REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PLANS (managed by platform admin)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  monthly_price_cents INTEGER DEFAULT 0,
  annual_price_cents  INTEGER DEFAULT 0,
  annual_discount_percent INTEGER DEFAULT 0,
  tagline            TEXT,
  feature_bullets    TEXT,
  is_popular         INTEGER DEFAULT 0,
  show_on_landing    INTEGER DEFAULT 1,
  display_order      INTEGER DEFAULT 0,
  status             TEXT DEFAULT 'active',
  deleted_at         TEXT DEFAULT NULL,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_modules (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL,
  module_key TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, module_key)
);

CREATE TABLE IF NOT EXISTS plan_limits (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL,
  limit_key  TEXT NOT NULL,
  limit_value INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, limit_key)
);

-- ─────────────────────────────────────────
-- MOCK PAYMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_payments (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  plan            TEXT DEFAULT 'pro',
  amount_usd      REAL DEFAULT 5.00,
  status          TEXT DEFAULT 'success',
  mock_receipt    TEXT,
  activated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
