const db = require('./src/config/database');

function slugify(text) {
    return text.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

async function run() {
    try {
        console.log('🔄 Adding slug support to Organizations...');

        // 1. Add column
        try {
            await db.execute('ALTER TABLE organizations ADD COLUMN slug VARCHAR(255) AFTER name', []);
            console.log('✅ Added slug column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ slug column already exists');
            else throw e;
        }

        await db.execute('ALTER TABLE organizations ADD UNIQUE(slug)', []);

        // 2. Populate slugs
        const [orgs] = await db.execute('SELECT id, name FROM organizations', []);
        for (const org of orgs) {
            let slug = slugify(org.name);
            // Check for collisions
            const [existing] = await db.execute('SELECT id FROM organizations WHERE slug = ? AND id != ?', [slug, org.id]);
            if (existing.length > 0) {
                slug = `${slug}-${org.id.slice(0, 4).toLowerCase()}`;
            }
            await db.execute('UPDATE organizations SET slug = ? WHERE id = ?', [slug, org.id]);
            console.log(`✅ Organization "${org.name}" -> ${slug}`);
        }

        console.log('🚀 Slug migration completed successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

run();
