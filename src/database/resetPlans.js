/**
 * Clears plans, plan_modules, plan_limits. Run before re-seeding if plans are corrupted.
 */
require('dotenv').config();
const db = require('../config/database');

async function resetPlans() {
    try {
        await db.execute('DELETE FROM plan_limits', []);
        await db.execute('DELETE FROM plan_modules', []);
        await db.execute('DELETE FROM plans', []);
        console.log('✅ Plans tables cleared. Restart the server to re-seed.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
        process.exit(1);
    }
}

resetPlans();
