SET FOREIGN_KEY_CHECKS = 0;

-- MediCRM MySQL Schema
-- All IDs are VARCHAR(36) (UUID). All tables use deleted_at for soft delete.

-- ─────────────────────────────────────────
-- TIER 1: PLATFORM ADMINS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  id            VARCHAR(36) PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active     INTEGER DEFAULT 1,
  deleted_at    DATETIME DEFAULT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- TIER 2: ORGANIZATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                VARCHAR(36) PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  owner_email       VARCHAR(255) NOT NULL UNIQUE,
  phone             VARCHAR(255),
  address           VARCHAR(255),
  plan              VARCHAR(255) DEFAULT 'free',
  plan_status       VARCHAR(255) DEFAULT 'active',
  plan_activated_at VARCHAR(255),
  mock_customer_id  VARCHAR(255),
  deleted_at        DATETIME DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- TIER 3: CLINICS / BRANCHES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id              VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(255),
  email           VARCHAR(255),
  address         VARCHAR(255),
  city            VARCHAR(255),
  is_active       INTEGER DEFAULT 1,
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ─────────────────────────────────────────
-- TIER 4: USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  is_active       INTEGER DEFAULT 1,
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Maps users to clinic branches with their role at each branch
CREATE TABLE IF NOT EXISTS clinic_members (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  clinic_id       VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  role            VARCHAR(255) NOT NULL,
  is_active       INTEGER DEFAULT 1,
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)         REFERENCES users(id),
  FOREIGN KEY (clinic_id)       REFERENCES clinics(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  UNIQUE(user_id, clinic_id)
);

-- ─────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                 VARCHAR(36) PRIMARY KEY,
  clinic_id          VARCHAR(36) NOT NULL,
  patient_code       VARCHAR(255),
  full_name          VARCHAR(255) NOT NULL,
  date_of_birth      VARCHAR(255),
  age                INTEGER,
  gender             VARCHAR(255),
  blood_group        VARCHAR(255),
  phone              VARCHAR(255),
  email              VARCHAR(255),
  address            VARCHAR(255),
  allergies          TEXT,
  chronic_conditions TEXT,
  created_by         VARCHAR(36),
  deleted_at         DATETIME DEFAULT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PATIENT FILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_files (
  id                 VARCHAR(36) PRIMARY KEY,
  clinic_id          VARCHAR(36) NOT NULL,
  patient_id         VARCHAR(36) NOT NULL UNIQUE,
  file_number        VARCHAR(255),
  assigned_doctor    VARCHAR(36),
  status             VARCHAR(255) DEFAULT 'active',
  last_visit_at      VARCHAR(255),
  next_followup_at   VARCHAR(255),
  deleted_at         DATETIME DEFAULT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ─────────────────────────────────────────
-- PATIENT REPORTS (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_reports (
  id           VARCHAR(36) PRIMARY KEY,
  clinic_id    VARCHAR(36) NOT NULL,
  patient_id   VARCHAR(36) NOT NULL,
  file_id      VARCHAR(36) NOT NULL,
  report_name  VARCHAR(255) NOT NULL,
  report_type  VARCHAR(255) DEFAULT 'other',
  file_path    VARCHAR(255),
  file_name    VARCHAR(255),
  file_type    VARCHAR(255),
  file_size_kb INTEGER,
  report_date  VARCHAR(255),
  notes        TEXT,
  uploaded_by  VARCHAR(36),
  deleted_at   DATETIME DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)   REFERENCES clinics(id),
  FOREIGN KEY (patient_id)  REFERENCES patients(id),
  FOREIGN KEY (file_id)     REFERENCES patient_files(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PATIENT NOTES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_notes (
  id         VARCHAR(36) PRIMARY KEY,
  clinic_id  VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  file_id    VARCHAR(36) NOT NULL,
  note_type  VARCHAR(255) DEFAULT 'visit_note',
  title      VARCHAR(255),
  content    TEXT NOT NULL,
  visit_date VARCHAR(255),
  is_private INTEGER DEFAULT 0,
  created_by VARCHAR(36) NOT NULL,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id             VARCHAR(36) PRIMARY KEY,
  clinic_id      VARCHAR(36) NOT NULL,
  patient_id     VARCHAR(36) NOT NULL,
  doctor_id      VARCHAR(36) NOT NULL,
  file_id        VARCHAR(36),
  scheduled_at   VARCHAR(255) NOT NULL,
  duration_mins  INTEGER DEFAULT 30,
  type           VARCHAR(255) DEFAULT 'general',
  status         VARCHAR(255) DEFAULT 'scheduled',
  reason         VARCHAR(255),
  notes          TEXT,
  created_by     VARCHAR(36),
  deleted_at     DATETIME DEFAULT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id)
);

-- ─────────────────────────────────────────
-- PRESCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id             VARCHAR(36) PRIMARY KEY,
  clinic_id      VARCHAR(36) NOT NULL,
  patient_id     VARCHAR(36) NOT NULL,
  file_id        VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36),
  doctor_id      VARCHAR(36) NOT NULL,
  visit_date     VARCHAR(255) NOT NULL,
  diagnosis      TEXT,
  notes          TEXT,
  status         VARCHAR(255) DEFAULT 'finalized',
  deleted_at     DATETIME DEFAULT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)      REFERENCES clinics(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id),
  FOREIGN KEY (file_id)        REFERENCES patient_files(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_id)      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescription_medications (
  id              VARCHAR(36) PRIMARY KEY,
  prescription_id VARCHAR(36) NOT NULL,
  drug_name       VARCHAR(255) NOT NULL,
  dosage          VARCHAR(255),
  frequency       VARCHAR(255),
  duration        VARCHAR(255),
  instructions    TEXT,
  quantity        VARCHAR(255),
  sort_order      INTEGER DEFAULT 0,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- BILLING (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_billing (
  id              VARCHAR(36) PRIMARY KEY,
  clinic_id       VARCHAR(36) NOT NULL,
  patient_id      VARCHAR(36) NOT NULL,
  file_id         VARCHAR(36) NOT NULL,
  appointment_id  VARCHAR(36),
  invoice_number  VARCHAR(255),
  invoice_date    VARCHAR(255) NOT NULL,
  due_date        VARCHAR(255),
  line_items      TEXT,
  subtotal        REAL DEFAULT 0,
  tax_percent     REAL DEFAULT 0,
  tax_amount      REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_amount    REAL NOT NULL,
  payment_status  VARCHAR(255) DEFAULT 'draft',
  payment_method  VARCHAR(255),
  paid_amount     REAL DEFAULT 0,
  paid_at         VARCHAR(255),
  notes           TEXT,
  created_by      VARCHAR(36),
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)      REFERENCES clinics(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id),
  FOREIGN KEY (file_id)        REFERENCES patient_files(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- ─────────────────────────────────────────
-- INVENTORY (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id                  VARCHAR(36) PRIMARY KEY,
  clinic_id           VARCHAR(36) NOT NULL,
  item_name           VARCHAR(255) NOT NULL,
  category            VARCHAR(255) DEFAULT 'other',
  quantity            INTEGER DEFAULT 0,
  unit                VARCHAR(255),
  low_stock_threshold INTEGER DEFAULT 10,
  notes               TEXT,
  deleted_at          DATETIME DEFAULT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id           VARCHAR(36) PRIMARY KEY,
  clinic_id    VARCHAR(36) NOT NULL,
  inventory_id VARCHAR(36) NOT NULL,
  type         VARCHAR(255) NOT NULL,
  quantity     INTEGER NOT NULL,
  reason       VARCHAR(255),
  performed_by VARCHAR(36),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)    REFERENCES clinics(id),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- MEDICAL REPS (Pro only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_reps (
  id        VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(36) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  company   VARCHAR(255),
  phone     VARCHAR(255),
  email     VARCHAR(255),
  territory VARCHAR(255),
  notes     TEXT,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS mr_visits (
  id        VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(36) NOT NULL,
  mr_id     VARCHAR(36) NOT NULL,
  visit_date VARCHAR(255) NOT NULL,
  purpose   VARCHAR(255) DEFAULT 'other',
  products_discussed TEXT,
  samples_left       TEXT,
  notes     TEXT,
  logged_by VARCHAR(36),
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (mr_id)     REFERENCES medical_reps(id),
  FOREIGN KEY (logged_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mr_products (
  id           VARCHAR(36) PRIMARY KEY,
  clinic_id    VARCHAR(36) NOT NULL,
  mr_id        VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category     VARCHAR(255),
  notes        TEXT,
  deleted_at   DATETIME DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (mr_id)     REFERENCES medical_reps(id)
);

-- ─────────────────────────────────────────
-- EXTERNAL LABS & REFERRALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_labs (
  id              VARCHAR(36) PRIMARY KEY,
  clinic_id       VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(255) DEFAULT 'lab',
  contact_person  VARCHAR(255),
  phone           VARCHAR(255),
  whatsapp_number VARCHAR(255),
  email           VARCHAR(255),
  address         VARCHAR(255),
  city            VARCHAR(255),
  pincode         VARCHAR(255),
  notes           TEXT,
  is_active       INTEGER DEFAULT 1,
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS lab_referrals (
  id                    VARCHAR(36) PRIMARY KEY,
  clinic_id             VARCHAR(36) NOT NULL,
  patient_id            VARCHAR(36) NOT NULL,
  file_id               VARCHAR(36) NOT NULL,
  lab_id                VARCHAR(36) NOT NULL,
  referred_by           VARCHAR(36) NOT NULL,
  reference_number      VARCHAR(255) NOT NULL,
  referral_date         DATETIME DEFAULT CURRENT_TIMESTAMP,
  urgency               VARCHAR(255) DEFAULT 'routine',
  clinical_notes        TEXT,
  special_instructions  TEXT,
  status                VARCHAR(255) DEFAULT 'pending',
  letter_path           VARCHAR(255),
  letter_generated_at   VARCHAR(255),
  email_sent_at         VARCHAR(255),
  email_sent_to         VARCHAR(255),
  whatsapp_sent_at      VARCHAR(255),
  whatsapp_sent_to      VARCHAR(255),
  deleted_at            DATETIME DEFAULT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id)  REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (file_id)    REFERENCES patient_files(id),
  FOREIGN KEY (lab_id)     REFERENCES external_labs(id),
  FOREIGN KEY (referred_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referral_tests (
  id           VARCHAR(36) PRIMARY KEY,
  referral_id  VARCHAR(36) NOT NULL,
  test_name    VARCHAR(255) NOT NULL,
  test_code    VARCHAR(255),
  instructions TEXT,
  sort_order   INTEGER DEFAULT 0,
  FOREIGN KEY (referral_id) REFERENCES lab_referrals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_communications (
  id            VARCHAR(36) PRIMARY KEY,
  referral_id   VARCHAR(36) NOT NULL,
  channel       VARCHAR(255) NOT NULL,
  sent_to       VARCHAR(255),
  sent_by       VARCHAR(36),
  status        VARCHAR(255) DEFAULT 'sent',
  error_message TEXT,
  sent_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referral_id) REFERENCES lab_referrals(id),
  FOREIGN KEY (sent_by)     REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- PLANS (managed by platform admin)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                VARCHAR(36) PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL UNIQUE,
  monthly_price_cents INTEGER DEFAULT 0,
  annual_price_cents  INTEGER DEFAULT 0,
  annual_discount_percent INTEGER DEFAULT 0,
  tagline            VARCHAR(255),
  feature_bullets    TEXT,
  is_popular         INTEGER DEFAULT 0,
  show_on_landing    INTEGER DEFAULT 1,
  display_order      INTEGER DEFAULT 0,
  status             VARCHAR(255) DEFAULT 'active',
  deleted_at         DATETIME DEFAULT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_modules (
  id         VARCHAR(36) PRIMARY KEY,
  plan_id    VARCHAR(36) NOT NULL,
  module_key VARCHAR(255) NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, module_key)
);

CREATE TABLE IF NOT EXISTS plan_limits (
  id         VARCHAR(36) PRIMARY KEY,
  plan_id    VARCHAR(36) NOT NULL,
  limit_key  VARCHAR(255) NOT NULL,
  limit_value INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, limit_key)
);

-- ─────────────────────────────────────────
-- MOCK PAYMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_payments (
  id              VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  plan            VARCHAR(255) DEFAULT 'pro',
  amount_usd      REAL DEFAULT 5.00,
  status          VARCHAR(255) DEFAULT 'success',
  mock_receipt    VARCHAR(255),
  activated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

SET FOREIGN_KEY_CHECKS = 1;
