const fs = require('fs');
const path = require('path');

const serviceDirs = [
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'repositories'),
];

let totalChanges = 0;

for (const dir of serviceDirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const filename of files) {
        const file = path.join(dir, filename);
        let content = fs.readFileSync(file, 'utf8');
        const original = content;

        // 1. Replace destructuring: { page, limit, offset } = getPagination(...)
        content = content.replace(
            /const\s*\{\s*page\s*,\s*limit\s*,\s*offset\s*\}\s*=\s*getPagination/g,
            'const { page, limit, offset, sqlLimit, sqlOffset } = getPagination'
        );

        // 2. In SQL params arrays, replace String(limit) -> sqlLimit and String(offset) -> sqlOffset
        content = content.replace(/String\(limit\)/g, 'sqlLimit');
        content = content.replace(/String\(offset\)/g, 'sqlOffset');

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`✅ Fixed: ${filename}`);
            totalChanges++;
        }
    }
}

console.log(`\nDone. Fixed ${totalChanges} files.`);
