/**
 * Fix repositories that use local limit/offset params (not from getPagination)
 * but got incorrectly patched to use sqlLimit/sqlOffset (which are undefined there)
 */
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, 'src', 'repositories');
const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.js'));
let fixed = 0;

for (const filename of files) {
    const file = path.join(repoDir, filename);
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // These repositories use local { limit, offset } function destructuring params
    // not from getPagination. Replace sqlLimit/sqlOffset back to String(limit)/String(offset)
    // BUT only inside functions that have their own `limit`/`offset` params (not getPagination)

    // Strategy: if the file has `sqlLimit` but no `const { ... sqlLimit ... } = getPagination`,
    // then all sqlLimit/sqlOffset usages in params arrays must be converted back
    // We check each match's context

    // Simple approach: replace sqlLimit -> String(limit) and sqlOffset -> String(offset)
    // in repositories (they all use local params, getPagination is only in services)
    content = content
        .replace(/\bsqlLimit\b/g, 'String(limit)')
        .replace(/\bsqlOffset\b/g, 'String(offset)');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Fixed: ${filename}`);
        fixed++;
    }
}

console.log(`\nFixed ${fixed} repository files.`);
