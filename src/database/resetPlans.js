/**
 * Clears plans, plan_modules, plan_limits. Run before re-seeding if plans are corrupted.
 */
require('dotenv').config();
const db = require('../config/database');

db.run('DELETE FROM plan_limits');
db.run('DELETE FROM plan_modules');
db.run('DELETE FROM plans');
console.log('✅ Plans tables cleared. Restart the server to re-seed.');
