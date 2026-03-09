require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

try {
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = require('./src/config/database');
  db.get('SELECT 1');
  console.log('✅ SQLite connected');

  const schemaPath = path.join(__dirname, 'src/database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ Schema ensured');
  }

  // Migration: add annual_discount_percent if missing
  try {
    db.exec('ALTER TABLE plans ADD COLUMN annual_discount_percent INTEGER DEFAULT 0');
    console.log('  ✅ Plans migration: annual_discount_percent added');
  } catch (e) {
    if (!String(e.message || e).includes('duplicate column')) throw e;
  }

  const seedPlans = require('./src/database/seedPlans');
  seedPlans();

  app.listen(PORT, () => {
    console.log(`🚀 MediCRM API → http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('❌ Startup failed:', err.message);
  process.exit(1);
}
