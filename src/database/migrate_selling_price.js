require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    await db.execute(
      `ALTER TABLE inventory ADD COLUMN selling_price_cents INT DEFAULT 0`,
      []
    );
    console.log('✅ selling_price_cents column added to inventory');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column already exists, skipping');
    } else {
      console.error('❌ Migration failed:', e.message);
      process.exit(1);
    }
  }
  process.exit(0);
}

migrate();
