require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const db = require('./src/config/database');
const seedPlans = require('./src/database/seedPlans');

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  try {
    // Verify database connection
    await db.execute('SELECT 1', []);
    console.log('✅ MySQL connected');

    // Schema and initial seed is usually handled via scripts for MySQL,
    // but we can keep a light version of the seed check if required.
    // For this migration, we'll ensure plans are seeded if the table is empty.
    try {
      await seedPlans();
    } catch (e) {
      console.error('⚠️  Automatic plan seeding failed:', e.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 MediCRM API → http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
